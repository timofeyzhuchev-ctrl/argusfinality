// Send only submitted, saved applications to the owner’s private Telegram chat.
// No external dependencies, works with Node 18+ global fetch/FormData/Blob.

type RecordInput = {
  fullName: string; birthDate: string; schoolOrOrg: string; vkUrl: string; photoUrl: string;
};

export function parseTelegramAdminChatId(value: string | undefined): number | null {
  const input = value?.trim() || '';
  // Private Telegram user/chat IDs are positive, unlike most group IDs.
  if (!/^[1-9]\d{0,15}$/.test(input)) return null;
  const number = Number(input);
  return Number.isSafeInteger(number) ? number : null;
}

export async function notifyTelegramAdmin(
  token: string,
  adminChatId: number,
  record: RecordInput,
  recordId: string,
  senderChatId: number,
): Promise<void> {
  if (!Number.isSafeInteger(adminChatId) || adminChatId <= 0) throw new Error('Invalid Telegram admin ID');
  const match = /^data:image\/jpeg;base64,([a-zA-Z0-9+/]+={0,2})$/.exec(record.photoUrl);
  if (!match) throw new Error('Missing JPEG');
  const bytes = Buffer.from(match[1], 'base64');
  if (!bytes.length || bytes.length > 2 * 1024 * 1024 ||
      bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error('Invalid JPEG');

  const compact = (input: string, max: number) => input.replace(/[\r\n\t]+/g, ' ').slice(0, max);
  const caption = [
    '📥 АРГУС · Новая заявка в базе',
    `ФИО: ${compact(record.fullName, 160)}`,
    `Дата рождения: ${compact(record.birthDate, 12)}`,
    `Организация: ${compact(record.schoolOrOrg || 'не указана', 200)}`,
    `VK: ${compact(record.vkUrl || 'не указан', 200)}`,
    `Отправитель Telegram ID: ${senderChatId}`,
    `ID записи: ${recordId}`,
    'Заявка сохранена и ожидает проверки в админ-панели.',
  ].join('\n').slice(0, 1000); // Telegram photo caption max is 1024 chars.

  const data = new FormData();
  data.set('chat_id', String(adminChatId));
  data.set('caption', caption);
  data.set('photo', new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }), 'argus-application.jpg');
  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST', body: data, signal: AbortSignal.timeout(40_000),
  });
  const reply: any = await response.json();
  if (!response.ok || !reply?.ok) throw new Error('Telegram admin notification failed');
}
