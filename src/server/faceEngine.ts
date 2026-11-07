import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const FACE_ENGINE_VERSION = 'yunet-2023mar+sface-2021dec-v1';
export type FaceExtraction =
  | { status: 'ok'; embedding: number[] }
  | { status: 'invalid_image' | 'no_face' | 'multiple_faces' | 'poor_quality' };

export class FaceEngineError extends Error {
  constructor(readonly code: 'busy' | 'unavailable') {
    super(code === 'busy' ? 'Face engine is busy' : 'Face engine is unavailable');
    this.name = 'FaceEngineError';
  }
}

const WORKER = fileURLToPath(new URL('../../scripts/face_worker.py', import.meta.url));
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;
let queued = 0;
let tail: Promise<unknown> = Promise.resolve();

function supportedImage(image: Buffer): boolean {
  return (image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff)
    || image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || (image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP');
}

function parseExtraction(output: string): FaceExtraction {
  const data = JSON.parse(output);
  if (data?.status === 'ok' && Array.isArray(data.embedding) && data.embedding.length === 128
      && data.embedding.every((value: unknown) => typeof value === 'number' && Number.isFinite(value))
      && Math.abs(Math.hypot(...data.embedding) - 1) < 0.001) {
    return { status: 'ok', embedding: data.embedding };
  }
  if (['invalid_image', 'no_face', 'multiple_faces', 'poor_quality'].includes(data?.status)) {
    return { status: data.status };
  }
  throw new FaceEngineError('unavailable');
}

function runWorker(image: Buffer, timeout: number): Promise<FaceExtraction> {
  return new Promise((resolve, reject) => {
    const python = process.env.ARGUS_FACE_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    // Keep service credentials out of the worker environment and out of logs.
    const child = execFile(python, ['-I', '-B', WORKER], {
      windowsHide: true,
      timeout,
      killSignal: 'SIGKILL',
      maxBuffer: 128 * 1024,
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
      },
    }, (error, stdout) => {
      if (error) { reject(new FaceEngineError('unavailable')); return; }
      try { resolve(parseExtraction(stdout)); }
      catch { reject(new FaceEngineError('unavailable')); }
    });
    child.stdin?.on('error', () => { /* The exit handler handles a closed worker. */ });
    child.stdin?.end(image);
  });
}

/** Only one OpenCV subprocess runs at a time on the shared Free service. */
export async function extractFaceEmbedding(image: Buffer): Promise<FaceExtraction> {
  if (!image.length || image.length > MAX_IMAGE_BYTES || !supportedImage(image)) {
    return { status: 'invalid_image' };
  }
  if (queued >= 3) throw new FaceEngineError('busy');
  queued++;
  const deadline = Date.now() + REQUEST_TIMEOUT_MS;
  const result = tail.then(() => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new FaceEngineError('busy');
    return runWorker(image, remaining);
  }).finally(() => { queued--; });
  tail = result.catch(() => undefined);
  return result;
}
