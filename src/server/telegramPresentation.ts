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
  'Анализ фото и видео — прямо в Telegram.\n\n📷 Фото · проверка признаков курения\n🎬 Видео · результат и эпизоды по времени\n➕ База · добавление новой записи',
  'Выберите действие внизу или сразу отправьте файл.');

type Call = (method: string, body: Record<string, unknown>) => Promise<any>;
/** One edited message, an indeterminate moving marker, no fictional percentages. */
export async function beginProgress(call: Call, chatId: number, video: boolean) {
  let stage = 'Получаю файл', frame = 0, stopped = false;
  let pending: Promise<void> = Promise.resolve();
  let messageId: number | undefined;
  const text = () => card(`◈ АРГУС · ${video ? 'ВИДЕО' : 'ФОТО'}`,
    `${['● ○ ○ ○', '○ ● ○ ○', '○ ○ ● ○', '○ ○ ○ ●'][frame++ % 4]}\n${stage}…`,
    'Результат появится здесь.');
  try {
    const message = await call('sendMessage', { chat_id: chatId, text: text(), parse_mode: 'HTML', reply_markup: keyboard() });
    if (Number.isSafeInteger(message?.message_id)) messageId = message.message_id;
  } catch { /* Visual feedback must not prevent analysis. */ }
  const tick = async () => {
    try { await call('sendChatAction', { chat_id: chatId, action: 'typing' }); } catch { /* best effort */ }
    if (!stopped && messageId !== undefined) {
      try { await call('editMessageText', { chat_id: chatId, message_id: messageId, text: text(), parse_mode: 'HTML' }); }
      catch { /* best effort: never fail analysis on animation rate limiting */ }
    }
  };
  let busy = false;
  const timer = setInterval(() => {
    if (busy || stopped) return;
    busy = true;
    pending = tick().finally(() => { busy = false; });
  }, 4000);
  return {
    stage(value: string) { stage = value; },
    async finish(html: string) {
      stopped = true; clearInterval(timer); await pending;
      if (messageId !== undefined) {
        try {
          await call('editMessageText', { chat_id: chatId, message_id: messageId, text: html, parse_mode: 'HTML' });
          return;
        } catch { /* Fall back to a new result message if Telegram cannot edit. */ }
      }
      await call('sendMessage', { chat_id: chatId, text: html, parse_mode: 'HTML', reply_markup: keyboard() });
    },
  };
}
