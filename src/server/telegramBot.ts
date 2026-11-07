import { getProviderInfo, processArgusImage } from './geminiService';
import { analyzeVideoSmoking } from './videoSmokingService';
import { createTelegramRegistration } from './telegramRegistration';
import { reviewPendingRecord, submitSharedRecord } from './sharedDatabase';
import { beginProgress, card, faceComparisonReport, keyboard, normalizeButton, registrationCard, welcome, photoReport, videoReport } from './telegramPresentation';
import { randomBytes } from 'node:crypto';
import { createChatDispatcher, createAnalysisSlots } from './telegramDispatch';
import { createAnimationSender, startProcessingAnimation } from './telegramAnimation';
import type { TelegramWebhookConfig } from './telegramWebhook';
import { findArgusFaceMatch } from './argusFaceMatch';
import { hasArgusFaceRecord, type ArgusFaceMatch } from '../types/argusFaceMatch';

export function createTelegramBot(token: string, options: {
  adminChatId?: string; siteUrl?: string; reviewRecord?: typeof reviewPendingRecord; compareFace?: typeof findArgusFaceMatch;
} = {}) {
  const api = `https://api.telegram.org/bot${token}`;
  const configuredAdminId = options.adminChatId?.trim() || '';
  const adminChatId = Number(configuredAdminId);
  const canNotifyAdmin = /^[1-9][0-9]*$/.test(configuredAdminId) && Number.isSafeInteger(adminChatId);
  const siteUrl = options.siteUrl ? URL.parse(options.siteUrl) : null;
  const adminPanelUrl = siteUrl?.protocol === 'https:' && !siteUrl.username && !siteUrl.password
    ? new URL('/#admin', siteUrl).href : undefined;
  if (configuredAdminId && !canNotifyAdmin) console.error('[Telegram] TELEGRAM_ADMIN_CHAT_ID must be a positive numeric chat ID');
  const maxBytes = 19 * 1024 * 1024; // Telegram Bot API getFile limit is 20 MB.
  let offset = 0;
  const waitingForMatchPhotoUntil = new Map<number, number>();
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

  function panelButtons() {
    return adminPanelUrl ? [[{ text: 'Открыть управление базой ↗', url: adminPanelUrl, style: 'primary' }]] : [];
  }

  function faceReviewActions(chatId: number, match: ArgusFaceMatch): Record<string, unknown> | undefined {
    if (!canNotifyAdmin || chatId !== adminChatId || !adminPanelUrl || match.status !== 'ambiguous') return undefined;
    const candidate = match.candidates[0];
    if (!candidate) return undefined;
    const url = new URL(adminPanelUrl);
    url.searchParams.set('record', candidate.id);
    return { inline_keyboard: [[{ text: `Открыть #${candidate.id.slice(0, 8)} ↗`, url: url.href }]] };
  }

  function notifyAdminNewRecord(source: 'site' | 'telegram', id: string) {
    if (!canNotifyAdmin) return;
    const body: Record<string, unknown> = {
      chat_id: adminChatId,
      parse_mode: 'HTML',
      text: `<b>◈ АРГУС</b>  ·  МОДЕРАЦИЯ\n\n<b>Новая заявка</b>  <code>#${id.slice(0, 8)}</code>\n` +
        `Источник: ${source === 'site' ? 'сайт' : 'Telegram'}\n🟡 Ожидает проверки\n\n` +
        '<i>Откройте запись в панели, затем выберите решение.</i>',
      reply_markup: { inline_keyboard: [...panelButtons(), [
        { text: '✓ Одобрить', style: 'success', callback_data: `review:approve:${id}` },
        { text: '✕ Отказать', style: 'danger', callback_data: `review:reject:${id}` },
      ]] },
    };
    void call('sendMessage', body, { timeoutMs: 10_000 }).catch(() => console.error('[Telegram] Admin notification failed'));
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
    download,
    save: async (record, id) => {
      const insertedId = await submitSharedRecord(record, id);
      if (insertedId) notifyAdminNewRecord('telegram', insertedId);
    },
    configured: () => Boolean(process.env.DATABASE_URL?.trim()) && Buffer.byteLength(process.env.ADMIN_API_TOKEN || '') >= 32,
  });

  async function handleCallback(query: any) {
    const chat = query.message?.chat;
    if (chat?.type !== 'private' || query.from?.id !== chat.id || typeof query.data !== 'string') return;
    const review = /^review:(approve|reject):([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i.exec(query.data);
    if (review && (!canNotifyAdmin || chat.id !== adminChatId)) {
      await call('answerCallbackQuery', { callback_query_id: query.id, text: 'Действие доступно администратору.' }, { timeoutMs: 4000 });
      return;
    }
    try { await call('answerCallbackQuery', { callback_query_id: query.id }, { timeoutMs: 4000 }); } catch { /* best effort */ }
    if (review) {
      const decision = review[1].toLowerCase() === 'approve' ? 'approve' : 'reject';
      const id = review[2];
      let changed: boolean;
      try {
        changed = await (options.reviewRecord || reviewPendingRecord)(id, decision);
      } catch {
        await send(chat.id, 'База временно недоступна. Попробуйте ещё раз.');
        return;
      }
      const status = changed ? (decision === 'approve' ? 'одобрена' : 'отклонена') : 'уже обработана или удалена';
      const result = `Заявка #${id.slice(0, 8)} ${status}.`;
      try {
        await call('editMessageText', { chat_id: chat.id, message_id: query.message.message_id,
          text: card('◈ АРГУС · ПРОВЕРКА', `${changed ? (decision === 'approve' ? '✅ ' : '⛔ ') : ''}${result}`),
          parse_mode: 'HTML', reply_markup: { inline_keyboard: panelButtons() } });
      } catch { await send(chat.id, result); }
      return;
    }
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

  async function analyze(message: any, chatId: number, matchOnly: boolean) {
    const photo = message.photo?.at(-1);
    const video = message.video;
    const progress = await beginProgress(call, chatId, Boolean(video));
    const animation = startProcessingAnimation(
      () => sendAnimation(chatId),
      id => call('deleteMessage', { chat_id: chatId, message_id: id }, { timeoutMs: 5000 }),
    );
    try {
      const bytes = await download(photo || video);
      if (photo) {
        const isAdmin = canNotifyAdmin && chatId === adminChatId;
        const comparison = (options.compareFace || findArgusFaceMatch)(bytes, { reportUnapprovedPhoto: isAdmin })
          .catch((): ArgusFaceMatch => ({ status: 'unavailable' }));
        progress.stage('Сверяю снимок с базой «Аргус»');
        // The dedicated lookup stays local and is independent of visual analysis and its face flag.
        const visualAnalysis = !matchOnly && getProviderInfo().provider !== 'none'
          ? processArgusImage(bytes.toString('base64'), 'image/jpeg', 'standard', undefined, { requireRealAnalysis: true }).catch(() => undefined)
          : Promise.resolve(undefined);
        const [match, result] = await Promise.all([comparison, visualAnalysis]);
        let actions = faceReviewActions(chatId, match);
        if (!result) {
          await progress.finish(faceComparisonReport(match, !matchOnly, isAdmin), actions);
          return;
        }
        if (result.personDetected === true && !hasArgusFaceRecord(match) && match.status !== 'pending_photo' && match.status !== 'ambiguous') {
          const time = Date.now();
          for (const [key, entry] of photos) if (entry.expires < time) photos.delete(key);
          if (photos.size >= 200) photos.delete(photos.keys().next().value!);
          const key = randomBytes(12).toString('hex');
          // Telegram includes smaller versions of each photo; use one suitable for registration.
          const seed = [...message.photo].reverse().find((p: any) => p.file_size && p.file_size <= 2 * 1024 * 1024) || photo;
          photos.set(key, { chatId, file: { file_id: seed.file_id, file_size: seed.file_size }, expires: time + 900_000 });
          actions = { inline_keyboard: [[{ text: '➕ Добавить человека с этого фото', style: 'primary', callback_data: `add:${key}` }]] };
        }
        await progress.finish(photoReport(result, match, isAdmin), actions);
      } else {
        progress.stage('Изучаю кадры и видимые признаки');
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
    const command = typeof message.text === 'string' ? message.text.trim().split(/\s/)[0].split('@')[0].toLowerCase() : '';
    if (command === '/cancel' && (waitingForMatchPhotoUntil.get(chatId) ?? 0) > Date.now()) {
      waitingForMatchPhotoUntil.delete(chatId);
      await send(chatId, 'Режим отдельной сверки отменён.');
      return;
    }
    if (['/start', '/cancel', '/photo', '/video', '/add'].includes(command)) waitingForMatchPhotoUntil.delete(chatId);
    if (command === '/myid') {
      await call('sendMessage', { chat_id: chatId, text: `Ваш ID для уведомлений: ${chatId}` });
      return;
    }
    if (await registration(chatId, message)) return;
    if (typeof message.text === 'string') {
      if (command === '/match') {
        const now = Date.now();
        for (const [id, expires] of waitingForMatchPhotoUntil) {
          if (expires <= now) waitingForMatchPhotoUntil.delete(id);
        }
        waitingForMatchPhotoUntil.set(chatId, now + 600_000);
        await send(chatId, 'Отправьте фото для сверки с базой «Аргус». Режим действует 10 минут. Для отмены отправьте /cancel.');
      }
      else if (command === '/photo') await sendCard(chatId, card('📷 Анализ фотографии', 'Прикрепите фото через скрепку или сделайте снимок камерой Telegram.\n\nВ отчёте: примерный возраст, признаки курения и алкоголя, наблюдения и вывод.\nРазмер — до 19 МБ.', 'Возраст оценивается по внешности и может быть неточным.'));
      else if (command === '/video') await sendCard(chatId, card('🎬 Анализ видео', 'Прикрепите видео через скрепку.\n\nДо 19 МБ · MP4, WebM или MOV\nВ ответе появятся найденные эпизоды и их время.', 'Обработка видео может занять несколько минут.'));
      else if (command === '/help') await sendCard(chatId, card('ℹ️ Как пользоваться', 'Фото и видео можно отправлять сразу. Фото сверяется с одобренными записями.\n\n/match — только сверка фото с базой\n/add — новая запись в общую базу\n/skip — пропустить необязательное поле\n/save — подтвердить запись\n/cancel — отменить действие\n\nЧерновик записи действует 15 минут.', 'Результаты нейросети могут быть ошибочными.'));
      else await sendCard(chatId, welcome);
      return;
    }
    const photo = message.photo?.at(-1);
    const video = message.video;
    if (!photo && !video) {
      await send(chatId, 'Отправьте фото или видео размером до 19 МБ.');
      return;
    }
    const now = Date.now();
    const matchOnly = Boolean(photo && (waitingForMatchPhotoUntil.get(chatId) ?? 0) > now);
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
    if (photo) waitingForMatchPhotoUntil.delete(chatId);
    void analyze(message, chatId, matchOnly).catch(() => console.error('[Telegram] Analysis delivery failed')).finally(() => slots.release(chatId));
  }

  function enqueue(update: any) {
    const query = update.callback_query;
    const chat = query?.message?.chat || update.message?.chat;
    if (chat?.type !== 'private' || !Number.isSafeInteger(chat.id)) return true;
    return dispatch(chat.id, () => query ? handleCallback(query) : handle(update.message));
  }

  const allowedUpdates = ['message', 'callback_query'];
  async function poll() {
    for (;;) {
      try {
        const updates: any[] = await call('getUpdates', { offset, timeout: 25, allowed_updates: allowedUpdates });
        for (const update of updates) {
          offset = Math.max(offset, update.update_id + 1);
          const query = update.callback_query;
          const accepted = enqueue(update);
          if (!accepted && query?.id) void call('answerCallbackQuery', { callback_query_id: query.id, text: 'Слишком много действий. Попробуйте ещё раз.' }, { timeoutMs: 4000 }).catch(() => {});
        }
      } catch {
        console.error('[Telegram] Polling failed; retrying');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async function registerWebhook(config: TelegramWebhookConfig) {
    let retryMs = 5000;
    for (;;) {
      try {
        await call('setWebhook', {
          url: config.url, secret_token: config.secret, max_connections: 1,
          allowed_updates: allowedUpdates, drop_pending_updates: false,
        }, { timeoutMs: 10_000 });
        console.log('[Telegram] Webhook ready');
        return;
      } catch (error) {
        // Never include a token, URL or request payload in logs.
        const retryAfter = (error as { retryAfter?: number })?.retryAfter;
        const wait = Math.max(retryMs, Number.isFinite(retryAfter) ? retryAfter! * 1000 : 0);
        console.error('[Telegram] Webhook registration failed; check token and HTTPS URL. Retrying.');
        await new Promise(resolve => setTimeout(resolve, wait));
        retryMs = Math.min(retryMs * 2, 60_000);
      }
    }
  }

  return {
    enqueue,
    notifyAdminNewRecord,
    start(webhook?: TelegramWebhookConfig) {
      void call('setMyCommands', { commands: [
        { command: 'start', description: 'Главное меню Аргуса' },
        { command: 'photo', description: 'Анализ фотографии' },
        { command: 'video', description: 'Анализ видео' },
        { command: 'add', description: 'Добавить запись в общую базу' },
        { command: 'help', description: 'Помощь и ограничения' },
        { command: 'cancel', description: 'Отменить добавление' },
        { command: 'myid', description: 'Показать ID своего чата' },
        { command: 'match', description: 'Сверить фото с базой' },
      ] }).catch(() => console.error('[Telegram] Command menu setup failed'));
      if (webhook) void registerWebhook(webhook);
      else void poll();
    },
  };
}
