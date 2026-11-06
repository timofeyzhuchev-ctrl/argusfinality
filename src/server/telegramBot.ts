import { getProviderInfo, processArgusImage } from './geminiService';
import { analyzeVideoSmoking } from './videoSmokingService';
import { createTelegramRegistration } from './telegramRegistration';
import { submitSharedRecord } from './sharedDatabase';
import { beginProgress, card, keyboard, normalizeButton, registrationCard, welcome } from './telegramPresentation';

// Long polling runs in the existing service. No Telegram library or inbound webhook is needed.
export function startTelegramBot(token: string): void {
  if (!token.trim()) return;
  const api = `https://api.telegram.org/bot${token}`;
  const maxBytes = 19 * 1024 * 1024; // Telegram Bot API getFile limit is 20 MB.
  let offset = 0;
  const lastRequest = new Map<number, number>();

  async function call(method: string, body: Record<string, unknown>) {
    const response = await fetch(`${api}/${method}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(40_000),
    });
    const data: any = await response.json();
    if (!response.ok || !data.ok) throw new Error('Telegram API unavailable');
    return data.result;
  }

  async function send(chatId: number, text: string) {
    await sendCard(chatId, card('◈ АРГУС', text));
  }

  async function sendCard(chatId: number, html: string) {
    await call('sendMessage', { chat_id: chatId, text: html, parse_mode: 'HTML', reply_markup: keyboard(), link_preview_options: { is_disabled: true } });
  }

  async function download(file: { file_id: string; file_size?: number }, limit = maxBytes): Promise<Buffer> {
    if (file.file_size && file.file_size > limit) throw new Error('Файл слишком большой.');
    const info = await call('getFile', { file_id: file.file_id });
    if (!info.file_path || (info.file_size && info.file_size > limit)) throw new Error('Файл слишком большой или недоступен.');
    const response = await fetch(`https://api.telegram.org/file/bot${token}/${info.file_path}`, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error('Не удалось загрузить файл из Telegram.');
    const declaredSize = Number(response.headers.get('content-length'));
    if (declaredSize > limit) throw new Error('Файл слишком большой.');
    if (!response.body) throw new Error('Файл недоступен.');
    const chunks: Buffer[] = [];
    let size = 0;
    const reader = response.body.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error('Файл слишком большой.');
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }

  const registration = createTelegramRegistration({
    send: async (chatId, text, step) => {
      await call('sendMessage', { chat_id: chatId, text: registrationCard(text, step), parse_mode: 'HTML',
        reply_markup: keyboard(step), link_preview_options: { is_disabled: true } });
    },
    download, save: submitSharedRecord,
    configured: () => Boolean(process.env.DATABASE_URL?.trim()) && Buffer.byteLength(process.env.ADMIN_API_TOKEN || '') >= 32,
  });

  async function handle(message: any) {
    // Keep results in private chats; never disclose user content to groups.
    if (message?.chat?.type !== 'private' || !Number.isSafeInteger(message.chat.id)) return;
    const chatId: number = message.chat.id;
    message = { ...message, text: normalizeButton(message.text) };
    if (await registration(chatId, message)) return;
    if (typeof message.text === 'string') {
      const command = message.text.trim().split(/\s/)[0].split('@')[0].toLowerCase();
      if (command === '/photo') await sendCard(chatId, card('📷 Анализ фотографии', 'Прикрепите фото через скрепку или сделайте снимок камерой Telegram.\n\nРазмер — до 19 МБ.', 'Результат предварительный и требует проверки человеком.'));
      else if (command === '/video') await sendCard(chatId, card('🎬 Анализ видео', 'Прикрепите видео через скрепку.\n\nДо 19 МБ · MP4, WebM или MOV\nВ ответе появятся найденные эпизоды и их время.', 'Обработка видео может занять несколько минут.'));
      else if (command === '/help') await sendCard(chatId, card('ℹ️ Как пользоваться', 'Фото и видео можно отправлять сразу.\n\n/add — новая запись в общую базу\n/skip — пропустить необязательное поле\n/save — подтвердить запись\n/cancel — отменить добавление\n\nЧерновик действует 15 минут. Запись проверяет администратор.\nПоиск совпадений лиц пока недоступен.', 'Результаты нейросети могут быть ошибочными.'));
      else await sendCard(chatId, welcome);
      return;
    }
    const photo = message.photo?.at(-1);
    const video = message.video;
    if (!photo && !video) {
      await send(chatId, 'Отправьте фото или видео размером до 19 МБ.');
      return;
    }
    if (photo && getProviderInfo().provider === 'none') {
      await send(chatId, 'Анализ временно недоступен: сервис нейросети не настроен.');
      return;
    }
    const now = Date.now();
    for (const [id, time] of lastRequest) if (now - time > 60_000) lastRequest.delete(id);
    if (now - (lastRequest.get(chatId) || 0) < 30_000) {
      await send(chatId, 'Подождите 30 секунд перед следующим анализом.');
      return;
    }
    lastRequest.set(chatId, now);
    const progress = await beginProgress(call, chatId, Boolean(video));
    try {
      const bytes = await download(photo || video);
      progress.stage('Выполняю анализ');
      if (photo) {
        const result = await processArgusImage(bytes.toString('base64'), 'image/jpeg', 'standard', undefined, { requireRealAnalysis: true });
        const status = result.personDetected === false ? 'Человек не обнаружен' : result.isSmokingOrVaping ? 'Возможно курение или парение' : 'Курение не обнаружено';
        await progress.finish(card('📷 Анализ завершён', `${status}.`, 'Предварительный результат · требуется проверка человеком.'));
      } else {
        const mime = video.mime_type || 'video/mp4';
        if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(mime)) throw new Error('Формат видео не поддерживается.');
        const result = await analyzeVideoSmoking(bytes, mime, 'telegram-video');
        const status = result.smokingDetected ? 'Возможно курение или парение' : 'Курение не обнаружено';
        const events = result.events.slice(0, 15).map(event => `• ${String(event.start).slice(0, 16)}–${String(event.end).slice(0, 16)} · ${String(event.typeLabelRu).slice(0, 80)}`).join('\n');
        await progress.finish(card('🎬 Анализ завершён', `${status}.${events ? `\n\nЭПИЗОДЫ\n${events}` : ''}`, 'Предварительный результат · требуется проверка человеком.'));
      }
    } catch (error) {
      // Do not log Telegram URLs, tokens, files or provider responses.
      const message = error instanceof Error && /слишком большой|Формат видео/.test(error.message) ? error.message : 'Не удалось обработать файл. Попробуйте позже.';
      await progress.finish(card('⚠️ Не удалось завершить анализ', message, 'Можно повторить отправку файла.'));
    }
  }

  async function poll() {
    for (;;) {
      try {
        const updates: any[] = await call('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] });
        for (const update of updates) {
          offset = Math.max(offset, update.update_id + 1);
          try { await handle(update.message); } catch { console.error('[Telegram] Failed to process an update'); }
        }
      } catch {
        console.error('[Telegram] Polling failed; retrying');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  void call('setMyCommands', { commands: [
    { command: 'start', description: 'Главное меню Аргуса' },
    { command: 'photo', description: 'Анализ фотографии' },
    { command: 'video', description: 'Анализ видео' },
    { command: 'add', description: 'Добавить запись в общую базу' },
    { command: 'help', description: 'Помощь и ограничения' },
    { command: 'cancel', description: 'Отменить добавление' },
  ] }).catch(() => console.error('[Telegram] Command menu setup failed'));
  void poll();
}
