import { Router, type Request, type Response, type NextFunction } from 'express';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import pg from 'pg';
import type { ArgusFaceMatch, ArgusFaceRecord } from '../types/argusFaceMatch';

// A separate, opt-in store. Nothing is exposed until its router is mounted.
const { Pool } = pg;
let pool: pg.Pool | undefined;
let initialization: Promise<void> | undefined;
function database(): pg.Pool {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL is not configured');
  return pool ??= new Pool({ connectionString: url, max: 5 });
}
async function ready(): Promise<pg.Pool> {
  const db = database();
  initialization ??= db.query(`CREATE TABLE IF NOT EXISTS argus_shared_records (
    id uuid PRIMARY KEY, full_name text NOT NULL, birth_date date NOT NULL,
    school_or_org text NOT NULL DEFAULT '', vk_url text NOT NULL DEFAULT '',
    photo_data text NOT NULL, status text NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved')),
    created_at timestamptz NOT NULL DEFAULT now(), rejected_at timestamptz
  );
  ALTER TABLE argus_shared_records ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
    ADD COLUMN IF NOT EXISTS face_embedding jsonb,
    ADD COLUMN IF NOT EXISTS face_embedding_version text;`)
    .then(() => undefined).catch(error => { initialization = undefined; throw error; });
  await initialization;
  return db;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const configured = process.env.ADMIN_API_TOKEN || '';
  const supplied = req.get('authorization')?.replace(/^Bearer /i, '') || '';
  const expectedBytes = Buffer.from(configured);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length < 32 || expectedBytes.length !== suppliedBytes.length ||
      !timingSafeEqual(expectedBytes, suppliedBytes)) {
    return res.status(401).json({ error: 'Доступ запрещён' });
  }
  next();
}

const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length <= max ? value.trim() : null;
export async function submitSharedRecord(input: any, submissionId: string = randomUUID()): Promise<string | undefined> {
  if (!process.env.ADMIN_API_TOKEN || Buffer.byteLength(process.env.ADMIN_API_TOKEN) < 32)
    throw new Error('Общая база ещё не настроена.');
  const name = text(input?.fullName, 160);
  const birth = text(input?.birthDate, 10);
  const org = text(input?.schoolOrOrg ?? '', 200);
  const vk = text(input?.vkUrl ?? '', 500);
  const photo = input?.photoUrl;
  if (!name || !birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth) ||
      Number.isNaN(Date.parse(`${birth}T00:00:00Z`)) || new Date(`${birth}T00:00:00Z`).toISOString().slice(0, 10) !== birth || birth > new Date().toISOString().slice(0, 10) ||
      org === null || vk === null || typeof photo !== 'string' || photo.length > 2_800_000 ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)) {
    throw new SharedRecordValidationError('Проверьте данные и изображение (JPEG, PNG или WebP до 2 МБ).');
  }
  const db = await ready();
  const result = await db.query('INSERT INTO argus_shared_records (id, full_name, birth_date, school_or_org, vk_url, photo_data) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING',
    [submissionId, name, birth, org, vk, photo]);
  return result.rowCount === 1 ? submissionId : undefined;
}
class SharedRecordValidationError extends Error {}

export async function reviewPendingRecord(id: string, decision: 'approve' | 'reject'): Promise<boolean> {
  const db = await ready();
  const statement = decision === 'approve'
    ? "UPDATE argus_shared_records SET status = 'approved' WHERE id = $1 AND status = 'pending' AND rejected_at IS NULL"
    : "UPDATE argus_shared_records SET rejected_at = now() WHERE id = $1 AND status = 'pending' AND rejected_at IS NULL";
  const result = await db.query(statement, [id]);
  return result.rowCount === 1;
}

export const approvedFaceRecords = {
  async list(version: string, limit: number): Promise<{ id: string; embedding: unknown }[]> {
    const result = await (await ready()).query(`SELECT id,
      CASE WHEN face_embedding_version = $1 THEN face_embedding END AS embedding
      FROM argus_shared_records WHERE status = 'approved' AND rejected_at IS NULL
      ORDER BY id LIMIT $2`, [version, limit]);
    return result.rows;
  },
  async photo(id: string): Promise<string | undefined> {
    const result = await (await ready()).query(`SELECT photo_data FROM argus_shared_records
      WHERE id = $1 AND status = 'approved' AND rejected_at IS NULL`, [id]);
    return result.rows[0]?.photo_data;
  },
  async saveEmbedding(id: string, version: string, embedding: number[]): Promise<void> {
    await (await ready()).query(`UPDATE argus_shared_records SET face_embedding_version = $2, face_embedding = $3::jsonb
      WHERE id = $1 AND status = 'approved' AND rejected_at IS NULL`, [id, version, JSON.stringify(embedding)]);
  },
  async record(id: string): Promise<ArgusFaceRecord | undefined> {
    const result = await (await ready()).query(`SELECT id, full_name AS "fullName", to_char(birth_date, 'YYYY-MM-DD') AS "birthDate",
      school_or_org AS "schoolOrOrg", vk_url AS "vkUrl" FROM argus_shared_records
      WHERE id = $1 AND status = 'approved' AND rejected_at IS NULL`, [id]);
    return result.rows[0];
  },
};

export function createSharedDatabaseRouter(onNewRecord?: (id: string) => void,
  compareFace?: (photo: Buffer) => Promise<ArgusFaceMatch>): Router {
  const router = Router();
  // Global fixed-window limits also work behind reverse proxies without trusting
  // arbitrary X-Forwarded-For headers. They reset on service restart.
  let postWindow = 0, postCount = 0, authWindow = 0, authCount = 0;
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!process.env.ADMIN_API_TOKEN || Buffer.byteLength(process.env.ADMIN_API_TOKEN) < 32)
      return res.status(503).json({ error: 'Общая база ещё не настроена.' });
    const now = Date.now();
    if (req.method === 'POST' && req.path !== '/face-match') {
      if (now - postWindow >= 600_000) { postWindow = now; postCount = 0; }
      if (++postCount > 20) return res.status(429).json({ error: 'Слишком много запросов. Попробуйте позже.' });
    } else {
      if (now - authWindow >= 600_000) { authWindow = now; authCount = 0; }
      if (++authCount > 100) return res.status(429).json({ error: 'Слишком много запросов. Попробуйте позже.' });
    }
    next();
  });
  router.post('/records', async (req, res) => {
    try {
      const id = await submitSharedRecord(req.body);
      if (id && onNewRecord) {
        void Promise.resolve().then(() => onNewRecord(id)).catch(() => console.error('[Argus] New record notification failed'));
      }
      return res.status(201).json({ status: 'pending' });
    } catch (error) {
      if (error instanceof SharedRecordValidationError) return res.status(400).json({ error: error.message });
      return res.status(503).json({ error: 'База временно недоступна.' });
    }
  });
  router.get('/records', requireAdmin, async (_req, res) => {
    try {
      const db = await ready();
      const result = await db.query(`SELECT id, full_name AS "fullName", to_char(birth_date, 'YYYY-MM-DD') AS "birthDate",
        school_or_org AS "schoolOrOrg", vk_url AS "vkUrl", photo_data AS "photoUrl",
        CASE WHEN rejected_at IS NOT NULL THEN 'rejected' ELSE status END AS status,
        created_at AS "registeredAt" FROM argus_shared_records ORDER BY created_at DESC LIMIT 100`);
      res.set('Cache-Control', 'no-store');
      return res.json({ records: result.rows });
    } catch { return res.status(503).json({ error: 'База временно недоступна.' }); }
  });
  if (compareFace) router.post('/face-match', requireAdmin, async (req, res) => {
    const photo = req.body?.photo;
    if (typeof photo !== 'string' || photo.length > 2_800_000 ||
        !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)) {
      res.status(400).json({ error: 'Выберите JPEG, PNG или WebP до 2 МБ.' });
      return;
    }
    try { res.json(await compareFace(Buffer.from(photo.split(',')[1], 'base64'))); }
    catch { res.status(503).json({ error: 'Сверка временно недоступна.' }); }
  });
  router.patch('/records/:id/approve', requireAdmin, async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.sendStatus(400);
    try {
      return res.sendStatus(await reviewPendingRecord(req.params.id, 'approve') ? 204 : 404);
    } catch { return res.sendStatus(503); }
  });
  router.delete('/records/:id', requireAdmin, async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.sendStatus(400);
    try {
      const result = await (await ready()).query('DELETE FROM argus_shared_records WHERE id = $1', [req.params.id]);
      return res.sendStatus(result.rowCount ? 204 : 404);
    } catch { return res.sendStatus(503); }
  });
  return router;
}
