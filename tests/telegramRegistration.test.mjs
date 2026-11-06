import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTelegramRegistration } from '../src/server/telegramRegistration.ts';

function setup(overrides = {}) {
  const messages = [], saved = [];
  let time = Date.parse('2026-11-05T12:00:00Z');
  const handle = createTelegramRegistration({
    send: async (id, text) => { messages.push({ id, text }); },
    download: async (_file, limit) => { assert.equal(limit, 2097152); return Buffer.from([255, 216, 255, 217]); },
    save: async (record, id) => { saved.push({ ...record, id }); },
    configured: () => true, now: () => time, ...overrides,
  });
  const say = (text, id = 1) => handle(id, { text });
  const photo = (id = 1) => handle(id, { photo: [{ file_id: 'test' }] });
  const fill = async () => { for (const value of ['/add', 'Тестовая запись', '01.01.2000', '/skip', '/skip']) await say(value); await photo(); };
  return { handle, say, photo, fill, messages, saved, advance: ms => { time += ms; } };
}

test('normal photos pass through to analysis; registration requires explicit confirmation', async () => {
  const s = setup();
  assert.equal(await s.photo(), false);
  await s.fill();
  assert.equal(s.saved.length, 0);
  await s.say('/save');
  assert.equal(s.saved.length, 1);
  assert.equal(s.saved[0].birthDate, '2000-01-01');
  assert.equal(s.saved[0].schoolOrOrg, '');
  assert.match(s.saved[0].photoUrl, /^data:image\/jpeg;base64,/);
  await s.say('/save');
  assert.equal(s.saved.length, 1);
  assert.equal(await s.photo(), false);
});

test('drafts are private per chat and cancel does not save', async () => {
  const s = setup();
  await s.say('/add', 1);
  assert.equal(await s.photo(2), false);
  await s.say('/cancel', 1);
  assert.equal(await s.photo(1), false);
  assert.equal(s.saved.length, 0);
});

test('invalid date and links stay on the current question', async () => {
  const s = setup();
  await s.say('/add'); await s.say('Тест'); await s.say('31.02.2000');
  assert.match(s.messages.at(-1).text, /существующую дату/);
  await s.say('2100-01-01'); assert.match(s.messages.at(-1).text, /существующую дату/);
  await s.say('29.02.2000'); await s.say('/skip'); await s.say('https://evil.example/');
  assert.match(s.messages.at(-1).text, /Нужна ссылка/);
  await s.say('https://vk.com/test'); await s.photo(); await s.say('/save');
  assert.equal(s.saved[0].vkUrl, 'https://vk.com/test');
});

test('failed database write retains draft and reuses id on retry', async () => {
  const ids = [];
  const s = setup({ save: async (_record, id) => { ids.push(id); if (ids.length === 1) throw new Error('offline'); } });
  await s.fill(); await s.say('/save');
  assert.match(s.messages.at(-1).text, /не подтверждена/);
  await s.say('/save');
  assert.equal(ids.length, 2); assert.equal(ids[0], ids[1]);
  assert.match(s.messages.at(-1).text, /сохранена/);
});

test('expired drafts cannot be saved and unavailable database prevents starting', async () => {
  const s = setup(); await s.fill(); s.advance(900001); await s.say('/save');
  assert.equal(s.saved.length, 0); assert.match(s.messages.at(-1).text, /время истекло/);
  const offline = setup({ configured: () => false }); await offline.say('/add');
  assert.match(offline.messages.at(-1).text, /не настроена/);
  assert.equal(await offline.photo(), false);
});

test('invalid image is rejected without saving or leaving photo step', async () => {
  const s = setup({ download: async () => Buffer.from('not a jpeg') });
  await s.fill(); assert.match(s.messages.at(-1).text, /Не удалось принять фото/);
  await s.say('/save'); assert.equal(s.saved.length, 0);
});
