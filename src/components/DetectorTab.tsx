import React, { useState, useRef } from 'react';
import { ArgusAnalysisResponse, PresetCase, IncidentRecord } from '../types/argus';
import { PRESET_CASES } from '../data/presetCases';
import { analyzeImageWithArgus } from '../services/argusApi';
import { ImageHudViewer } from './ImageHudViewer';
import { AgeEstimationBreakdown } from './AgeEstimationBreakdown';
import {
  Upload,
  Camera,
  Play,
  RotateCcw,
  FileCheck2,
  FileWarning,
  Send,
  CheckCircle,
  ExternalLink,
  Flame,
  Wind,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface Props {
  onSendToKdnQueue: (incident: IncidentRecord) => void;
  activePresetId?: string;
}

export const DetectorTab: React.FC<Props> = ({ onSendToKdnQueue, activePresetId }) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetCase>(
    PRESET_CASES.find((p) => p.id === activePresetId) || PRESET_CASES[0]
  );
  const [currentImage, setCurrentImage] = useState<string>(selectedPreset.imageSvgUrl);
  const [analysis, setAnalysis] = useState<ArgusAnalysisResponse>(selectedPreset.mockResult);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSentToKdn, setIsSentToKdn] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectPreset = (preset: PresetCase) => {
    setSelectedPreset(preset);
    setCurrentImage(preset.imageSvgUrl);
    setAnalysis(preset.mockResult);
    setIsSentToKdn(false);
  };

  const handleRunScan = async (imgToScan = currentImage, presetId = selectedPreset.id) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeImageWithArgus(imgToScan, presetId);
      setAnalysis(result);
      setIsSentToKdn(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setCurrentImage(base64);
        setIsSentToKdn(false);
        handleRunScan(base64, undefined);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartWebcam = async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setWebcamActive(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });
      setWebcamActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Webcam access was not granted:', err);
      setWebcamActive(false);
    }
  };

  const handleCaptureWebcam = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCurrentImage(dataUrl);

        // Stop stream
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach((track) => track.stop());
        setWebcamActive(false);

        handleRunScan(dataUrl, undefined);
      }
    }
  };

  const handleDispatchToKdn = () => {
    const newRecord: IncidentRecord = {
      id: `ARGUS-INC-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleTimeString('ru-RU') + ' ' + new Date().toLocaleDateString('ru-RU'),
      cameraId: 'CAM-042',
      cameraName: 'Камера 042 • СОШ №17 (Вход)',
      locationName: 'г. Ставрополь, ул. Ленина, 42',
      imageUrl: currentImage,
      analysis,
      status: 'pending',
    };
    onSendToKdnQueue(newRecord);
    setIsSentToKdn(true);
  };

  const legal = analysis.legalAssessment;

  return (
    <div className="space-y-6">
      {/* Banner introduction to neural detector */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-cyan-950/40 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Двухэтапная архитектура детекции «Аргус» + биометрия FindFace</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Интеллектуальный анализатор курения и возраста в видеопотоке
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
              Загрузите изображение, используйте кадр с веб-камеры или выберите один из тестовых сценариев.
              Нейросеть оценит возраст с доверительным интервалом (± года), определит факт курения и сформирует юридическое заключение.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleRunScan()}
              disabled={isAnalyzing}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Повторный скан</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Загрузить фото</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {!webcamActive ? (
              <button
                onClick={handleStartWebcam}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Веб-камера</span>
              </button>
            ) : (
              <button
                onClick={handleCaptureWebcam}
                className="px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 animate-pulse cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Сделать снимок</span>
              </button>
            )}
          </div>
        </div>

        {/* Webcam Preview modal if active */}
        {webcamActive && (
          <div className="mt-4 p-3 bg-black/80 rounded-xl border border-red-500/50 flex flex-col items-center">
            <video ref={videoRef} className="max-h-72 rounded-lg" autoPlay muted playsInline />
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleCaptureWebcam}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold"
              >
                Захватить кадр для анализа
              </button>
              <button
                onClick={() => {
                  const stream = videoRef.current?.srcObject as MediaStream;
                  stream?.getTracks().forEach((track) => track.stop());
                  setWebcamActive(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Preset Selector Badges */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="text-xs font-semibold text-slate-400 mb-2.5">
            ГОТОВЫЕ ТЕСТОВЫЕ КЕЙСЫ (ДЕТЕКЦИЯ, ВОЗРАСТ И ЛОЖНЫЕ СРАБАТЫВАНИЯ):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {PRESET_CASES.map((preset) => {
              const isActive = selectedPreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'bg-cyan-950/60 border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400'
                      : 'bg-slate-850/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider block font-semibold text-cyan-400 mb-1">
                    {preset.categoryTag.includes('до 16') ? 'КЕЙС 1: ДО 16 ЛЕТ' :
                     preset.categoryTag.includes('16+') ? 'КЕЙС 2: 16-17 ЛЕТ' :
                     preset.categoryTag.includes('Совершеннолетний') ? 'КЕЙС 3: 18+ ЛЕТ' :
                     preset.categoryTag.includes('Еда') ? 'КЕЙС 4: ЕДА' :
                     preset.categoryTag.includes('Смартфон') ? 'КЕЙС 5: ТЕЛЕФОН' : 'КЕЙС 6: ГРУППА'}
                  </span>
                  <span className="text-xs font-bold text-white line-clamp-2 leading-tight">
                    {preset.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Visual HUD Viewer + Immediate Verdict */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image HUD Viewer (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <ImageHudViewer
            imageUrl={currentImage}
            isAnalyzing={isAnalyzing}
            boundingBoxes={analysis.detectedObjects}
            statusLabel={selectedPreset.subtitle}
            isViolation={analysis.legalAssessment.violationDetected}
          />

          {/* Behavior Indicators Bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-2.5">
              <span
                className={`p-2 rounded-lg ${
                  analysis.isSmokingOrVaping
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                <Flame className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Факт курения</div>
                <div className="text-xs font-bold text-white">
                  {analysis.isSmokingOrVaping ? 'ОБНАРУЖЕНО' : 'НЕ ОБНАРУЖЕНО'}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-2.5">
              <span
                className={`p-2 rounded-lg ${
                  analysis.vaporOrSmokeDetected
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <Wind className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Пар / Аэрозоль</div>
                <div className="text-xs font-bold text-white">
                  {analysis.vaporOrSmokeDetected ? 'ВЫБРОС В КАДРЕ' : 'ОТСУТСТВУЕТ'}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-2.5">
              <span
                className={`p-2 rounded-lg ${
                  analysis.handToMouthPoseDetected
                    ? 'bg-amber-500/10 text-cyan-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Жест руки у рта</div>
                <div className="text-xs font-bold text-white">
                  {analysis.handToMouthPoseDetected ? 'ЗАТЯЖКА (ФИКСАЦИЯ)' : 'ШТАТНАЯ ПОЗА'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Legal Qualification and System Actions (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* Legal Verdict Box */}
          <div
            className={`rounded-2xl border p-5 shadow-xl transition-all ${
              legal.violationDetected
                ? 'bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-900 border-red-500/60 ring-1 ring-red-500/30'
                : 'bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 border-emerald-500/50'
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`p-1.5 rounded-lg ${
                    legal.violationDetected
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {legal.violationDetected ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                </span>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    ЮРИДИЧЕСКАЯ КВАЛИФИКАЦИЯ
                  </div>
                  <h3 className="text-base font-extrabold text-white">
                    {legal.applicableArticle}
                  </h3>
                </div>
              </div>

              {legal.violationDetected && (
                <span className="text-xs px-2.5 py-1 rounded bg-red-500/20 text-red-300 font-mono font-bold border border-red-500/40">
                  {legal.fineAmountRu}
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-400">Состав: </span>
                <span className="text-slate-200 font-medium">{legal.articleTitle}</span>
              </div>
              <div>
                <span className="text-slate-400">Субъект ответственности: </span>
                <strong className="text-white">{legal.responsibleSubject}</strong>
              </div>
              <div>
                <span className="text-slate-400">Устройство: </span>
                <span className="text-cyan-300 font-medium">{analysis.deviceLabelRu}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 text-slate-300 text-[11px] leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-cyan-400 font-semibold">Аналитическое резюме нейросети: </span>
                {analysis.analyticalSummaryRu}
              </div>
            </div>

            {/* Action dispatch button */}
            {legal.violationDetected && (
              <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col gap-2">
                {!isSentToKdn ? (
                  <button
                    onClick={handleDispatchToKdn}
                    className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Передать дело в КДН и уведомить Госуслуги</span>
                  </button>
                ) : (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>
                      Материалы успешно направлены в очередь районной КДН и ЛК Госуслуг!
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Citizen Registry Card (FindFace Multi) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <FileCheck2 className="w-4 h-4" />
                Карточка гражданина из реестра «Безопасного города»
              </span>
              <span className="text-[10px] font-mono text-emerald-400">ИНТЕГРАЦИЯ FINDFACE</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">ФИО</span>
                <span className="text-white font-semibold truncate block">
                  {analysis.safeCityBiometrics.fullName}
                </span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Паспортный возраст</span>
                <span className="text-cyan-300 font-bold font-mono">
                  {analysis.safeCityBiometrics.passportAge} лет ({analysis.safeCityBiometrics.birthDate})
                </span>
              </div>
              {analysis.safeCityBiometrics.educationFacility && (
                <div className="col-span-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Учебное заведение</span>
                  <span className="text-slate-300 font-medium">
                    {analysis.safeCityBiometrics.educationFacility}
                  </span>
                </div>
              )}
              {analysis.safeCityBiometrics.legalGuardian && (
                <div className="col-span-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Законный представитель (для уведомления)</span>
                  <span className="text-slate-200">
                    {analysis.safeCityBiometrics.legalGuardian} • {analysis.safeCityBiometrics.guardianPhone}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Biometric Age Estimation Section (Core requirement) */}
      <AgeEstimationBreakdown
        ageData={analysis.ageEstimation}
        safeCityData={analysis.safeCityBiometrics}
        onUpdateCustomAge={(updated) => {
          setAnalysis((prev) => ({
            ...prev,
            ageEstimation: updated,
          }));
        }}
      />
    </div>
  );
};
