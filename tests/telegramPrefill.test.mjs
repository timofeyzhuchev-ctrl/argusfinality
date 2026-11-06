import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTelegramRegistration } from '../src/server/telegramRegistration.ts';

function setup(download = async () => Buffer.from([255, 216, 255, 217])) {
  const messages = [], saved = [], downloads = [];
  let time = Date.parse('2026-11-06T10:00:00Z');
  const handle = createTelegramRegistration({
    send: async (chatId, text, step) => messages.push({ chatId, text, step }),
    download: async (file, limit) => { downloads.push({ file, limit }); return download(file, limit); },
    save: async (record, id) => saved.push({ ...record, id }),
    configured: () => true,
    now: () => time,
  });
  const say = text => handle(7, { text });
  const fields = async () => { for (const value of ['Тестовый человек', '06.11.2000', '/skip', '/skip']) await say(value); };
  return { handle, say, fields, messages, saved, downloads, advance: ms => { time += ms; } };
}

test('analysis photo is downloaded only at photo step, then explicit save confirms registration', async () => {
  const s = setup();
  await s.handle(7, { text: '/add', registrationPhoto: { file_id: 'analysed-photo', file_size: 100 } });
  assert.equal(s.downloads.length, 0);
  await s.fields();
  assert.equal(s.downloads.length, 1);
  assert.equal(s.downloads[0].file.file_id, 'analysed-photo');
  assert.equal(s.downloads[0].limit, 2097152);
  assert.equal(s.messages.at(-1).step, 'confirm');
  assert.match(s.messages.at(-1).text, /Фото из анализа прикреплено/);
  assert.equal(s.saved.length, 0);
  await s.say('/save');
  assert.equal(s.saved.length, 1);
  assert.match(s.saved[0].photoUrl, /^data:image\/jpeg;base64,/);
});

test('expired prefilled draft releases metadata without download or saving', async () => {
  const s = setup();
  await s.handle(7, { text: '/add', registrationPhoto: { file_id: 'expired-photo' } });
  s.advance(900001);
  await s.say('/save');
  assert.match(s.messages.at(-1).text, /время истекло/);
  assert.equal(s.downloads.length, 0);
  assert.equal(s.saved.length, 0);
  await s.say('/add'); await s.fields();
  assert.equal(s.messages.at(-1).step, 'photo');
  assert.equal(s.downloads.length, 0);
});

test('oversized seed falls back to manual photo and can then save', async () => {
  const s = setup();
  await s.handle(7, { text: '/add', registrationPhoto: { file_id: 'too-large', file_size: 2097153 } });
  await s.fields();
  assert.equal(s.messages.at(-1).step, 'photo');
  assert.match(s.messages.at(-1).text, /новую фотографию/);
  assert.equal(s.downloads.length, 0);
  await s.handle(7, { photo: [{ file_id: 'replacement' }] });
  assert.equal(s.messages.at(-1).step, 'confirm');
  await s.say('/save');
  assert.equal(s.saved.length, 1);
});

test('failed seed download is recoverable without losing entered fields', async () => {
  const s = setup(async file => {
    if (file.file_id === 'missing-photo') throw new Error('Unavailable');
    return Buffer.from([255, 216, 255, 217]);
  });
  await s.handle(7, { text: '/add', registrationPhoto: { file_id: 'missing-photo' } });
  await s.fields();
  assert.equal(s.messages.at(-1).step, 'photo');
  await s.handle(7, { photo: [{ file_id: 'replacement' }] });
  await s.say('/save');
  assert.equal(s.saved[0].fullName, 'Тестовый человек');
  assert.equal(s.saved[0].birthDate, '2000-11-06');
});

test('cancelled prefill is not reused in another chat or a new registration', async () => {
  const s = setup();
  await s.handle(7, { text: '/add', registrationPhoto: { file_id: 'private-photo' } });
  assert.equal(await s.handle(8, { text: 'Someone else' }), false);
  await s.say('/cancel'); await s.say('/add'); await s.fields();
  assert.equal(s.messages.at(-1).step, 'photo');
  assert.equal(s.downloads.length, 0);
});
