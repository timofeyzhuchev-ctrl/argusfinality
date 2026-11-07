import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTelegramBot } from '../src/server/telegramBot.ts';

test('/match only gives the admin a database result and needs no visual provider', { timeout: 5000 }, async t => {
  const calls = [];
  const report = Promise.withResolvers();
  const animationRemoved = Promise.withResolvers();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.match(String(url), /^https:\/\/api\.telegram\.org\//, 'Face-only mode must not contact a visual provider');
    const method = String(url).split('/').at(-1);
    if (method === 'test.jpg') return new Response(Uint8Array.of(255, 216, 255));
    if (method === 'sendAnimation') {
      const asset = options.body.get('animation');
      assert.equal(asset.type, 'video/mp4');
      assert.equal(asset.name, 'argus-processing.mp4');
      const header = new Uint8Array(await asset.slice(4, 8).arrayBuffer());
      assert.equal(Buffer.from(header).toString('ascii'), 'ftyp');
      return Response.json({ ok: true, result: { message_id: 99, animation: { file_id: 'test-asset' } } });
    }
    const body = JSON.parse(options.body);
    calls.push({ method, body });
    if (method === 'deleteMessage') animationRemoved.resolve();
    if (method === 'getFile') return Response.json({ ok: true, result: { file_path: 'test.jpg' } });
    if (method === 'editMessageText' && body.text.includes('СВЕРКА С БАЗОЙ')) report.resolve(body.text);
    return Response.json({ ok: true, result: { message_id: 1 } });
  });
  let comparisons = 0;
  const bot = createTelegramBot('test-token', { adminChatId: '424242', compareFace: async bytes => {
    comparisons++;
    assert.deepEqual([...bytes], [255, 216, 255]);
    return { status: 'pending_photo' };
  } });
  const chat = id => ({ type: 'private', id });
  bot.enqueue({ message: { chat: chat(99), text: '/match' } });
  bot.enqueue({ message: { chat: chat(424242), text: '/match' } });
  bot.enqueue({ message: { chat: chat(424242), photo: [{ file_id: 'test-photo' }] } });
  assert.match(await report.promise, /ожидает проверки/);
  await animationRemoved.promise;
  assert.equal(comparisons, 1);
  assert.ok(calls.some(({ body }) => body.chat_id === 99 && body.text.includes('личном чате администратора')));
  assert.ok(calls.some(({ body }) => body.chat_id === 424242 && body.text?.includes('Отправьте фото для сверки')));
});
