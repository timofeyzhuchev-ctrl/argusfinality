import { randomUUID } from 'node:crypto';

type RecordInput = { fullName: string; birthDate: string; schoolOrOrg: string; vkUrl: string; photoUrl: string };
type Draft = { id: string; step: 'name' | 'birth' | 'org' | 'vk' | 'photo' | 'confirm'; touched: number; record: RecordInput };
type Message = { text?: string; photo?: Array<{ file_id: string; file_size?: number }> };
type Dependencies = {
  send: (chatId: number, text: string, step?: Draft['step']) => Promise<void>;
  download: (file: { file_id: string; file_size?: number }, maxBytes: number) => Promise<Buffer>;
  save: (record: RecordInput, id: string) => Promise<void>;
  configured: () => boolean;
  now?: () => number;
};

// Drafts are private to each chat, expire after 15 minutes and are never logged.
export function createTelegramRegistration(deps: Dependencies) {
  const drafts = new Map<number, Draft>();
  const now = deps.now || Date.now;
  let windowStart = 0, saves = 0;
  const maxPhotoBytes = 2 * 1024 * 1024;
  return async (chatId: number, message: Message): Promise<boolean> => {
    const time = now();
    const expired = drafts.has(chatId) && time - drafts.get(chatId)!.touched > 900_000;
    for (const [id, draft] of drafts) if (time - draft.touched > 900_000) drafts.delete(id);
    const text = message.text?.trim() || '';
    const command = text.split(/\s/)[0].split('@')[0].toLowerCase();
    const send = (value: string) => deps.send(chatId, value, drafts.get(chatId)?.step);
    if (command === '/cancel') {
      drafts.delete(chatId);
      await send('Добавление отменено. Можно отправить фото или видео для анализа.');
      return true;
    }
    if (command === '/add') {
      if (!deps.configured()) { await send('Общая база пока не настроена. Попробуйте позже.'); return true; }
      if (!drafts.has(chatId) && drafts.size >= 30) { await send('Сейчас много заявок. Попробуйте позже.'); return true; }
      drafts.set(chatId, { id: randomUUID(), step: 'name', touched: time,
        record: { fullName: '', birthDate: '', schoolOrOrg: '', vkUrl: '', photoUrl: '' } });
      await send('Добавление в общую базу. Запись увидит администратор. Отправляйте сведения, которые вправе передавать.\nВведите ФИО (до 160 символов). Для отмены: /cancel');
      return true;
    }
    const draft = drafts.get(chatId);
    if (!draft) {
      if (expired || command === '/save' || command === '/skip') {
        await send('Нет активного добавления или время истекло. Начать: /add'); return true;
      }
      return false;
    }
    draft.touched = time;
    if (draft.step === 'confirm') {
      if (command !== '/save') { await send('Для сохранения: /save. Начать заново: /add. Отменить: /cancel'); return true; }
      if (time - windowStart >= 600_000) { windowStart = time; saves = 0; }
      if (saves >= 20) { await send('Лимит добавлений достигнут. Повторите /save через 10 минут.'); return true; }
      saves++;
      try {
        // Reuse the ID on retries: a lost acknowledgement must not duplicate a record.
        await deps.save(draft.record, draft.id);
      } catch {
        await send('Запись пока не подтверждена базой. Повторите /save или отмените /cancel.'); return true;
      }
      drafts.delete(chatId);
      await send('Запись сохранена в общей базе и ожидает проверки администратором. Для анализа отправьте фото или видео.');
      return true;
    }
    if (draft.step === 'photo') {
      const photo = message.photo?.at(-1);
      if (!photo) { await send('Отправьте фотографию как фото (не документ), до 2 МБ. Для отмены: /cancel'); return true; }
      try {
        const bytes = await deps.download(photo, maxPhotoBytes);
        if (!bytes.length || bytes.length > maxPhotoBytes || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error('Invalid photo');
        draft.record.photoUrl = `data:image/jpeg;base64,${bytes.toString('base64')}`;
      } catch { await send('Не удалось принять фото. Отправьте JPEG как фото размером до 2 МБ.'); return true; }
      draft.step = 'confirm';
      const r = draft.record;
      await send(`Проверьте запись:\nФИО: ${r.fullName}\nДата рождения: ${r.birthDate}\nОрганизация: ${r.schoolOrOrg || 'не указана'}\nПрофиль: ${r.vkUrl || 'не указан'}\nФото получено.\n\nСохранить: /save. Начать заново: /add. Отменить: /cancel`);
      return true;
    }
    if (!text || (text.startsWith('/') && command !== '/skip')) {
      await send('Ответьте текстом на текущий вопрос. Начать заново: /add. Отменить: /cancel'); return true;
    }
    switch (draft.step) {
      case 'name':
        if (text.length > 160 || text.startsWith('/')) { await send('Введите ФИО до 160 символов.'); break; }
        draft.record.fullName = text; draft.step = 'birth';
        await send('Введите дату рождения: ДД.ММ.ГГГГ или ГГГГ-ММ-ДД.'); break;
      case 'birth': {
        const date = text.replace(/^(\d{2})\.(\d{2})\.(\d{4})$/, '$3-$2-$1');
        const timestamp = Date.parse(`${date}T00:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp) ||
            new Date(timestamp).toISOString().slice(0, 10) !== date || timestamp > time) {
          await send('Введите существующую дату рождения, не позже сегодняшнего дня.'); break;
        }
        draft.record.birthDate = date; draft.step = 'org';
        await send('Введите школу/организацию (до 200 символов) или /skip.'); break;
      }
      case 'org':
        if (text.length > 200) { await send('Не больше 200 символов или /skip.'); break; }
        draft.record.schoolOrOrg = command === '/skip' ? '' : text; draft.step = 'vk';
        await send('Введите ссылку на профиль VK (https://vk.com/...) или /skip.'); break;
      case 'vk': {
        if (command !== '/skip') {
          try {
            const url = new URL(text);
            if (text.length > 500 || url.protocol !== 'https:' || !['vk.com', 'www.vk.com'].includes(url.hostname) || url.username || url.password) throw new Error('Invalid URL');
          } catch { await send('Нужна ссылка https://vk.com/... или /skip.'); break; }
        }
        draft.record.vkUrl = command === '/skip' ? '' : text; draft.step = 'photo';
        await send('Отправьте фотографию как фото, до 2 МБ. Она будет добавлена в запись, а не отправлена на анализ.'); break;
      }
    }
    return true;
  };
}
