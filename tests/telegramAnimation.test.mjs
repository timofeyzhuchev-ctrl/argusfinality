import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startProcessingAnimation } from '../src/server/telegramAnimation.ts';

test('animation upload does not block and late arrival is removed once', async () => {
  let resolve;
  const removed = [];
  const animation = startProcessingAnimation(() => new Promise(done => { resolve = done; }), async id => removed.push(id));
  await Promise.resolve();
  const disposal = animation.dispose();
  assert.deepEqual(removed, []);
  resolve(15);
  await disposal; await animation.dispose();
  assert.deepEqual(removed, [15]);
});
test('failed upload or deletion does not reject cleanup', async () => {
  const failed = startProcessingAnimation(async () => { throw new Error('offline'); }, async () => assert.fail('no message'));
  await Promise.resolve(); await failed.dispose();
  const animation = startProcessingAnimation(async () => 1, async () => { throw new Error('offline'); });
  await Promise.resolve(); await animation.dispose();
});
test('already completed job does not send a new animation', async () => {
  const animation = startProcessingAnimation(async () => assert.fail('late upload'), async () => assert.fail('no message'));
  await animation.dispose();
});
