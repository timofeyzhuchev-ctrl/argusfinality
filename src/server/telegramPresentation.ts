import type { ArgusAnalysisResponse } from '../types/argus';
import type { VideoSmokingAnalysis } from '../types/videoSmoking';

export type RegistrationStep = 'name' | 'birth' | 'org' | 'vk' | 'photo' | 'confirm';
export const labels = {
  photo: '📷 Анализ фото', video: '🎬 Анализ видео', add: '➕ Добавить запись',
  help: 'ℹ️ Помощь', cancel: '✕ Отмена', skip: 'Пропустить →', save: '✓ Сохранить',
} as const;

export function normalizeButton(text?: string) {
  const commands: Record<string, string> = {
    [labels.photo]: '/photo', [labels.video]: '/video', [labels.add]: '/add',
    [labels.help]: '/help', [labels.cancel]: '/cancel', [labels.skip]: '/skip', [labels.save]: '/save',
  };
  return text ? commands[text.trim()] || text : text;
}

export function keyboard(step?: RegistrationStep) {
  const rows = step === 'confirm' ? [[labels.save], [labels.cancel]]
    : step === 'org' || step === 'vk' ? [[labels.skip, labels.cancel]]
    : step ? [[labels.cancel]]
    : [[labels.photo, labels.video], [labels.add], [labels.help]];
  return { keyboard: rows.map(row => row.map(text => ({ text }))), resize_keyboard: true,
    input_field_placeholder: step ? 'Ответьте на вопрос…' : 'Выберите действие или отправьте файл' };
}

export const escapeHtml = (value: unknown) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const card = (title: string, body: string, footer = '') =>
  `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}${footer ? `\n\n<i>${escapeHtml(footer)}</i>` : ''}`;

export function registrationCard(text: string, step?: RegistrationStep) {
  if (!step) return card('◈ АРГУС · БАЗА', text);
  const steps: RegistrationStep[] = ['name', 'birth', 'org', 'vk', 'photo', 'confirm'];
  const index = steps.indexOf(step);
  const names = ['Имя', 'Дата рождения', 'Организация', 'Профиль VK', 'Фотография', 'Подтверждение'];
  const track = steps.map((_, i) => i <= index ? '●' : '○').join(' ');
  return card(`➕ Новая запись · ${index + 1}/6`, `${track}\n${names[index]}\n\n${text}`);
}

export const welcome = card('◈ АРГУС',
  'Визуальный анализ в одном сообщении.\n\n📷 Фото · примерный возраст, курение и алкоголь\n🎬 Видео · признаки курения и время эпизодов\n➕ База · добавление новой записи',
  'Выберите действие внизу или сразу отправьте файл.');

const clean = (value: unknown, max = 100) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const percentage = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? `${Math.round(value)}%` : 'не указана';
const sign = (value: unknown, yes = 'есть признаки') => value === true ? yes : value === false ? 'признаков не выявлено' : 'не определено';
const ageNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 120 ? Math.round(value) : undefined;
const ageUnit = (age: number) => age % 100 >= 11 && age % 100 <= 14 ? 'лет' : age % 10 === 1 ? 'год' : age % 10 >= 2 && age % 10 <= 4 ? 'года' : 'лет';

/** Compose a report from observations, never echo invented identity or legal claims. */
export function photoReport(result: ArgusAnalysisResponse): string {
  if (result.personDetected === false) return card('◈ АРГУС · ОТЧЁТ ПО ФОТО',
    'Человек в кадре не обнаружен.\n\nВозраст и признаки поведения человека не оценивались. Попробуйте более чёткий снимок, на котором видны лицо и руки.',
    'Это оценка изображения нейросетью, возможна ошибка.');
  const age = ageNumber(result.ageEstimation?.estimatedAge);
  const range = age ? clean(result.ageEstimation?.ageRangeString, 60) : '';
  const smoking = result.isSmokingOrVaping;
  const alcohol = result.isHoldingAlcohol;
  const narrative = [
    `Система «Аргус» обнаружила на снимке человека${age ? ` (предположительный возраст: ${age} ${ageUnit(age)})` : '; примерный возраст определить не удалось'}.`,
    smoking === true ? 'Выявлены визуальные признаки возможного курения или вейпинга.'
      : smoking === false ? 'Признаков курения или вейпинга на снимке не выявлено.' : 'Наличие признаков курения определить не удалось.',
    alcohol === true ? 'Обнаружен предмет, похожий на алкогольную продукцию.'
      : alcohol === false ? 'Признаков алкогольной продукции не выявлено.' : 'Наличие алкогольной продукции не определено.',
  ].join(' ');
  const ageLines = [`Возраст: ${age ? `≈ ${age} ${ageUnit(age)}${range ? ` · ${range}` : ''}` : 'не определён'}`];
  if (age) ageLines.push(`Уверенность модели в возрасте: ${percentage(result.ageEstimation?.confidencePercentage)}`);
  const details = [
    `Курение / вейпинг: ${sign(smoking)}`,
    ...(smoking === true && clean(result.deviceLabelRu) ? [`Предполагаемый предмет: ${clean(result.deviceLabelRu)}`] : []),
    `Алкоголь: ${sign(alcohol, 'возможные признаки')}`,
    ...(alcohol === true && clean(result.alcoholLabelRu) ? [`Предполагаемый предмет: ${clean(result.alcoholLabelRu)}`] : []),
    `Жест рукой ко рту: ${sign(result.handToMouthPoseDetected, 'обнаружен')}`,
    `Дым / пар: ${sign(result.vaporOrSmokeDetected, 'возможные признаки')}`,
    `Уверенность модели в основном выводе: ${percentage(result.confidencePercentage)}`,
  ];
  const objects = (Array.isArray(result.detectedObjects) ? result.detectedObjects : [])
    .slice(0, 6).map(object => clean(object.label, 45)).filter(Boolean);
  return `<b>◈ АРГУС · ОТЧЁТ ПО ФОТО</b>\n\n${escapeHtml(narrative)}\n\n` +
    `<b>01 · ПРИМЕРНЫЙ ВОЗРАСТ</b>\n${escapeHtml(ageLines.join('\n'))}\n\n` +
    `<b>02 · ВИЗУАЛЬНЫЕ ПРИЗНАКИ</b>\n${escapeHtml(details.join('\n'))}` +
    (objects.length ? `\n\n<b>03 · ОБЪЕКТЫ В КАДРЕ</b>\n${escapeHtml(objects.join(' · '))}` : '') +
    '\n\n<b>ЛИЧНОСТЬ</b>\nНе установлена. Сравнение лиц с базой пока недоступно.' +
    '\n\n<i>Возраст и признаки — предположения модели, а не подтверждённые факты. По одному снимку нельзя установить наличие или отсутствие правонарушения.</i>';
}

export function videoReport(result: VideoSmokingAnalysis): string {
  const events = Array.isArray(result.events) ? result.events : [];
  const timeline = events.slice(0, 6).map((event, index) => {
    const age = ageNumber(event.estimatedAgeYears);
    return `<b>${index + 1}. ${escapeHtml(clean(event.start, 16))} — ${escapeHtml(clean(event.end, 16))}</b>\n` +
      escapeHtml(`${clean(event.typeLabelRu, 65) || 'Предполагаемый эпизод'}\n${clean(event.description, 130)}\n` +
      `Уверенность модели: ${percentage(event.confidence)}${age ? ` · возраст ≈ ${age} ${ageUnit(age)}` : ''}`);
  }).join('\n\n');
  return `<b>◈ АРГУС · ОТЧЁТ ПО ВИДЕО</b>\n\n` +
    escapeHtml(result.smokingDetected === true ? 'На видео обнаружены признаки возможного курения или вейпинга.'
      : 'Признаков курения или вейпинга в результате анализа не выявлено.') +
    `\n\n<b>ЭПИЗОДЫ · ${events.length}</b>\n${timeline || 'Эпизоды не выделены.'}` +
    (events.length > 6 ? `\n\nПоказаны первые 6 из ${events.length} эпизодов.` : '') +
    '\n\n<i>Предварительный визуальный анализ. Возраст указывается только при наличии оценки для эпизода. Идентификация личности и проверка правонарушений не выполнялись.</i>';
}

type Call = (method: string, body: Record<string, unknown>, options?: { timeoutMs?: number }) => Promise<any>;
/** One edited message, an indeterminate moving marker, no fictional percentages. */
export async function beginProgress(call: Call, chatId: number, video: boolean) {
  let stage = 'Получаю файл', frame = 0, stopped = false;
  const startedAt = Date.now();
  let nextEditAt = 0, lastTypingAt = startedAt;
  let pending: Promise<void> = Promise.resolve();
  let messageId: number | undefined;
  const text = () => card(`◈ АРГУС · ${video ? 'ВИДЕО' : 'ФОТО'}`,
    `${['▰ ▱ ▱ ▱ ▱', '▱ ▰ ▱ ▱ ▱', '▱ ▱ ▰ ▱ ▱', '▱ ▱ ▱ ▰ ▱', '▱ ▱ ▱ ▱ ▰', '▱ ▱ ▱ ▰ ▱', '▱ ▱ ▰ ▱ ▱', '▱ ▰ ▱ ▱ ▱'][frame++ % 8]}\n\n${stage}\nПрошло: ${Math.floor((Date.now() - startedAt) / 1000)} сек.`,
    video ? 'Анализ видео может занять несколько минут. Отчёт появится здесь.' : 'Анализирую изображение. Отчёт появится здесь.');
  void call('sendChatAction', { chat_id: chatId, action: 'typing' }, { timeoutMs: 5000 }).catch(() => {});
  try {
    // Editable messages must not carry a reply keyboard. The existing chat keyboard stays visible.
    const message = await call('sendMessage', { chat_id: chatId, text: text(), parse_mode: 'HTML' }, { timeoutMs: 5000 });
    if (Number.isSafeInteger(message?.message_id)) messageId = message.message_id;
  } catch { /* Visual feedback must not prevent analysis. */ }
  const tick = async () => {
    if (Date.now() - lastTypingAt >= 4000) {
      lastTypingAt = Date.now();
      void call('sendChatAction', { chat_id: chatId, action: 'typing' }, { timeoutMs: 5000 }).catch(() => {});
    }
    if (!stopped && messageId !== undefined && Date.now() >= nextEditAt) {
      try { await call('editMessageText', { chat_id: chatId, message_id: messageId, text: text(), parse_mode: 'HTML' }, { timeoutMs: 5000 }); }
      catch (error: any) {
        // Respect Telegram flood control when provided, otherwise back off briefly.
        const delay = Number(error?.retryAfter ?? error?.parameters?.retry_after);
        nextEditAt = Date.now() + (Number.isFinite(delay) && delay > 0 ? delay : 8) * 1000;
      }
    }
  };
  let busy = false;
  const timer = setInterval(() => {
    if (busy || stopped) return;
    busy = true;
    pending = tick().finally(() => { busy = false; });
  }, 2000);
  return {
    stage(value: string) { stage = value; },
    async finish(html: string, replyMarkup?: Record<string, unknown>) {
      stopped = true; clearInterval(timer); await pending;
      if (messageId !== undefined) {
        try {
          await call('editMessageText', { chat_id: chatId, message_id: messageId, text: html, parse_mode: 'HTML', ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
          return;
        } catch { /* Fall back to a new result message if Telegram cannot edit. */ }
      }
      await call('sendMessage', { chat_id: chatId, text: html, parse_mode: 'HTML', reply_markup: replyMarkup || keyboard() });
    },
  };
}
