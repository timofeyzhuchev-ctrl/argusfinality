import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Film, Flame, Loader2, RotateCcw, ScanLine, Sparkles } from 'lucide-react';
import { analyzeVideoSmoking } from '../services/videoApi';
import type { VideoSmokingAnalysis, VideoSmokingEvent } from '../types/videoSmoking';
import type { ImageMetaData } from '../ArgusApp';

interface Props {
  videoUrl: string;
  file: File | null;
  meta: ImageMetaData | null;
  onLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  onPlaybackError: () => void;
  onReset: () => void;
}

const STAGES = ['Загрузка видео на сервер', 'Нейросеть просматривает ролик целиком', 'Поиск эпизодов курения', 'Формирование отчёта'];

function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function VideoAnalysisPanel({ videoUrl, file, meta, onLoadedMetadata, onPlaybackError, onReset }: Props) {
  const videoEl = useRef<HTMLVideoElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [analysis, setAnalysis] = useState<VideoSmokingAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Cancel the request if the panel unmounts (new file or reset).
  useEffect(() => () => abortRef.current?.abort(), []);

  // Progress stages and timer while the whole video is being analysed.
  useEffect(() => {
    if (!isAnalyzing) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const sec = (Date.now() - startedAt) / 1000;
      setElapsed(sec);
      setStage(sec < 3 ? 0 : sec < 12 ? 1 : sec < 25 ? 2 : 3);
    }, 250);
    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  const handleAnalyze = async () => {
    if (!file || isAnalyzing) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setStage(0);
    setElapsed(0);
    try {
      const result = await analyzeVideoSmoking(file, controller.signal);
      if (!controller.signal.aborted) setAnalysis(result);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Не удалось проанализировать видео.');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsAnalyzing(false);
      }
    }
  };

  const seekTo = (seconds: number) => {
    const el = videoEl.current;
    if (!el) return;
    el.currentTime = seconds;
    el.play().catch(() => undefined);
  };

  const timelineLength = Math.max(
    duration,
    ...(analysis?.events.map((e) => e.endSeconds) ?? [0]),
    1
  );

  const activeIndex = useMemo(() => {
    if (!analysis) return -1;
    return analysis.events.findIndex((e) => currentTime >= e.startSeconds && currentTime <= Math.max(e.endSeconds, e.startSeconds + 1));
  }, [analysis, currentTime]);

  const renderEvent = (event: VideoSmokingEvent, index: number) => (
    <li
      key={`${event.startSeconds}-${index}`}
      className={`argus-v-event rounded-lg border p-2.5 text-xs transition-colors ${
        index === activeIndex ? 'argus-v-event-active bg-orange-500/10 border-orange-400/60' : 'bg-[#06142a] border-cyan-500/20'
      }`}
      style={{ animationDelay: `${120 + index * 90}ms` }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <button
          type="button"
          onClick={() => seekTo(event.startSeconds)}
          className="argus-v-timecode px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-100 font-mono hover:bg-cyan-500/30 cursor-pointer"
          title="Перейти к эпизоду"
        >
          ▶ {event.start}–{event.end}
        </button>
        <span className="font-semibold text-white">{event.typeLabelRu}</span>
        {event.estimatedAge && (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/40 text-amber-200 font-medium">
            Примерный возраст: {event.estimatedAge}
          </span>
        )}
        <span className="ml-auto text-cyan-200/60">уверенность {event.confidence}%</span>
      </div>
      <p className="text-cyan-100/80">{event.description}</p>
      <div className="mt-2 h-1 rounded-full bg-cyan-950 overflow-hidden">
        <div className="argus-v-confidence h-full rounded-full" style={{ width: `${event.confidence}%`, animationDelay: `${250 + index * 90}ms` }} />
      </div>
    </li>
  );

  return (
    <section className="argus-v-panel max-w-3xl mx-auto w-full rounded-2xl argus-card p-3 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Film className="w-4 h-4 text-cyan-400" />
          <span>Предпросмотр видео</span>
        </div>
        <span className="text-[11px] text-cyan-200/70 flex items-center gap-1.5">
          <span className={`argus-v-dot ${isAnalyzing ? 'argus-v-dot-busy' : analysis ? 'argus-v-dot-done' : ''}`} />
          {isAnalyzing ? 'Идёт анализ' : analysis ? 'Анализ завершён' : 'Локальное воспроизведение'}
        </span>
      </div>

      <div className={`argus-v-frame relative rounded-xl overflow-hidden ${isAnalyzing ? 'argus-v-frame-busy' : ''} ${analysis?.smokingDetected ? 'argus-v-frame-alert' : ''}`}>
        <video
          ref={videoEl}
          src={videoUrl}
          controls
          preload="metadata"
          playsInline
          className="block w-full max-h-[min(65vh,560px)] bg-black object-contain"
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration || 0);
            onLoadedMetadata(e);
          }}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onError={onPlaybackError}
        />
        <span className="argus-v-corner argus-v-corner-tl" />
        <span className="argus-v-corner argus-v-corner-tr" />
        <span className="argus-v-corner argus-v-corner-bl" />
        <span className="argus-v-corner argus-v-corner-br" />
        {isAnalyzing && (
          <div className="argus-v-scan pointer-events-none absolute inset-0">
            <div className="argus-v-scanline" />
            <div className="argus-v-grid" />
            <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 border border-cyan-400/40 text-[10px] font-mono text-cyan-200 flex items-center gap-1.5">
              <ScanLine className="w-3 h-3" /> SCAN · {formatClock(elapsed)}
            </div>
          </div>
        )}
      </div>

      {/* Timeline with detected episodes */}
      {(analysis?.events.length ?? 0) > 0 && (
        <div className="argus-v-fade space-y-1">
          <div className="relative h-7 rounded-lg bg-[#06142a] border border-cyan-500/25 overflow-hidden">
            {analysis!.events.map((event, index) => (
              <button
                key={`seg-${index}`}
                type="button"
                onClick={() => seekTo(event.startSeconds)}
                title={`${event.start}–${event.end}: ${event.typeLabelRu}`}
                className={`argus-v-segment absolute top-1 bottom-1 rounded cursor-pointer ${index === activeIndex ? 'argus-v-segment-active' : ''}`}
                style={{
                  left: `${(event.startSeconds / timelineLength) * 100}%`,
                  width: `max(6px, ${((Math.max(event.endSeconds - event.startSeconds, 0.5)) / timelineLength) * 100}%)`,
                  animationDelay: `${index * 110}ms`,
                }}
              />
            ))}
            <div className="argus-v-playhead absolute top-0 bottom-0 w-0.5" style={{ left: `${Math.min(100, (currentTime / timelineLength) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-cyan-200/50">
            <span>00:00</span>
            <span>{formatClock(currentTime)}</span>
            <span>{formatClock(timelineLength)}</span>
          </div>
        </div>
      )}

      {meta && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-cyan-100/75">
          <div className="rounded-lg bg-black/20 p-2 break-all">Файл: {meta.name}</div>
          <div className="rounded-lg bg-black/20 p-2">Размер: {(meta.sizeKb / 1024).toFixed(1)} МБ</div>
          <div className="rounded-lg bg-black/20 p-2">Кадр: {meta.width && meta.height ? `${meta.width} × ${meta.height}` : 'загружается'}</div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!file || isAnalyzing}
          className="argus-v-cta relative overflow-hidden w-full sm:w-auto px-4 py-2.5 rounded-xl argus-btn-primary text-xs flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : analysis ? <RotateCcw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          <span>{isAnalyzing ? 'Нейросеть смотрит видео…' : analysis ? 'Повторить анализ' : 'Анализ курения по всему видео'}</span>
        </button>
        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#08192e] hover:bg-[#0d2646] text-cyan-100 font-semibold text-xs border border-cyan-400/35 transition-colors cursor-pointer"
        >
          Выбрать другой файл
        </button>
      </div>

      {isAnalyzing && (
        <div className="argus-v-fade space-y-2">
          <div className="h-1.5 rounded-full bg-cyan-950 overflow-hidden">
            <div className="argus-v-progress h-full w-1/3 rounded-full" />
          </div>
          <ol className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
            {STAGES.map((label, i) => (
              <li
                key={label}
                className={`rounded-md px-2 py-1.5 border transition-all duration-500 ${
                  i < stage ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10'
                    : i === stage ? 'argus-v-stage-active border-cyan-300/60 text-white bg-cyan-500/15'
                    : 'border-cyan-500/15 text-cyan-200/40'
                }`}
              >
                {i < stage ? '✓ ' : ''}{label}
              </li>
            ))}
          </ol>
        </div>
      )}

      {error && (
        <div className="argus-v-shake px-3 py-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-100 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}

      {analysis && (
        <div className="argus-v-result rounded-xl bg-black/25 border border-cyan-500/25 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {analysis.smokingDetected
              ? <Flame className="argus-v-flame w-5 h-5 text-orange-400" />
              : <CheckCircle2 className="argus-v-pop w-5 h-5 text-emerald-400" />}
            <span className={analysis.smokingDetected ? 'text-orange-200' : 'text-emerald-200'}>
              {analysis.smokingDetected ? `Обнаружено эпизодов курения: ${analysis.events.length}` : 'Курение не обнаружено'}
            </span>
          </div>
          <p className="text-xs text-cyan-100/80">{analysis.summary}</p>
          {analysis.events.length > 0 && <ul className="space-y-2">{analysis.events.map(renderEvent)}</ul>}
        </div>
      )}

      <p className="text-[11px] text-cyan-200/60">
        Видео отправляется на сервер только по кнопке анализа. Ролик анализируется целиком с определением таймкодов курения и примерного возраста курящего в кадре.
        Для совместимости используйте MP4 (H.264/AAC) или WebM (VP8/VP9).
      </p>
    </section>
  );
}
