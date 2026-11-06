import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTelegramAdminChatId } from '../src/server/telegramAdminNotifications.ts';

test('private admin chat ID must be a valid positive integer', () => {
  assert.equal(parseTelegramAdminChatId(' 123456789 '), 123456789);
  for (const input of [undefined, '', 'abc', '-100123456789', '1.2', '0', '999999999999999999999']) {
    assert.equal(parseTelegramAdminChatId(input), null);
  }
});

test('saved JPEG and application details are sent as a private photo message', async () => {
  const { notifyTelegramAdmin } = await import('../src/server/telegramAdminNotifications.ts');
  const previous = globalThis.fetch;
  let called = 0;
  globalThis.fetch = async (url, options) => {
    called++;
    assert.match(url, /\/sendPhoto$/);
    assert.equal(options.method, 'POST');
    assert.equal(options.body.get('chat_id'), '123456789');
    assert.match(options.body.get('caption'), /Тест Иванов/);
    assert.match(options.body.get('caption'), /Отправитель Telegram ID: 777/);
    assert.equal(options.body.get('photo').type, 'image/jpeg');
    return new Response(JSON.stringify({ ok: true, result: {} }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
  try {
    await notifyTelegramAdmin('testtoken', 123456789, {
      fullName: 'Тест Иванов', birthDate: '2000-01-01', schoolOrOrg: '', vkUrl: '',
      photoUrl: 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64'),
    }, 'application-1', 777);
  } finally { globalThis.fetch = previous; }
  assert.equal(called, 1);
});
