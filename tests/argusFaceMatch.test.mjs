import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findArgusFaceMatch, selectFaceCandidate } from '../src/server/argusFaceMatch.ts';
import { approvedFaceRecords, createSharedDatabaseRouter } from '../src/server/sharedDatabase.ts';

test('ranking reports low similarity and ambiguous records instead of guessing', () => {
  const entry = (id, cosine) => ({ id, embedding: [cosine, Math.sqrt(1 - cosine ** 2)] });
  assert.deepEqual(selectFaceCandidate([1, 0], [entry('low', .59)]), { status: 'no_match' });
  assert.deepEqual(selectFaceCandidate([1, 0], [entry('a', .85), entry('b', .80)]), { status: 'ambiguous' });
  assert.deepEqual(selectFaceCandidate([1, 0], [entry('low', .51), entry('high', .86)]), { status: 'candidate', id: 'high' });
});

test('resending a stored file reports pending, approved or duplicate records without requiring a face descriptor', async t => {
  const previous = process.env.ARGUS_FACE_MATCH_ENABLED;
  process.env.ARGUS_FACE_MATCH_ENABLED = 'true';
  t.after(() => { if (previous === undefined) delete process.env.ARGUS_FACE_MATCH_ENABLED; else process.env.ARGUS_FACE_MATCH_ENABLED = previous; });
  const record = { id: 'abc', fullName: 'Тестовая запись', birthDate: '2000-01-01', schoolOrOrg: '', vkUrl: '' };
  const photo = Buffer.from([255, 216, 255]);
  let rows = [{ id: record.id, status: 'pending' }];
  t.mock.method(approvedFaceRecords, 'exactPhoto', async bytes => { assert.deepEqual(bytes, photo); return rows; });
  t.mock.method(approvedFaceRecords, 'record', async () => record);
  t.mock.method(approvedFaceRecords, 'list', async () => assert.fail('No gallery inference for an identical stored file'));
  assert.deepEqual(await findArgusFaceMatch(photo), { status: 'pending_photo' });
  rows = [{ id: record.id, status: 'approved' }];
  assert.deepEqual(await findArgusFaceMatch(photo), { status: 'exact_file', record });
  rows.push({ id: 'other', status: 'approved' });
  assert.deepEqual(await findArgusFaceMatch(photo), { status: 'ambiguous', checked: 2 });
  rows = [{ id: record.id, status: 'rejected' }];
  assert.deepEqual(await findArgusFaceMatch(photo), { status: 'rejected_photo' });
});

test('face lookup requires admin authorization before comparing or returning a record', async t => {
  const oldToken = process.env.ADMIN_API_TOKEN;
  const token = 't'.repeat(32);
  process.env.ADMIN_API_TOKEN = token;
  t.after(() => { if (oldToken === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = oldToken; });
  let comparisons = 0;
  const router = createSharedDatabaseRouter(undefined, async () => { comparisons++; return { status: 'empty' }; });
  const send = (authorization, photo) => new Promise((resolve, reject) => {
    let status = 200;
    const res = { set() {}, status(value) { status = value; return this; }, json(body) { resolve({ status, body }); } };
    router({ method: 'POST', url: '/face-match', body: { photo }, get: () => authorization }, res,
      error => reject(error || new Error('No route matched')));
  });
  const photo = 'data:image/jpeg;base64,/9j/';
  assert.equal((await send('Bearer wrong', photo)).status, 401);
  assert.equal((await send(`Bearer ${token}`, 'invalid')).status, 400);
  assert.equal(comparisons, 0);
  assert.deepEqual(await send(`Bearer ${token}`, photo), { status: 200, body: { status: 'empty' } });
  assert.equal(comparisons, 1);
});
