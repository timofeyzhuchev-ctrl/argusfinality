import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { extractFaceEmbedding, FaceEngineError } from '../src/server/faceEngine.ts';

test('unsupported formats and oversized inputs are rejected without inference', async () => {
  assert.deepEqual(await extractFaceEmbedding(Buffer.alloc(0)), { status: 'invalid_image' });
  assert.deepEqual(await extractFaceEmbedding(Buffer.from('<svg/>')), { status: 'invalid_image' });
  const oversized = Buffer.alloc(12 * 1024 * 1024 + 1);
  oversized.set([0xff, 0xd8, 0xff]);
  assert.deepEqual(await extractFaceEmbedding(oversized), { status: 'invalid_image' });
});

test('a missing inference runtime is unavailable rather than a negative match', async () => {
  const previous = process.env.ARGUS_FACE_PYTHON;
  process.env.ARGUS_FACE_PYTHON = fileURLToPath(new URL('./does-not-exist/python', import.meta.url));
  try {
    await assert.rejects(extractFaceEmbedding(Buffer.from([0xff, 0xd8, 0xff, 0xd9])),
      error => error instanceof FaceEngineError && error.code === 'unavailable');
  } finally {
    if (previous === undefined) delete process.env.ARGUS_FACE_PYTHON;
    else process.env.ARGUS_FACE_PYTHON = previous;
  }
});
