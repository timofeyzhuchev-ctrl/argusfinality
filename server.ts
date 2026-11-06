import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { processArgusImage, getProviderInfo } from './src/server/geminiService';
import { analyzeVideoSmoking, VideoAnalysisError } from './src/server/videoSmokingService';
import { createSharedDatabaseRouter } from './src/server/sharedDatabase';
import { startTelegramBot } from './src/server/telegramBot';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Bound the shared registry request body independently of the analysis API.
  app.use('/api/shared', express.json({ limit: '3mb' }), createSharedDatabaseRouter());

  // 50mb limit for high resolution base64 surveillance photos
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.post('/api/analyze', async (req, res) => {
    try {
      const { image, mimeType, searchMode, registeredCandidates } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Изображение не предоставлено' });
      }

      const result = await processArgusImage(
        image,
        mimeType || 'image/jpeg',
        searchMode === 'standard' ? 'standard' : 'database',
        registeredCandidates
      );
      return res.json(result);
    } catch (err: any) {
      console.error('Error in /api/analyze:', err);
      return res.status(500).json({ 
        error: err.message || 'Ошибка обработки изображения нейросетью' 
      });
    }
  });

  // Анализ курения по всему видео. Тело запроса — сам видеофайл (бинарный), без base64.
  const VIDEO_MAX_MB = Number(process.env.VIDEO_MAX_MB) || 100;
  app.post(
    '/api/analyze-video',
    express.raw({ type: () => true, limit: `${VIDEO_MAX_MB}mb` }),
    async (req, res) => {
      try {
        const mimeType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        const rawName = String(req.headers['x-file-name'] || 'argus-video');
        let fileName = rawName;
        try { fileName = decodeURIComponent(rawName); } catch { /* keep raw */ }
        const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
        const result = await analyzeVideoSmoking(body, mimeType, fileName);
        return res.json(result);
      } catch (err: any) {
        console.error('Error in /api/analyze-video:', err);
        const status = err instanceof VideoAnalysisError ? err.statusCode : 500;
        const detail = err?.message ? `: ${String(err.message).slice(0, 240)}` : '';
        return res.status(status).json({
          error: err instanceof VideoAnalysisError ? err.message : `Ошибка анализа видео нейросетью${detail}`,
        });
      }
    }
  );

  // Health check exposes configuration status only, never upstream URLs or model details.
  app.get('/api/health', (_req, res) => {
    const providerInfo = getProviderInfo();
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      apiConfigured: providerInfo.provider !== 'none',
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
  });

  // Direct download endpoint for GitHub/Render upload archive (with cache busting)
  app.get(['/download/argus-ai.zip', '/download/argus-ai-v3.zip'], (_req, res) => {
    const zipPath = path.resolve(__dirname, 'public/assets/aistudio/argus-ai-v3.zip');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.download(zipPath, 'argus-ai-v3.zip');
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Development with Vite middlewares or production static serve
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true' ? { server: httpServer } : false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);

    const statusCode = Number(err?.status || err?.statusCode || 500);
    if (req.path.startsWith('/api/')) {
      const message = statusCode === 413
        ? (req.path.startsWith('/api/analyze-video')
          ? `Видео больше допустимых ${Number(process.env.VIDEO_MAX_MB) || 100} МБ.`
          : 'Размер запроса превышает допустимые 50 МБ.')
        : statusCode === 400
          ? 'Некорректный JSON в запросе.'
          : 'Внутренняя ошибка API. Подробности доступны в логах сервера.';
      return res.status(statusCode).json({ error: message });
    }

    console.error('[ARGUS-AI] Unhandled server error:', err);
    return res.status(statusCode).send('Internal Server Error');
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[ARGUS-AI] Сервер запущен на http://0.0.0.0:${PORT}`);
    if (process.env.TELEGRAM_BOT_TOKEN?.trim()) startTelegramBot(process.env.TELEGRAM_BOT_TOKEN.trim());
  });
}

startServer().catch((err) => {
  console.error('[ARGUS-AI] Критическая ошибка запуска сервера:', err);
});
