import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTelegramBot } from '../src/server/telegramBot.ts';
const recordId = '3bb1cb21-bd68-48ea-af50-0d8d51072601';

test('new-record alerts go to the configured private chat and link to the protected panel', async t => {
  const sent = [];
  t.mock.method(globalThis, 'fetch', async (endpoint, options) => {
    assert.match(String(endpoint), /\/sendMessage$/);
    sent.push(JSON.parse(options.body));
    return Response.json({ ok: true });
  });
  const bot = createTelegramBot('test-token', { adminChatId: '424242', siteUrl: 'https://example.test/api/telegram/webhook' });
  bot.notifyAdminNewRecord('site', recordId);
  bot.notifyAdminNewRecord('telegram', recordId);
  createTelegramBot('test-token').notifyAdminNewRecord('site', recordId);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent.length, 2);
  for (const message of sent) {
    assert.equal(message.chat_id, 424242);
    assert.equal(message.reply_markup.inline_keyboard[0][0].url, 'https://example.test/#admin');
    assert.deepEqual(message.reply_markup.inline_keyboard[1].map(button => button.callback_data),
      [`review:approve:${recordId}`, `review:reject:${recordId}`]);
  }
  assert.match(sent[0].text, /Источник: сайт/);
  assert.match(sent[1].text, /Источник: Telegram/);
});

test('review buttons reject other chats and apply only the first valid decision', async t => {
  const calls = [], decisions = [];
  t.mock.method(globalThis, 'fetch', async (endpoint, options) => {
    calls.push({ method: String(endpoint).split('/').at(-1), ...JSON.parse(options.body) });
    return Response.json({ ok: true });
  });
  const bot = createTelegramBot('test-token', {
    adminChatId: '424242', reviewRecord: async (id, decision) => { decisions.push({ id, decision }); return decisions.length === 1; },
  });
  const callback = (chatId, senderId, decision) => bot.enqueue({ callback_query: {
    id: 'cb', data: `review:${decision}:${recordId}`, from: { id: senderId },
    message: { message_id: 23, chat: { type: 'private', id: chatId } },
  } });
  callback(781, 781, 'approve');
  callback(424242, 781, 'approve');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(decisions, []);
  assert.equal(calls.length, 1);
  assert.match(calls[0].text, /доступно администратору/);
  callback(424242, 424242, 'reject');
  callback(424242, 424242, 'approve');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(decisions, [{ id: recordId, decision: 'reject' }, { id: recordId, decision: 'approve' }]);
  const results = calls.filter(call => call.method === 'editMessageText');
  assert.match(results[0].text, /отклонена/);
  assert.match(results[1].text, /уже обработана/);
  assert.deepEqual(results[0].reply_markup.inline_keyboard, []);
});

test('/myid returns the current private chat ID without revealing the configured admin ID', async t => {
  const sent = [];
  t.mock.method(globalThis, 'fetch', async (_endpoint, options) => {
    sent.push(JSON.parse(options.body));
    return Response.json({ ok: true });
  });
  const bot = createTelegramBot('test-token', { adminChatId: '424242' });
  bot.enqueue({ message: { text: '/myid', chat: { type: 'private', id: 781 } } });
  bot.enqueue({ message: { text: '/myid', chat: { type: 'group', id: -123 } } });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(sent, [{ chat_id: 781, text: 'Ваш ID для уведомлений: 781' }]);
});
