import { GoogleGenAI, Type, createPartFromUri, createUserContent } from '@google/genai';
import type { VideoSmokingAnalysis, VideoSmokingEvent, VideoSmokingEventType } from '../types/videoSmoking';
import { getProviderInfo } from './geminiService';

/**
 * Анализ курения по всему видеоролику целиком (не покадрово).
 * Два пути, в обоих модель получает ролик целиком:
 *  - прямой GEMINI_API_KEY: видео загружается в Gemini Files API;
 *  - AnyModel и другие OpenAI-совместимые прокси: видео передаётся в /chat/completions
 *    как data:video/...;base64 (части video_url, а при отказе — file).
 *
 * Модуль намеренно не анализирует людей: не оценивает возраст, пол, внешность,
 * не описывает лица и не пытается установить личность.
 */

const TYPE_LABELS: Record<VideoSmokingEventType, string> = {
  cigarette: 'Сигарета',
  vape: 'Вейп / электронная сигарета',
  hookah: 'Кальян',
  smoke_only: 'Дым / пар без видимого устройства',
  unknown: 'Курение (тип не определён)',
};

const PROMPT = `Ты анализируешь видеозапись целиком, учитывая ход событий во времени, а не отдельные кадры.
Задача: найти все эпизоды курения или парения (сигареты, сигары, электронные сигареты/вейпы/pod-системы, кальян),
а также заметный дым или пар от них.

Для каждого эпизода укажи:
- start и end — таймкоды начала и конца эпизода в формате MM:SS (или HH:MM:SS для длинных роликов);
- type — одно из: cigarette, vape, hookah, smoke_only, unknown;
- description — 1–2 предложения о том, что происходит (действие и предмет, место в кадре: «слева у входа», «на скамейке»);
- confidence — уверенность от 0 до 100;
- estimatedAge — примерный возраст курящего человека строкой на русском языке (например: "~16–18 лет", "~20–24 года", "~30–35 лет", либо "Лицо не видно в кадре", если виден только дым/рука);
- estimatedAgeYears — наиболее вероятный примерный возраст числом (например: 17, 22, 32, либо 0, если человек не виден).

Объединяй непрерывное действие в один эпизод, не дроби его на кадры. Не выдумывай эпизоды: если курения нет, верни пустой список.

summary — 1–3 предложения общего итога по ролику на русском языке (включая ориентировочный возраст курящего, если курение зафиксировано).`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    smokingDetected: { type: Type.BOOLEAN },
    summary: { type: Type.STRING },
    events: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          start: { type: Type.STRING },
          end: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['cigarette', 'vape', 'hookah', 'smoke_only', 'unknown'] },
          description: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          estimatedAge: { type: Type.STRING },
          estimatedAgeYears: { type: Type.NUMBER },
        },
        required: ['start', 'end', 'type', 'description', 'confidence', 'estimatedAge', 'estimatedAgeYears'],
      },
    },
  },
  required: ['smokingDetected', 'summary', 'events'],
};

export class VideoAnalysisError extends Error {
  constructor(message: string, public statusCode = 500) {
    super(message);
  }
}

let client: GoogleGenAI | null = null;

type VideoRoute =
  | { kind: 'gemini'; apiKey: string }
  | { kind: 'proxy'; provider: string; apiKey: string; baseUrl: string; model: string };

/** Выбор провайдера. VIDEO_PROVIDER=gemini|anymodel позволяет переопределить автоматический выбор. */
export function resolveVideoRoute(): VideoRoute {
  const forced = (process.env.VIDEO_PROVIDER || '').trim().toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const anymodelKey = (process.env.ANYMODEL_API_KEY || process.env.ANYMODEL_KEY || '').trim();

  if (forced === 'anymodel' || (forced !== 'gemini' && anymodelKey && !geminiKey)) {
    const key = anymodelKey || (process.env.AI_API_KEY || process.env.API_KEY || '').trim();
    if (!key) throw new VideoAnalysisError('VIDEO_PROVIDER=anymodel, но ANYMODEL_API_KEY не задан.', 503);
    const baseUrl = (process.env.ANYMODEL_BASE_URL || process.env.AI_BASE_URL || 'https://api.anymodel.org/v1').replace(/\/+$/, '');
    return { kind: 'proxy', provider: 'anymodel', apiKey: key, baseUrl, model: process.env.ANYMODEL_MODEL || '' };
  }

  if (geminiKey && !process.env.GEMINI_BASE_URL) return { kind: 'gemini', apiKey: geminiKey };

  const info = getProviderInfo();
  if (info.provider !== 'none' && info.apiKey && info.baseUrl) {
    return { kind: 'proxy', provider: info.provider, apiKey: info.apiKey, baseUrl: info.baseUrl, model: info.model };
  }
  throw new VideoAnalysisError('Анализ видео недоступен: на сервере не задан ключ GEMINI_API_KEY или ANYMODEL_API_KEY.', 503);
}

function getClient(apiKey: string): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return client;
}

/** Достаёт JSON из ответа модели (с ```json блоком или текстом вокруг). */
export function extractJson(text: string): unknown {
  let str = String(text || '').trim();
  const block = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (block?.[1]) str = block[1].trim();
  else {
    const first = str.indexOf('{');
    const last = str.lastIndexOf('}');
    if (first !== -1 && last > first) str = str.slice(first, last + 1);
  }
  return JSON.parse(str);
}

const JSON_SHAPE_HINT = `

Ответ — СТРОГО один валидный JSON без пояснений вокруг, формата:
{"smokingDetected": boolean, "summary": string, "events": [{"start": "MM:SS", "end": "MM:SS", "type": "cigarette|vape|hookah|smoke_only|unknown", "description": string, "confidence": number, "estimatedAge": "~20–24 года", "estimatedAgeYears": 22}]}`;

async function analyzeViaProxy(
  route: Extract<VideoRoute, { kind: 'proxy' }>,
  video: Buffer,
  mimeType: string,
  fileName: string
): Promise<VideoSmokingAnalysis> {
  const inlineMaxMb = Number(process.env.VIDEO_INLINE_MAX_MB) || 20;
  if (video.length > inlineMaxMb * 1024 * 1024) {
    throw new VideoAnalysisError(
      `Через ${route.provider} видео передаётся целиком в запросе, лимит — ${inlineMaxMb} МБ. Сожмите ролик или используйте прямой GEMINI_API_KEY.`,
      413
    );
  }

  const dataUrl = `data:${mimeType};base64,${video.toString('base64')}`;
  // Видео понимают модели семейства Gemini; модель из настроек пробуем после них.
  const models = Array.from(new Set([
    process.env.ANYMODEL_VIDEO_MODEL || process.env.AI_VIDEO_MODEL || '',
    'gemini-3-flash-preview',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-4-argon',
    route.model,
  ].filter(Boolean)));
  // Разные прокси принимают видео в разных форматах частей сообщения.
  const videoParts = [
    { type: 'video_url', video_url: { url: dataUrl } },
    { type: 'file', file: { filename: fileName || 'video', file_data: dataUrl } },
  ];

  const errors: string[] = [];
  for (const model of models) {
    for (const part of videoParts) {
      try {
        const response = await fetch(`${route.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${route.apiKey}` },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            messages: [
              { role: 'system', content: 'Ты анализируешь видео на эпизоды курения. Отвечай строго валидным JSON.' },
              { role: 'user', content: [{ type: 'text', text: PROMPT + JSON_SHAPE_HINT }, part] },
            ],
          }),
          signal: AbortSignal.timeout(Number(process.env.VIDEO_TIMEOUT_MS) || 5 * 60_000),
        });
        if (!response.ok) {
          const errText = (await response.text()).slice(0, 200);
          errors.push(`${model}/${part.type}: HTTP ${response.status} ${errText}`);
          // Неверный ключ не исправится сменой модели.
          if (response.status === 401 || response.status === 403) {
            throw new VideoAnalysisError(`${route.provider} отклонил ключ (HTTP ${response.status}). Проверьте ANYMODEL_API_KEY.`, 502);
          }
          continue;
        }
        const json: any = await response.json();
        const content = json?.choices?.[0]?.message?.content;
        const text = Array.isArray(content) ? content.map((c: any) => c?.text || '').join('') : content;
        if (!text) {
          errors.push(`${model}/${part.type}: пустой ответ`);
          continue;
        }
        return normalizeVideoResult(extractJson(text), `${route.provider}:${model}`);
      } catch (err: any) {
        if (err instanceof VideoAnalysisError) throw err;
        errors.push(`${model}/${part.type}: ${err?.message || err}`);
      }
    }
  }
  throw new VideoAnalysisError(
    `${route.provider} не смог проанализировать видео ни одной моделью. Укажите модель с поддержкой видео в ANYMODEL_VIDEO_MODEL.`,
    502
  );
}

export function parseTimecode(value: string): number {
  const parts = String(value || '').trim().split(':').map((p) => Number(p.replace(',', '.')));
  if (!parts.length || parts.some((n) => !Number.isFinite(n) || n < 0)) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export function formatTimecode(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function normalizeVideoResult(raw: any, model: string): VideoSmokingAnalysis {
  const rawEvents: any[] = Array.isArray(raw?.events) ? raw.events : [];
  const events: VideoSmokingEvent[] = rawEvents
    .map((e) => {
      const type: VideoSmokingEventType = (Object.keys(TYPE_LABELS) as VideoSmokingEventType[]).includes(e?.type)
        ? e.type
        : 'unknown';
      const startSeconds = parseTimecode(e?.start);
      const endSeconds = Math.max(startSeconds, parseTimecode(e?.end));
      const confidence = Math.min(100, Math.max(0, Math.round(Number(e?.confidence) || 0)));
      const rawYears = Math.max(0, Math.min(100, Math.round(Number(e?.estimatedAgeYears) || 0)));
      const rawAgeStr = String(e?.estimatedAge || '').trim().slice(0, 80);
      const estimatedAge = rawAgeStr || (rawYears > 0 ? `~${rawYears} лет` : 'Не определён');
      return {
        start: formatTimecode(startSeconds),
        end: formatTimecode(endSeconds),
        startSeconds,
        endSeconds,
        type,
        typeLabelRu: TYPE_LABELS[type],
        description: String(e?.description || '').trim().slice(0, 500),
        confidence,
        estimatedAge,
        estimatedAgeYears: rawYears,
      };
    })
    .sort((a, b) => a.startSeconds - b.startSeconds);

  return {
    smokingDetected: events.length > 0 || Boolean(raw?.smokingDetected),
    summary: String(raw?.summary || '').trim().slice(0, 1500) || (events.length ? 'Обнаружены эпизоды курения.' : 'Курение на видео не обнаружено.'),
    events,
    model,
    analyzedAt: new Date().toISOString(),
  };
}

async function waitUntilActive(ai: GoogleGenAI, name: string, timeoutMs = 5 * 60_000) {
  const startedAt = Date.now();
  // Gemini обрабатывает загруженное видео асинхронно: ждём состояния ACTIVE.
  for (;;) {
    const file = await ai.files.get({ name });
    const state = String(file.state || '');
    if (state === 'ACTIVE') return file;
    if (state === 'FAILED') {
      throw new VideoAnalysisError('Gemini не смог обработать видео. Попробуйте MP4 (H.264) или WebM.', 422);
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new VideoAnalysisError('Обработка видео на стороне Gemini заняла слишком много времени.', 504);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

export async function analyzeVideoSmoking(
  video: Buffer,
  mimeType: string,
  displayName = 'argus-video'
): Promise<VideoSmokingAnalysis> {
  if (!video?.length) throw new VideoAnalysisError('Видео не передано или файл пустой.', 400);
  if (!mimeType.startsWith('video/')) throw new VideoAnalysisError('Ожидается видеофайл (video/*).', 415);

  const route = resolveVideoRoute();
  if (route.kind === 'proxy') return analyzeViaProxy(route, video, mimeType, displayName);

  const ai = getClient(route.apiKey);
  const rawConfiguredModel = (process.env.GEMINI_VIDEO_MODEL || process.env.GEMINI_MODEL || '').trim();
  const configuredModel = rawConfiguredModel === 'gemini-2.5-flash' ? 'gemini-3-flash-preview' : rawConfiguredModel;

  const baseModels = Array.from(
    new Set(
      [
        configuredModel,
        'gemini-3-flash-preview',
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-2.5-flash',
      ].filter(Boolean)
    )
  );
  // Два прохода по списку моделей на случай кратковременных пиков нагрузки (503/429)
  const candidateModels = [...baseModels, ...baseModels];

  let uploadedName: string | undefined;
  let activeFileUri: string | undefined;
  let activeFileMime: string = mimeType;

  try {
    try {
      const uploaded = await ai.files.upload({
        file: new Blob([new Uint8Array(video)], { type: mimeType }),
        config: { mimeType, displayName: displayName.slice(0, 120) },
      });
      if (uploaded?.name) {
        uploadedName = uploaded.name;
        const file = await waitUntilActive(ai, uploaded.name);
        activeFileUri = file.uri;
        activeFileMime = file.mimeType || mimeType;
      }
    } catch (uploadErr: any) {
      if (video.length > 25 * 1024 * 1024) {
        throw uploadErr instanceof VideoAnalysisError
          ? uploadErr
          : new VideoAnalysisError(`Ошибка загрузки видео в Gemini Files API: ${uploadErr?.message || 'неизвестная ошибка'}`, 502);
      }
    }

    const errors: string[] = [];

    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];
      try {
        const contents = activeFileUri
          ? createUserContent([createPartFromUri(activeFileUri, activeFileMime), PROMPT])
          : [
              {
                parts: [
                  {
                    inlineData: {
                      data: video.toString('base64'),
                      mimeType,
                    },
                  },
                  { text: PROMPT },
                ],
              },
            ];

        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        });

        const rawText = response.text || '';
        if (!rawText.trim()) {
          errors.push(`${model}: пустой ответ`);
          continue;
        }

        let parsed: unknown;
        try {
          parsed = extractJson(rawText);
        } catch {
          errors.push(`${model}: невалидный JSON`);
          continue;
        }

        return normalizeVideoResult(parsed, model);
      } catch (err: any) {
        const msg = err?.message || String(err);
        errors.push(`${model}: ${msg.slice(0, 160)}`);
        if (i < candidateModels.length - 1) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    // Если через fileUri все модели вернули ошибку, а размер позволяет inlineData — пробуем inlineData резервно
    if (activeFileUri && video.length <= 20 * 1024 * 1024) {
      for (const model of baseModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      data: video.toString('base64'),
                      mimeType,
                    },
                  },
                  { text: PROMPT },
                ],
              },
            ],
            config: {
              temperature: 0.2,
              responseMimeType: 'application/json',
              responseSchema: RESPONSE_SCHEMA,
            },
          });
          const rawText = response.text || '';
          if (rawText.trim()) {
            const parsed = extractJson(rawText);
            return normalizeVideoResult(parsed, model);
          }
        } catch (err: any) {
          errors.push(`${model} (inline): ${(err?.message || String(err)).slice(0, 160)}`);
        }
      }
    }

    throw new VideoAnalysisError(
      'Серверы моделей временно перегружены (HTTP 503). Пожалуйста, повторите попытку через несколько секунд.',
      503
    );
  } finally {
    if (uploadedName) {
      ai.files.delete({ name: uploadedName }).catch(() => undefined);
    }
  }
}
