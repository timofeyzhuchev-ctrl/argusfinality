import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginProgress, card, keyboard, labels, normalizeButton, registrationCard, photoReport, videoReport } from '../src/server/telegramPresentation.ts';
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
  assert.equal(calls.find(c => c.method === 'sendMessage').body.reply_markup, undefined,
    'Telegram status must remain editable (no reply keyboard)');
  progress.stage('Выполняю анализ');
  t.mock.timers.tick(2000);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.filter(c => c.method === 'sendChatAction').length, 1);
  const edit = calls.find(c => c.method === 'editMessageText');
  assert.equal(edit.body.message_id, 42);
  assert.match(edit.body.text, /Выполняю анализ/);
  assert.notEqual(edit.body.text, calls.find(c => c.method === 'sendMessage').body.text);
  const markup = { inline_keyboard: [[{ text: 'Добавить', callback_data: 'add:123' }]] };
  await progress.finish(card('Готово', 'Результат'), markup);
  const count = calls.length;
  t.mock.timers.tick(12000);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, count);
  assert.match(calls.at(-1).body.text, /Готово/);
  assert.deepEqual(calls.at(-1).body.reply_markup, markup);
});

test('progress degrades gracefully when status or edit cannot be sent', async () => {
  const calls = [];
  const progress = await beginProgress(async (method, body) => {
    calls.push({ method, body });
    if (method === 'sendMessage' && calls.filter(c => c.method === 'sendMessage').length === 1) throw new Error('network');
    return { message_id: 1 };
  }, 7, false);
  await progress.finish(card('Готово', 'Результат'));
  assert.equal(calls.at(-1).method, 'sendMessage');
  assert.match(calls.at(-1).body.text, /Готово/);
});

const observation = {
  personDetected: true, isSmokingOrVaping: false, isHoldingAlcohol: false,
  handToMouthPoseDetected: false, vaporOrSmokeDetected: false,
  deviceLabelRu: 'Нет', confidencePercentage: 82,
  ageEstimation: { estimatedAge: 15, ageRangeString: '13–17 лет', confidencePercentage: 60 },
  safeCityBiometrics: { fullName: 'PRIVATE NAME', findFaceMatched: true },
  legalAssessment: { applicableArticle: 'PRIVATE LEGAL' },
  analyticalSummaryRu: 'PRIVATE SUMMARY', detectedObjects: [],
};

test('photo report returns approximate age and observations, never identity or legal guesses', () => {
  const html = photoReport(observation);
  assert.match(html, /предположительный возраст: 15 лет/);
  assert.match(html, /13–17 лет/);
  assert.match(html, /82%/);
  assert.match(html, /Признаков курения или вейпинга на снимке не выявлено/);
  assert.match(html, /Сверка по базе доступна администратору/);
  assert.doesNotMatch(html, /PRIVATE|Нарушений.*не зафиксировано/);
});

test('database source is shown only with a candidate and stored record fields are escaped', () => {
  assert.doesNotMatch(photoReport(observation, { status: 'no_match', checked: 2 }), /Данные взяты из базы/);
  const html = photoReport(observation, { status: 'candidate', checked: 2, record: {
    id: 'abc12345', fullName: '<Тест>', birthDate: '2000-01-01', schoolOrOrg: '', vkUrl: '',
  } });
  assert.match(html, /Данные взяты из базы данных «Аргус»/);
  assert.match(html, /&lt;Тест&gt;/);
  assert.match(html, /Сверьте фотографии вручную/);
});

test('no-person and invalid-age results do not invent age', () => {
  const none = photoReport({ ...observation, personDetected: false });
  assert.match(none, /Человек в кадре не обнаружен/);
  assert.doesNotMatch(none, /15|60%|БАЗ/);
  const invalid = photoReport({ ...observation, ageEstimation: { estimatedAge: NaN } });
  assert.match(invalid, /<b>Возраст<\/b> · не определён/);
  assert.doesNotMatch(invalid, /NaN/);
});

test('large or malicious field values remain escaped and within Telegram parsed length limit', () => {
  const label = '<b>&'.repeat(1000);
  const output = photoReport({ ...observation, isSmokingOrVaping: true, isHoldingAlcohol: true,
    deviceLabelRu: label, alcoholLabelRu: label,
    detectedObjects: Array.from({ length: 100 }, () => ({ label })),
    ageEstimation: { estimatedAge: 20, ageRangeString: label, confidencePercentage: 999 } });
  const parsed = output.replace(/<\/?(?:b|i|blockquote)(?: expandable)?>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  assert.ok(parsed.length < 4096);
  assert.match(output, /&lt;b&gt;/);
  assert.doesNotMatch(output, /999%/);
  const video = videoReport({ smokingDetected: true, summary: 'PRIVATE SUMMARY', events:
    Array.from({ length: 100 }, () => ({ start: label, end: label, typeLabelRu: label, description: label, estimatedAgeYears: 21, confidence: 83 })) });
  const videoParsed = video.replace(/<\/?(?:b|i|blockquote)(?: expandable)?>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  assert.ok(videoParsed.length < 4096);
  assert.match(video, /Показаны первые 6 из 100/);
  assert.match(video, /возраст ≈ 21 год/);
  assert.doesNotMatch(video, /PRIVATE SUMMARY/);
});

test('completion waits for in-flight status edit, then replaces it with final result', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const calls = [];
  let release;
  const progress = await beginProgress(async (method, body) => {
    if (method === 'editMessageText' && !body.text.includes('FINAL')) {
      await new Promise(resolve => { release = resolve; });
    }
    calls.push({ method, body });
    return { message_id: 42 };
  }, 1, false);
  t.mock.timers.tick(2000);
  const done = progress.finish('FINAL');
  release(); await done;
  assert.equal(calls.at(-1).body.text, 'FINAL');
  const size = calls.length;
  t.mock.timers.tick(20000);
  assert.equal(calls.length, size);
});
