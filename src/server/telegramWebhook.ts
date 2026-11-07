import express from 'express';
import { timingSafeEqual } from 'node:crypto';

export const telegramWebhookPath = '/api/telegram/webhook';
export type TelegramWebhookConfig = { url: string; secret: string };

export function readTelegramWebhookConfig(env: NodeJS.ProcessEnv): TelegramWebhookConfig | undefined {
  const url = env.TELEGRAM_WEBHOOK_URL?.trim();
  const secret = env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!url && !secret) return undefined;
  if (!url || !secret || !/^[A-Za-z0-9_-]{32,256}$/.test(secret)) {
    throw new Error('Для webhook задайте TELEGRAM_WEBHOOK_URL и TELEGRAM_WEBHOOK_SECRET (32–256 символов: буквы A–Z, цифры, _ и -).');
  }
  const endpoint = URL.parse(url);
  if (!endpoint || endpoint.protocol !== 'https:' || endpoint.pathname !== telegramWebhookPath ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error(`TELEGRAM_WEBHOOK_URL должен быть HTTPS-адресом с путём ${telegramWebhookPath}.`);
  }
  return { url: endpoint.href, secret };
}

export function createTelegramWebhookRouter(secret: string, enqueue: (update: any) => boolean) {
  const router = express.Router();
  const expected = Buffer.from(secret);
  const seen = new Map<number, number>();
  router.post('/', (req, res, next) => {
    const supplied = Buffer.from(req.get('X-Telegram-Bot-Api-Secret-Token') || '');
    if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) {
      res.sendStatus(403);
      return;
    }
    next();
  }, express.json({ limit: '256kb' }), (req, res) => {
    const updateId = req.body?.update_id;
    if (!Number.isSafeInteger(updateId)) { res.sendStatus(400); return; }

    const now = Date.now();
    for (const [id, until] of seen) {
      if (until > now) break;
      seen.delete(id);
    }
    if (seen.has(updateId)) { res.sendStatus(200); return; }
    // Acknowledge once accepted. Leave rejected updates available for Telegram's retry.
    if (!enqueue(req.body)) { res.sendStatus(503); return; }
    if (seen.size >= 2048) seen.delete(seen.keys().next().value!);
    seen.set(updateId, now + 86_400_000);
    res.sendStatus(200);
  });
  return router;
}
