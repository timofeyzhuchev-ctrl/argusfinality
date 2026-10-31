import React, { useState } from 'react';
import { DetectedBoundingBox } from '../types/argus';
import { Eye, EyeOff, Maximize2, Info, Flame, User, Cloud, Sparkles } from 'lucide-react';

interface Props {
  imageUrl: string;
  isAnalyzing: boolean;
  boundingBoxes: DetectedBoundingBox[];
  statusLabel?: string;
  isViolation?: boolean;
  onOpenFullscreen?: () => void;
  onOpenInfo?: () => void;
  hoveredIndex?: number | null;
  onHoverIndex?: (index: number | null) => void;
}

export const ImageHudViewer: React.FC<Props> = ({
  imageUrl,
  isAnalyzing,
  boundingBoxes,
  statusLabel,
  isViolation = false,
  onOpenFullscreen,
  onOpenInfo,
  hoveredIndex = null,
  onHoverIndex,
}) => {
  const [showBoxes, setShowBoxes] = useState(true);

  const getCategoryDetails = (category: string, label: string, isHovered: boolean) => {
    const isDevice =
      category === 'device' ||
      /вейп|сигарет|сигар|трубк|кальян|iqos|айкос|pod|электрон|vape|cigar|алкогол|бутылк|пив|вин/i.test(label);
    const isSmoke = category === 'smoke_vapor' || /пар|дым|smoke|vapor/i.test(label);
    const isFace = category === 'face' || /лицо|face/i.test(label);

    if (isDevice) {
      return {
        type: 'device',
        badgeTitle: 'Устройство',
        badgeIcon: Flame,
        border: isHovered
          ? 'border-rose-400 border-2 ring-4 ring-rose-500/30 shadow-[0_0_24px_rgba(244,63,94,0.7)]'
          : 'border-rose-500/90 border-2',
        bg: isHovered ? 'bg-rose-500/20' : 'bg-rose-500/10',
        cornerColor: 'border-rose-300',
        tag: isHovered
          ? 'bg-rose-600 text-white border-rose-300 shadow-lg scale-105 font-semibold'
          : 'bg-[#051121]/95 text-rose-300 border-rose-500/50',
      };
    }

    if (isSmoke) {
      return {
        type: 'smoke',
        badgeTitle: 'Дым / Пар',
        badgeIcon: Cloud,
        border: isHovered
          ? 'border-sky-400 border-2 ring-4 ring-sky-500/30 shadow-[0_0_22px_rgba(56,189,248,0.65)]'
          : 'border-sky-400/90 border-2',
        bg: isHovered ? 'bg-sky-500/20' : 'bg-sky-500/10',
        cornerColor: 'border-sky-300',
        tag: isHovered
          ? 'bg-sky-600 text-white border-sky-300 shadow-lg scale-105 font-semibold'
          : 'bg-[#051121]/95 text-sky-200 border-sky-500/50',
      };
    }

    if (isFace) {
      return {
        type: 'face',
        badgeTitle: 'Лицо',
        badgeIcon: User,
        border: isHovered
          ? 'border-cyan-300 border-2 ring-4 ring-cyan-400/40 shadow-[0_0_24px_rgba(6,182,212,0.7)]'
          : 'border-cyan-400/90 border-2',
        bg: isHovered ? 'bg-cyan-500/20' : 'bg-cyan-500/10',
        cornerColor: 'border-cyan-200',
        tag: isHovered
          ? 'bg-cyan-400 text-slate-950 border-cyan-200 shadow-lg scale-105 font-bold'
          : 'bg-[#051121]/95 text-cyan-300 border-cyan-500/50',
      };
    }

    return {
      type: 'other',
      badgeTitle: 'Объект',
      badgeIcon: Sparkles,
      border: isHovered
        ? 'border-emerald-400 border-2 ring-4 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
        : 'border-emerald-500/80 border-2',
      bg: isHovered ? 'bg-emerald-500/20' : 'bg-emerald-500/10',
      cornerColor: 'border-emerald-300',
      tag: isHovered
        ? 'bg-emerald-600 text-white border-emerald-300 shadow-md scale-105 font-semibold'
        : 'bg-[#051121]/95 text-emerald-300 border-emerald-500/50',
    };
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-[#020712] border border-cyan-500/30 select-none group shadow-inner">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3 py-2 bg-gradient-to-b from-[#020712]/95 via-[#020712]/50 to-transparent flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
              isViolation
                ? 'bg-rose-500/25 text-rose-200 border-rose-500/50'
                : 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40'
            }`}
          >
            {statusLabel || (isViolation ? 'Нарушение' : 'Норма')}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-[#061426]/90 p-0.5 rounded-lg border border-cyan-400/30">
          {onOpenInfo && (
            <button
              onClick={onOpenInfo}
              title="Параметры снимка"
              className="p-1 rounded-md text-cyan-200/70 hover:text-cyan-200 hover:bg-cyan-500/20 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}
          {onOpenFullscreen && (
            <button
              onClick={onOpenFullscreen}
              title="На весь экран"
              className="p-1 rounded-md text-cyan-200/70 hover:text-cyan-200 hover:bg-cyan-500/20 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowBoxes(!showBoxes)}
            title={showBoxes ? 'Скрыть рамки объектов' : 'Показать рамки объектов'}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              showBoxes
                ? 'text-cyan-200 bg-orange-500/25'
                : 'text-cyan-200/50 hover:text-cyan-200 hover:bg-cyan-500/20'
            }`}
          >
            {showBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Image Frame */}
      <div className="relative aspect-[16/10] w-full bg-[#0e0717] flex items-center justify-center overflow-hidden">
        <img
          src={imageUrl}
          alt="Анализируемый кадр"
          className="w-full h-full object-contain"
        />

        {/* Scanning Indicator */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-[#12091c]/70 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-30">
            <div className="px-4 py-2 rounded-xl bg-[#1f1131]/95 border border-orange-400/40 flex items-center gap-2.5 shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-semibold text-cyan-100">
                Анализ кадра «Аргус»...
              </span>
            </div>
          </div>
        )}

        {/* Interactive Bounding Boxes */}
        {showBoxes &&
          !isAnalyzing &&
          boundingBoxes.map((box, index) => {
            const [ymin, xmin, ymax, xmax] = box.box_2d;
            const top = `${(ymin / 1000) * 100}%`;
            const left = `${(xmin / 1000) * 100}%`;
            const width = `${((xmax - xmin) / 1000) * 100}%`;
            const height = `${((ymax - ymin) / 1000) * 100}%`;

            const isHovered = hoveredIndex === index;
            const isAnyHovered = hoveredIndex !== null;
            const details = getCategoryDetails(box.category, box.label, isHovered);
            const BadgeIcon = details.badgeIcon;
            const isNearTop = ymin < 65;

            return (
              <div
                key={index}
                onMouseEnter={() => onHoverIndex && onHoverIndex(index)}
                onMouseLeave={() => onHoverIndex && onHoverIndex(null)}
                className={`absolute rounded-lg pointer-events-auto cursor-pointer transition-all duration-200 ease-out ${
                  details.border
                } ${details.bg} ${
                  isHovered
                    ? 'z-40 scale-[1.02] opacity-100'
                    : isAnyHovered
                    ? 'z-10 opacity-30 scale-[0.99]'
                    : 'z-10 opacity-95'
                }`}
                style={{ top, left, width, height }}
              >
                {/* Corner Brackets */}
                <span
                  className={`absolute -top-[2px] -left-[2px] w-2.5 h-2.5 border-t-2 border-l-2 rounded-tl-sm ${details.cornerColor}`}
                />
                <span
                  className={`absolute -top-[2px] -right-[2px] w-2.5 h-2.5 border-t-2 border-r-2 rounded-tr-sm ${details.cornerColor}`}
                />
                <span
                  className={`absolute -bottom-[2px] -left-[2px] w-2.5 h-2.5 border-b-2 border-l-2 rounded-bl-sm ${details.cornerColor}`}
                />
                <span
                  className={`absolute -bottom-[2px] -right-[2px] w-2.5 h-2.5 border-b-2 border-r-2 rounded-br-sm ${details.cornerColor}`}
                />

                {/* Floating Tag */}
                <div
                  className={`absolute ${
                    isNearTop ? 'top-1 left-1' : '-top-6 left-0'
                  } text-[10px] px-2 py-0.5 rounded-md border whitespace-nowrap transition-all duration-200 flex items-center gap-1 ${
                    details.tag
                  } ${isHovered ? 'z-50 shadow-md' : 'z-20'}`}
                >
                  <BadgeIcon className="w-3 h-3 shrink-0" />
                  <span>{box.label}</span>
                  <span className="opacity-80 font-mono text-[9px]">{box.confidence}%</span>
                </div>
              </div>
            );
          })}
      </div>

      {/* Bottom Status Bar */}
      <div className="px-3 py-1.5 bg-[#190d29]/95 border-t border-cyan-500/20 text-[11px] text-cyan-200/70 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span>Детектор «Безопасный город»</span>
          {hoveredIndex !== null && boundingBoxes[hoveredIndex] && (
            <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-cyan-200 text-[10px] font-medium">
              Выделен объект
            </span>
          )}
        </span>
        <span className="text-cyan-100 truncate max-w-[65%] text-right font-mono text-[11px]">
          {hoveredIndex !== null && boundingBoxes[hoveredIndex]
            ? `${boundingBoxes[hoveredIndex].label} (${boundingBoxes[hoveredIndex].confidence}%)`
            : boundingBoxes.length > 0
            ? `Объектов: ${boundingBoxes.length}`
            : 'Готов'}
        </span>
      </div>
    </div>
  );
};
