import React, { useState } from 'react';
import { CameraStreamInfo } from '../types/argus';
import { INITIAL_CAMERA_FEEDS } from '../data/presetCases';
import {
  Cctv,
  Activity,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Shield,
  Layers,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';

interface Props {
  onSelectCameraToAnalyze: (presetCaseId: string) => void;
}

export const CityCamerasTab: React.FC<Props> = ({ onSelectCameraToAnalyze }) => {
  const [cameras] = useState<CameraStreamInfo[]>(INITIAL_CAMERA_FEEDS);
  const [filter, setFilter] = useState<'all' | 'alert' | 'active'>('all');

  const filteredCameras = cameras.filter((cam) => {
    if (filter === 'alert') return cam.status === 'alert' || cam.status === 'warning';
    if (filter === 'active') return cam.status === 'active';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner on Safe City Integration */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950/40 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-2">
              <Cctv className="w-3.5 h-3.5" />
              <span>Инфраструктура АПК «Безопасный город»</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Единая городская видеостена мониторинга правонарушений
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
              Нейросеть «Аргус» работает как внешний интеллектуальный аналитический слой над существующим парком видеокамер.
              Новые камеры закупать не требуется — модель обрабатывает существующие RTSP-потоки.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl p-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Все камеры ({cameras.length})
            </button>
            <button
              onClick={() => setFilter('alert')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filter === 'alert'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Тревоги ({cameras.filter((c) => c.status !== 'active').length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Норма ({cameras.filter((c) => c.status === 'active').length})
            </button>
          </div>
        </div>

        {/* City Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Ставрополь</div>
            <div className="text-lg font-black text-white font-mono">3 703 камеры</div>
            <div className="text-[10px] text-emerald-400">100% покрытие школ</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Сургут (Биометрия)</div>
            <div className="text-lg font-black text-white font-mono">+450 камер</div>
            <div className="text-[10px] text-cyan-400">FindFace Multi сервер</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Новосибирск</div>
            <div className="text-lg font-black text-white font-mono">4 120 камер</div>
            <div className="text-[10px] text-purple-400">Интеграция с КДН</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Экономия бюджета</div>
            <div className="text-lg font-black text-emerald-400 font-mono">0 ₽ на железо</div>
            <div className="text-[10px] text-slate-400">Только ПО «Аргус»</div>
          </div>
        </div>
      </div>

      {/* Camera Grid Wall */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCameras.map((cam) => {
          const isAlert = cam.status === 'alert';
          const isWarning = cam.status === 'warning';

          return (
            <div
              key={cam.id}
              className={`bg-slate-900 rounded-2xl border overflow-hidden shadow-xl transition-all hover:border-cyan-500/50 flex flex-col justify-between ${
                isAlert
                  ? 'border-red-500/80 ring-1 ring-red-500/30'
                  : isWarning
                  ? 'border-amber-500/60'
                  : 'border-slate-800'
              }`}
            >
              {/* Camera Header OSD */}
              <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isAlert ? 'bg-red-400' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        isAlert ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                  </span>
                  <span className="font-mono font-bold text-white">{cam.id}</span>
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    isAlert
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : isWarning
                      ? 'bg-amber-500/20 text-cyan-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {isAlert ? 'ТРЕВОГА' : isWarning ? 'ВНИМАНИЕ' : 'В НОРМЕ'}
                </span>
              </div>

              {/* Camera Frame Preview with Alert Overlay */}
              <div className="relative aspect-video bg-black group overflow-hidden">
                <img
                  src={cam.imageUrl}
                  alt={cam.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                />

                {cam.activeAlert && (
                  <div className="absolute bottom-2 left-2 right-2 bg-red-950/90 border border-red-500/60 text-red-200 text-[11px] font-mono font-bold p-1.5 rounded-lg backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 animate-pulse" />
                    <span className="truncate">{cam.activeAlert}</span>
                  </div>
                )}

                {/* Scanline overlay */}
                <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-400 border border-slate-700/60 backdrop-blur-sm">
                  {cam.fps} FPS
                </div>
              </div>

              {/* Camera Information Card */}
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-white truncate">{cam.name}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">{cam.address}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                  <div>ЗОНА: {cam.zone}</div>
                  <div>РАЗРЕШЕНИЕ: {cam.resolution}</div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => onSelectCameraToAnalyze(cam.presetCaseId)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 hover:border-cyan-400 cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:text-white" />
                  <span>Открыть в Детекторе «Аргус»</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
