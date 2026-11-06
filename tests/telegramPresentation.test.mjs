import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginProgress, card, keyboard, labels, normalizeButton, registrationCard } from '../src/server/telegramPresentation.ts';
import { createTelegramRegistration } from '../src/server/telegramRegistration.ts';

test('formatted cards escape user text and use appropriate keyboards', () => {
  assert.equal(card('<name>', 'A&B'), '<b>&lt;name&gt;</b>\n\nA&amp;B');
  assert.match(registrationCard('<untrusted>', 'birth'), /2\/6/);
  assert.match(registrationCard('<untrusted>', 'birth'), /&lt;untrusted&gt;/);
  assert.equal(keyboard('confirm').keyboard[0][0].text, labels.save);
  assert.equal(keyboard('org').keyboard[0][0].text, labels.skip);
  assert.equal(keyboard('photo').keyboard[0][0].text, labels.cancel);
});

test('registration button workflow preserves save and cancel behavior', async () => {
  const output = [], saved = [];
  const handle = createTelegramRegistration({
    send: async (_id, text, step) => output.push({ text, step }),
    configured: () => true,
    save: async data => saved.push(data),
    download: async () => Buffer.from([255, 216, 255]),
  });
  const say = text => handle(1, { text: normalizeButton(text) });
  await say(labels.add); assert.equal(output.at(-1).step, 'name');
  await say('Тест'); await say('2000-01-01');
  assert.equal(output.at(-1).step, 'org');
  await say(labels.skip); await say(labels.skip);
  await handle(1, { photo: [{ file_id: 'test' }] });
  assert.equal(output.at(-1).step, 'confirm');
  await say(labels.save); assert.equal(saved.length, 1);
  assert.equal(output.at(-1).step, undefined);
  await say(labels.add); await say(labels.cancel);
  assert.equal(output.at(-1).step, undefined);
});

test('progress edits one message, changes frames and stops after completion', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const calls = [];
  const progress = await beginProgress(async (method, body) => {
    calls.push({ method, body }); return { message_id: 42 };
  }, 7, true);
  progress.stage('Выполняю анализ');
  t.mock.timers.tick(4000);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.filter(c => c.method === 'sendChatAction').length, 1);
  const edit = calls.find(c => c.method === 'editMessageText');
  assert.equal(edit.body.message_id, 42);
  assert.match(edit.body.text, /Выполняю анализ/);
  assert.notEqual(edit.body.text, calls[0].body.text);
  await progress.finish(card('Готово', 'Результат'));
  const count = calls.length;
  t.mock.timers.tick(12000);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, count);
  assert.match(calls.at(-1).body.text, /Готово/);
});

test('progress degrades gracefully when status or edit cannot be sent', async () => {
  const calls = [];
  const progress = await beginProgress(async (method, body) => {
    calls.push({ method, body });
    if (calls.length === 1) throw new Error('network');
    return { message_id: 1 };
  }, 7, false);
  await progress.finish(card('Готово', 'Результат'));
  assert.equal(calls.at(-1).method, 'sendMessage');
  assert.match(calls.at(-1).body.text, /Готово/);
});
