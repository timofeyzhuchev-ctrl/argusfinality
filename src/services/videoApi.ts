import type { VideoSmokingAnalysis } from '../types/videoSmoking';

/** Отправляет видеофайл целиком на /api/analyze-video (без base64) и возвращает эпизоды курения. */
export async function analyzeVideoSmoking(file: File, signal?: AbortSignal): Promise<VideoSmokingAnalysis> {
  let response: Response;
  try {
    response = await fetch('/api/analyze-video', {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'video/mp4',
        'X-File-Name': encodeURIComponent(file.name),
      },
      body: file,
      signal,
    });
  } catch (error) {
    if ((error as any)?.name === 'AbortError') throw error;
    throw new Error('Не удалось отправить видео на сервер. Проверьте соединение и что сервис запущен.');
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Сервер вернул некорректный ответ (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Ошибка анализа видео: HTTP ${response.status}.`);
  }
  if (!data || !Array.isArray(data.events) || typeof data.summary !== 'string') {
    throw new Error('Сервер вернул данные анализа видео неожиданного формата.');
  }
  return data as VideoSmokingAnalysis;
}
