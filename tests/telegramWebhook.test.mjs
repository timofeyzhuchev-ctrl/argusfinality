import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createTelegramWebhookRouter, readTelegramWebhookConfig } from '../src/server/telegramWebhook.ts';
import { createTelegramBot } from '../src/server/telegramBot.ts';

const secret = 'a'.repeat(32);
const url = 'https://example.test/api/telegram/webhook';

test('webhook must be configured with both a valid secret and the exact HTTPS route', () => {
  assert.equal(readTelegramWebhookConfig({}), undefined);
  assert.deepEqual(readTelegramWebhookConfig({ TELEGRAM_WEBHOOK_URL: url, TELEGRAM_WEBHOOK_SECRET: secret }), { url, secret });
  assert.throws(() => readTelegramWebhookConfig({ TELEGRAM_WEBHOOK_URL: url }), /SECRET/);
  assert.throws(() => readTelegramWebhookConfig({ TELEGRAM_WEBHOOK_URL: url.replace('https:', 'http:'), TELEGRAM_WEBHOOK_SECRET: secret }), /HTTPS/);
});

test('webhook authenticates before parsing, retries on overload and suppresses duplicate updates', async () => {
  let attempts = 0;
  const router = createTelegramWebhookRouter(secret, () => ++attempts > 1);
  const send = (token, body) => new Promise((resolve, reject) => {
    const headers = {
      'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body)),
      'x-telegram-bot-api-secret-token': token,
    };
    const request = Object.assign(Readable.from([Buffer.from(body)]), {
      method: 'POST', url: '/', headers, get: name => headers[name.toLowerCase()],
    });
    router(request, { sendStatus: resolve }, error => reject(error || new Error('No route matched')));
  });
  const update = JSON.stringify({ update_id: 11, message: { text: '/start' } });
  assert.equal(await send('b'.repeat(32), 'invalid JSON'), 403);
  assert.equal(await send(secret, '{}'), 400);
  assert.equal(await send(secret, update), 503);
  assert.equal(await send(secret, update), 200);
  assert.equal(await send(secret, update), 200);
  assert.equal(attempts, 2);
});

test('webhook startup registers delivery without starting long polling or dropping queued messages', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (endpoint, options) => {
    calls.push({ method: String(endpoint).split('/').at(-1), body: JSON.parse(options.body) });
    return Response.json({ ok: true, result: true });
  });
  createTelegramBot('test-token').start({ url, secret });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls.map(call => call.method), ['setMyCommands', 'setWebhook']);
  assert.deepEqual(calls[1].body, {
    url, secret_token: secret, max_connections: 1,
    allowed_updates: ['message', 'callback_query'], drop_pending_updates: false,
  });
});
