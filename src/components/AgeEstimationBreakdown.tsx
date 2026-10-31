import React, { useState } from 'react';
import { AgeEstimationResult, SafeCityBiometrics } from '../types/argus';
import { estimateBiometricAgeFromFeatures } from '../services/argusApi';
import {
  UserCheck,
  ShieldCheck,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Award,
} from 'lucide-react';

interface Props {
  ageData: AgeEstimationResult;
  safeCityData: SafeCityBiometrics;
  onUpdateCustomAge?: (result: AgeEstimationResult) => void;
}

export const AgeEstimationBreakdown: React.FC<Props> = ({
  ageData,
  safeCityData,
  onUpdateCustomAge,
}) => {
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [faceRatio, setFaceRatio] = useState(0.28);
  const [skinElasticity, setSkinElasticity] = useState(0.92);
  const [mandibularAngle, setMandibularAngle] = useState(127);
  const [hasStubble, setHasStubble] = useState(false);

  const handleRecalculate = (
    newRatio = faceRatio,
    newSkin = skinElasticity,
    newAngle = mandibularAngle,
    newStubble = hasStubble
  ) => {
    const updated = estimateBiometricAgeFromFeatures(newRatio, newSkin, newAngle, newStubble);
    if (onUpdateCustomAge) {
      onUpdateCustomAge(updated);
    }
  };

  const getAgeGroupBadgeColor = (group: string) => {
    switch (group) {
      case 'child':
      case 'early_teen':
      case 'middle_teen':
        return 'bg-amber-500/20 text-cyan-300 border-amber-500/40';
      case 'older_teen':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'adult':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-5 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <UserCheck className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-white tracking-wide">
              Нейросетевая оценка возраста с погрешностью
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Анализ краниофациальных пропорций, эластичности дермы и созревания костных структур
          </p>
        </div>

        <button
          onClick={() => setInteractiveMode(!interactiveMode)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
            interactiveMode
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          {interactiveMode ? 'Скрыть интерактивный калибратор' : 'Интерактивная калибровка биомаркеров'}
        </button>
      </div>

      {/* Main Age Metric Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Metric 1: Estimated Age with Error Margin */}
        <div className="bg-gradient-to-br from-slate-850 to-slate-900 border border-slate-750 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>ОЦЕНКА ВОЗРАСТА</span>
            <span className="text-[10px] text-cyan-400 font-mono">РЕГРЕССИОННАЯ МОДЕЛЬ</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl lg:text-4xl font-extrabold text-cyan-400 font-mono tracking-tight">
              {ageData.estimatedAge}
            </span>
            <span className="text-lg font-bold text-slate-400 font-mono">
              ± {ageData.errorMarginYears} года
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center gap-2">
            <span className="text-slate-400">Диапазон:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 font-semibold text-cyan-300 font-mono border border-slate-700">
              {ageData.ageRangeString}
            </span>
            <span className="text-slate-400">Доверие:</span>
            <span className="text-emerald-400 font-mono font-bold">
              {ageData.confidencePercentage}%
            </span>
          </div>
        </div>

        {/* Metric 2: Age Group & Legal Classification */}
        <div className="bg-gradient-to-br from-slate-850 to-slate-900 border border-slate-750 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>ВОЗРАСТНАЯ ГРУППА</span>
            <span className="text-[10px] text-cyan-400 font-mono">ПРАВОВОЙ СТАТУС</span>
          </div>
          <div className="mt-1">
            <span
              className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md border ${getAgeGroupBadgeColor(
                ageData.ageGroup
              )}`}
            >
              {ageData.ageGroupLabelRu}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            {ageData.isBiologicallyMinor ? (
              <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Несовершеннолетний (подлежит учету ПДН/КДН)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Совершеннолетний (18+ лет, вне ведения КДН)</span>
              </div>
            )}
          </div>
        </div>

        {/* Metric 3: Safe City Biometrics Match (100% Passport precision) */}
        <div className="bg-gradient-to-br from-cyan-950/30 to-slate-900 border border-cyan-800/40 rounded-xl p-4 relative overflow-hidden">
          <div className="text-xs font-medium text-cyan-400 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> «Безопасный город» FindFace
            </span>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
              {safeCityData.confidence}% СОВПАДЕНИЕ
            </span>
          </div>
          <div className="mt-1">
            <div className="text-sm font-bold text-white truncate">
              {safeCityData.fullName}
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-2 mt-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Д.Р.: <strong className="text-white">{safeCityData.birthDate}</strong></span>
              <span>(Паспортный: <strong className="text-cyan-300 font-mono">{safeCityData.passportAge} лет</strong>)</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-cyan-200/80 bg-cyan-950/60 rounded px-2 py-1 border border-cyan-800/40 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Паспортная верификация исключает ошибку внешности</span>
          </div>
        </div>
      </div>

      {/* Morphological Biological Markers Table */}
      <div className="mt-4">
        <div className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>МОРФОЛОГИЧЕСКИЕ И БИОМЕТРИЧЕСКИЕ МАРКЕРЫ ВОЗРАСТА В КАДРЕ</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {ageData.facialMorphologyMarkers.map((marker, idx) => (
            <div
              key={idx}
              className="bg-slate-850/80 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-white">{marker.marker}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {marker.indicativeGroup}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {marker.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Biomarker Calibrator (if user enables) */}
      {interactiveMode && (
        <div className="mt-5 pt-4 border-t border-slate-800 bg-slate-950/60 rounded-xl p-4 border border-cyan-900/40">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white">
              Лабораторный калибратор весов нейросети оценки возраста
            </h4>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Изменяйте биометрические коэффициенты, чтобы наблюдать изменение расчетного возраста и погрешности (± года):
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Пропорции черепа (нижняя треть / высота):</span>
                <span className="font-mono text-cyan-400 font-bold">{faceRatio.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.22"
                max="0.36"
                step="0.01"
                value={faceRatio}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setFaceRatio(val);
                  handleRecalculate(val, skinElasticity, mandibularAngle, hasStubble);
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>0.22 (Ребенок)</span>
                <span>0.28 (Подросток)</span>
                <span>0.36 (Взрослый)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Тургор дермы и гладкость коллагена:</span>
                <span className="font-mono text-cyan-400 font-bold">{(skinElasticity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.99"
                step="0.01"
                value={skinElasticity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSkinElasticity(val);
                  handleRecalculate(faceRatio, val, mandibularAngle, hasStubble);
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>50% (Зрелая кожа)</span>
                <span>80% (Юноша)</span>
                <span>99% (Ребенок)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Угол ветви нижней челюсти:</span>
                <span className="font-mono text-cyan-400 font-bold">{mandibularAngle}°</span>
              </div>
              <input
                type="range"
                min="115"
                max="135"
                step="1"
                value={mandibularAngle}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMandibularAngle(val);
                  handleRecalculate(faceRatio, skinElasticity, val, hasStubble);
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>115° (Взрослый мужской)</span>
                <span>125-130° (Подросток)</span>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-900 border border-slate-800 p-2.5 rounded-lg hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={hasStubble}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasStubble(checked);
                    handleRecalculate(faceRatio, skinElasticity, mandibularAngle, checked);
                  }}
                  className="rounded accent-cyan-400 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="text-white font-semibold">Зрелая щетина / зрелые фолликулы</span>
                  <p className="text-[10px] text-slate-400">Смещает возраст в категорию 18+ лет</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tech Note */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-400 leading-normal">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <span>
          <strong>Технологический принцип:</strong> Первичная нейросеть «Аргус» определяет ориентировочный возраст с доверительным интервалом (погрешностью ±1.1–2.1 года). При фиксации курения система посылает запрос в «Безопасный город», где FindFace Multi сопоставляет лицо с государственными реестрами и возвращает <strong>100% точный паспортный возраст</strong>. Это исключает юридические споры в КДН.
        </span>
      </div>
    </div>
  );
};
