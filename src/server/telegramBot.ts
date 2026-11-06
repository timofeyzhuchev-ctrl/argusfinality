import { getProviderInfo, processArgusImage } from './geminiService';
import { analyzeVideoSmoking } from './videoSmokingService';
import { createTelegramRegistration } from './telegramRegistration';
import { submitSharedRecord } from './sharedDatabase';
import { beginProgress, card, keyboard, normalizeButton, registrationCard, welcome, photoReport, videoReport } from './telegramPresentation';
import { randomBytes } from 'node:crypto';
import { createChatDispatcher, createAnalysisSlots } from './telegramDispatch';
import { createAnimationSender, startProcessingAnimation } from './telegramAnimation';
import { notifyTelegramAdmin, parseTelegramAdminChatId } from './telegramAdminNotifications';

// Long polling runs in the existing service. No Telegram library or inbound webhook is needed.
export function startTelegramBot(token: string): void {
  if (!token.trim()) return;
  const api = `https://api.telegram.org/bot${token}`;
  const maxBytes = 19 * 1024 * 1024; // Telegram Bot API getFile limit is 20 MB.
  let offset = 0;
  const lastRequest = new Map<number, number>();
  const slots = createAnalysisSlots(2);
  const dispatch = createChatDispatcher(() => console.error('[Telegram] Failed to process an update'));
  const photos = new Map<string, { chatId: number; expires: number; file: { file_id: string; file_size?: number } }>();

  async function call(method: string, body: Record<string, unknown>, options?: { timeoutMs?: number }) {
    const response = await fetch(`${api}/${method}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(options?.timeoutMs || 40_000),
    });
    const data: any = await response.json();
    if (!response.ok || !data.ok) {
      const error = new Error('Telegram API unavailable') as Error & { retryAfter?: number };
      if (data.parameters?.retry_after) error.retryAfter = Number(data.parameters.retry_after);
      throw error;
    }
    return data.result;
  }

  async function send(chatId: number, text: string) {
    await sendCard(chatId, card('◈ АРГУС', text));
  }

  const sendAnimation = createAnimationSender(token, call);

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
    // Telegram only forwards a completed /save application to the configured private admin chat.
    // Normal photo/video analysis is not forwarded to admins.
    notifyAdmin: async (record, id, senderChatId) => {
      const adminChatId = parseTelegramAdminChatId(process.env.TELEGRAM_ADMIN_CHAT_ID);
      if (adminChatId === null) return; // Optional until the owner configures it in Render.
      await notifyTelegramAdmin(token, adminChatId, record, id, senderChatId);
    },
    configured: () => Boolean(process.env.DATABASE_URL?.trim()) && Buffer.byteLength(process.env.ADMIN_API_TOKEN || '') >= 32,
  });

  async function handleCallback(query: any) {
    const chat = query.message?.chat;
    if (chat?.type !== 'private' || query.from?.id !== chat.id || typeof query.data !== 'string') return;
    try { await call('answerCallbackQuery', { callback_query_id: query.id }, { timeoutMs: 4000 }); } catch { /* best effort */ }
    if (!query.data.startsWith('add:')) return;
    const key = query.data.slice(4);
    const entry = photos.get(key);
    if (!entry || entry.chatId !== chat.id || entry.expires < Date.now()) {
      if (entry?.expires && entry.expires < Date.now()) photos.delete(key);
      await send(chat.id, 'Фото для этой кнопки уже недоступно. Нажмите «Добавить запись» и прикрепите фото заново.');
      return;
    }
    photos.delete(key);
    await registration(chat.id, { text: '/add', registrationPhoto: entry.file });
  }

  async function analyze(message: any, chatId: number) {
    const photo = message.photo?.at(-1);
    const video = message.video;
    const progress = await beginProgress(call, chatId, Boolean(video));
    const animation = startProcessingAnimation(
      () => sendAnimation(chatId),
      id => call('deleteMessage', { chat_id: chatId, message_id: id }, { timeoutMs: 5000 }),
    );
    try {
      const bytes = await download(photo || video);
      progress.stage('Изучаю кадры и видимые признаки');
      if (photo) {
        const result = await processArgusImage(bytes.toString('base64'), 'image/jpeg', 'standard', undefined, { requireRealAnalysis: true });
        let actions: Record<string, unknown> | undefined;
        if (result.personDetected === true) {
          const time = Date.now();
          for (const [key, entry] of photos) if (entry.expires < time) photos.delete(key);
          if (photos.size >= 200) photos.delete(photos.keys().next().value!);
          const key = randomBytes(12).toString('hex');
          // Telegram includes smaller versions of each photo; use one suitable for registration.
          const seed = [...message.photo].reverse().find((p: any) => p.file_size && p.file_size <= 2 * 1024 * 1024) || photo;
          photos.set(key, { chatId, file: { file_id: seed.file_id, file_size: seed.file_size }, expires: time + 900_000 });
          actions = { inline_keyboard: [[{ text: '➕ Добавить человека с этого фото', callback_data: `add:${key}` }]] };
        }
        await progress.finish(photoReport(result), actions);
      } else {
        const mime = video.mime_type || 'video/mp4';
        if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(mime)) throw new Error('Формат видео не поддерживается.');
        const result = await analyzeVideoSmoking(bytes, mime, 'telegram-video');
        await progress.finish(videoReport(result));
      }
    } catch (error) {
      const message = error instanceof Error && /слишком большой|Формат видео/.test(error.message) ? error.message : 'Не удалось обработать файл. Попробуйте позже.';
      await progress.finish(card('⚠️ Анализ не завершён', message, 'Файл можно отправить повторно.'));
    } finally {
      void animation.dispose();
    }
  }

  async function handle(message: any) {
    // Keep results in private chats; never disclose user content to groups.
    if (message?.chat?.type !== 'private' || !Number.isSafeInteger(message.chat.id)) return;
    const chatId: number = message.chat.id;
    message = { ...message, text: normalizeButton(message.text) };
    // The owner can discover their private chat ID without any third-party ID bot.
    if (typeof message.text === 'string' && message.text.trim().split(/\s/)[0].split('@')[0].toLowerCase() === '/myid') {
      await send(chatId, `ID этого личного чата: ${chatId}. Укажите его в Render в переменной TELEGRAM_ADMIN_CHAT_ID.`);
      return;
    }
    if (await registration(chatId, message)) return;
    if (typeof message.text === 'string') {
      const command = message.text.trim().split(/\s/)[0].split('@')[0].toLowerCase();
      if (command === '/photo') await sendCard(chatId, card('📷 Анализ фотографии', 'Прикрепите фото через скрепку или сделайте снимок камерой Telegram.\n\nВ отчёте: примерный возраст, признаки курения и алкоголя, наблюдения и вывод.\nРазмер — до 19 МБ.', 'Возраст оценивается по внешности и может быть неточным.'));
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
    if (now - (lastRequest.get(chatId) || 0) < 5000) {
      await send(chatId, 'Подождите несколько секунд перед следующим анализом.');
      return;
    }
    const slot = slots.acquire(chatId);
    if (slot !== 'ok') {
      await send(chatId, slot === 'chat_busy' ? 'Ваш файл уже обрабатывается. Результат появится в сообщении анализа.' : 'Оба места обработки сейчас заняты. Повторите отправку чуть позже. Меню и добавление записей доступны.');
      return;
    }
    lastRequest.set(chatId, now);
    void analyze(message, chatId).catch(() => console.error('[Telegram] Analysis delivery failed')).finally(() => slots.release(chatId));
  }

  async function poll() {
    for (;;) {
      try {
        const updates: any[] = await call('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] });
        for (const update of updates) {
          offset = Math.max(offset, update.update_id + 1);
          const query = update.callback_query;
          const chat = query?.message?.chat || update.message?.chat;
          if (chat?.type !== 'private' || !Number.isSafeInteger(chat.id)) continue;
          const accepted = dispatch(chat.id, () => query ? handleCallback(query) : handle(update.message));
          if (!accepted && query?.id) void call('answerCallbackQuery', { callback_query_id: query.id, text: 'Слишком много действий. Попробуйте ещё раз.' }, { timeoutMs: 4000 }).catch(() => {});
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
    { command: 'myid', description: 'Узнать ID своего чата для уведомлений' },
    { command: 'help', description: 'Помощь и ограничения' },
    { command: 'cancel', description: 'Отменить добавление' },
  ] }).catch(() => console.error('[Telegram] Command menu setup failed'));
  void poll();
}
