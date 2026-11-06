import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChatDispatcher, createAnalysisSlots } from '../src/server/telegramDispatch.ts';
const flush = () => new Promise(resolve => setImmediate(resolve));

test('one chat is ordered while another chat can respond immediately', async () => {
  const order = [];
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const dispatch = createChatDispatcher(() => assert.fail('unexpected error'));
  dispatch(1, async () => { order.push('1-start'); await blocked; order.push('1-end'); });
  dispatch(1, async () => { order.push('1-next'); });
  dispatch(2, async () => { order.push('2'); });
  await flush();
  assert.deepEqual(order, ['1-start', '2']);
  release(); await flush();
  assert.deepEqual(order, ['1-start', '2', '1-end', '1-next']);
});

test('failed control task does not poison the next task and queue is bounded', async () => {
  let errors = 0, finished = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  const dispatch = createChatDispatcher(() => { errors++; });
  dispatch(1, async () => { await gate; throw new Error('test'); });
  for (let i = 0; i < 4; i++) assert.equal(dispatch(1, async () => { finished++; }), true);
  assert.equal(dispatch(1, async () => {}), false);
  release(); await flush();
  assert.equal(errors, 1); assert.equal(finished, 4);
  assert.equal(dispatch(1, async () => {}), true);
  await flush();
});

test('analyses are bounded and duplicate work for a chat is prevented', () => {
  const slots = createAnalysisSlots(2);
  assert.equal(slots.acquire(1), 'ok');
  assert.equal(slots.acquire(1), 'chat_busy');
  assert.equal(slots.acquire(2), 'ok');
  assert.equal(slots.acquire(3), 'server_busy');
  slots.release(1);
  assert.equal(slots.acquire(3), 'ok');
});
