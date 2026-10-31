import React, { useState } from 'react';
import { IncidentRecord } from '../types/argus';
import { PRESET_CASES } from '../data/presetCases';
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertOctagon,
  Bell,
  Smartphone,
  Shield,
  Clock,
  MapPin,
  ExternalLink,
  Award,
  QrCode,
  Download,
  Filter,
} from 'lucide-react';

interface Props {
  incidents: IncidentRecord[];
  onUpdateStatus: (id: string, newStatus: IncidentRecord['status'], comment?: string) => void;
}

export const OperatorKdnTab: React.FC<Props> = ({ incidents, onUpdateStatus }) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(incidents[0]?.id || '');
  const [operatorComment, setOperatorComment] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified_kdn' | 'rejected'>('all');
  const [showGosuslugiModal, setShowGosuslugiModal] = useState(false);

  const selectedIncident = incidents.find((inc) => inc.id === selectedIncidentId) || incidents[0];

  const filteredList = incidents.filter((inc) => {
    if (filter === 'pending') return inc.status === 'pending';
    if (filter === 'verified_kdn') return inc.status === 'verified_kdn';
    if (filter === 'rejected') return inc.status === 'rejected_false_positive' || inc.status === 'closed_adult';
    return true;
  });

  const handleApprove = (incident: IncidentRecord) => {
    onUpdateStatus(incident.id, 'verified_kdn', operatorComment || 'Подтверждено оператором ЕЦМ. Признаки курения верифицированы.');
    setOperatorComment('');
  };

  const handleReject = (incident: IncidentRecord) => {
    onUpdateStatus(incident.id, 'rejected_false_positive', operatorComment || 'Отклонено оператором: жест не связан с курением / недостаточно доказательств.');
    setOperatorComment('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner on Human-in-the-Loop Concept */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950/40 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Контур реагирования: «ИИ находит — Человек подтверждает»</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Пульт оператора мониторинга и интеграция с КДН и «Госуслугами»
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
              Все подозрительные события проходят обязательную валидацию дежурным оператором.
              После утверждения дело с материалами (скриншот, таймкод, паспортная привязка) автоматически поступает в Комиссию по делам несовершеннолетних (КДН), а родителям формируется уведомление в ЛК «Госуслуг».
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 text-xs">
            <span className="text-slate-400 pl-2">Фильтр:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Все ({incidents.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filter === 'pending' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ожидают ({incidents.filter((i) => i.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('verified_kdn')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filter === 'verified_kdn' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              В КДН ({incidents.filter((i) => i.status === 'verified_kdn').length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Incidents List (Left) + Detail Protocol (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Incident Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Очередь инцидентов для верификации ({filteredList.length})</span>
            <span className="font-mono text-cyan-400 text-[10px]">КАНАЛ: КДН-ОНЛАЙН</span>
          </div>

          <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
            {filteredList.map((inc) => {
              const isSelected = inc.id === selectedIncidentId;
              const isPending = inc.status === 'pending';
              const isVerified = inc.status === 'verified_kdn';

              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-400 ring-1 ring-cyan-400 shadow-lg'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono font-bold text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      {inc.id}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isPending
                          ? 'bg-amber-500/20 text-cyan-300 border border-amber-500/40'
                          : isVerified
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isPending ? 'ОЖИДАЕТ РЕШЕНИЯ' : isVerified ? 'ПЕРЕДАНО В КДН' : 'ОТКЛОНЕНО'}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white truncate">
                    {inc.analysis.safeCityBiometrics.fullName}
                  </div>

                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{inc.timestamp}</span>
                    <span>•</span>
                    <span className="text-cyan-300 font-mono">
                      {inc.analysis.ageEstimation.estimatedAge} ± {inc.analysis.ageEstimation.errorMarginYears}г
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 mt-2 line-clamp-1 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                    <span className="text-cyan-400 font-semibold">{inc.analysis.legalAssessment.applicableArticle}: </span>
                    {inc.analysis.deviceLabelRu}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Incident Verification & Legal Protocol Card */}
        {selectedIncident ? (
          <div className="lg:col-span-7 space-y-4">
            {/* Operator Review Box */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                    КАРТОЧКА ВЕРИФИКАЦИИ ОПЕРАТОРА
                  </span>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedIncident.id} • {selectedIncident.cameraName}
                  </h3>
                </div>

                <button
                  onClick={() => setShowGosuslugiModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Предпросмотр уведомления на Госуслугах</span>
                </button>
              </div>

              {/* Evidence Snapshot Frame */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video relative">
                  <img
                    src={selectedIncident.imageUrl}
                    alt="Evidence Snapshot"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-red-600/90 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    ФОТОФИКСАЦИЯ ИИ
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">ФИО правонарушителя (FindFace 99.8%)</span>
                    <span className="text-sm font-bold text-white block">
                      {selectedIncident.analysis.safeCityBiometrics.fullName}
                    </span>
                    <span className="text-cyan-400 font-mono font-semibold">
                      Паспортный возраст: {selectedIncident.analysis.safeCityBiometrics.passportAge} лет ({selectedIncident.analysis.safeCityBiometrics.birthDate})
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Квалификация деяния</span>
                    <strong className="text-cyan-400 font-bold block">
                      {selectedIncident.analysis.legalAssessment.applicableArticle}
                    </strong>
                    <span className="text-slate-300">
                      {selectedIncident.analysis.legalAssessment.articleTitle}
                    </span>
                    <div className="mt-1 text-emerald-400 font-mono font-semibold">
                      Штраф: {selectedIncident.analysis.legalAssessment.fineAmountRu}
                    </div>
                  </div>
                </div>
              </div>

              {/* Operator Verification Decision Controls */}
              {selectedIncident.status === 'pending' ? (
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <textarea
                    value={operatorComment}
                    onChange={(e) => setOperatorComment(e.target.value)}
                    placeholder="Служебный комментарий оператора к протоколу (необязательно)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none h-16"
                  />

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleApprove(selectedIncident)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Подтвердить и направить в КДН</span>
                    </button>

                    <button
                      onClick={() => handleReject(selectedIncident)}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/50 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Отклонить (Ложное)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-400">
                    Статус обработки: <strong className="text-white">{selectedIncident.status === 'verified_kdn' ? 'Утверждено и передано в КДН' : 'Отклонено'}</strong>
                  </span>
                  <span className="text-cyan-400 font-mono text-[11px]">
                    {selectedIncident.operatorComment || 'Верифицировано оператором'}
                  </span>
                </div>
              )}
            </div>

            {/* Official Administrative Protocol Preview (PDF/Document view) */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl relative font-sans">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    ПРОЕКТ ПОСТАНОВЛЕНИЯ ДЛЯ РАЙОННОЙ КДН И ЗП
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                  ФОРМА ПДН-2026/АРГУС
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="text-center font-bold text-white text-sm">
                  МАТЕРИАЛЫ ОБ АДМИНИСТРАТИВНОМ ПРАВОНАРУШЕНИИ № {selectedIncident.id}
                </div>
                <div className="text-center text-[11px] text-slate-400">
                  автоматически сформированные аппаратно-программным комплексом «Аргус»
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-[11px]">
                  <div><strong className="text-slate-400">Дата и время:</strong> {selectedIncident.timestamp}</div>
                  <div><strong className="text-slate-400">Источник фиксации:</strong> {selectedIncident.cameraName}</div>
                  <div><strong className="text-slate-400">Субъект:</strong> {selectedIncident.analysis.safeCityBiometrics.fullName}</div>
                  <div><strong className="text-slate-400">Возраст:</strong> {selectedIncident.analysis.safeCityBiometrics.passportAge} лет</div>
                  <div className="col-span-2">
                    <strong className="text-slate-400">Законный представитель:</strong>{' '}
                    {selectedIncident.analysis.safeCityBiometrics.legalGuardian || 'Смирнова Е.В.'} (телефон: {selectedIncident.analysis.safeCityBiometrics.guardianPhone || '+7 918 742-XX-XX'})
                  </div>
                  <div className="col-span-2">
                    <strong className="text-slate-400">Установленные обстоятельства:</strong>{' '}
                    {selectedIncident.analysis.analyticalSummaryRu}
                  </div>
                  <div className="col-span-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-cyan-400 block mb-0.5">Правовая квалификация:</strong>
                    {selectedIncident.analysis.legalAssessment.applicableArticle} — {selectedIncident.analysis.legalAssessment.articleTitle}. Санкция: {selectedIncident.analysis.legalAssessment.fineAmountRu}.
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-slate-500 border-t border-slate-900 flex items-center justify-between">
                  <span>Электронная подпись: УЭЦП Инспектора ПДН № 841-A</span>
                  <span>152-ФЗ соблюдён • Срок хранения записи: 30 суток</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Gosuslugi Notification Mock Modal */}
      {showGosuslugiModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-sm w-full rounded-3xl p-5 shadow-2xl relative space-y-4">
            {/* Phone Notch Mock */}
            <div className="flex justify-center">
              <div className="w-24 h-4 bg-black rounded-b-xl" />
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  ГУ
                </span>
                <span className="text-xs font-bold text-white">Госуслуги • Уведомления</span>
              </div>
              <button
                onClick={() => setShowGosuslugiModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Notification Card */}
            <div className="bg-slate-800/90 rounded-2xl p-4 border border-blue-500/40 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-blue-400 font-semibold">
                <span>Комиссия по делам несовершеннолетних (КДН)</span>
                <span>Сейчас</span>
              </div>

              <div className="text-sm font-bold text-white leading-tight">
                Постановление по ст. 5.35 КоАП РФ (курение несовершеннолетнего)
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Уважаемая Елена Викторовна! Комплексом «Безопасный город» зафиксирован факт курения вейпа Вашим сыном (Смирнов А.Д., 15 лет) в 14:32 возле школы №17.
              </p>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Сумма штрафа</span>
                  <span className="text-sm font-black text-white">1 500 ₽</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-1 rounded">
                  Скидка 50% при оплате за 20 дней
                </span>
              </div>

              <button className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg cursor-pointer">
                Оплатить онлайн (750 ₽)
              </button>
            </div>

            <p className="text-[10px] text-slate-500 text-center">
              Демонстрация сквозного цикла: Нейросеть → FindFace → Оператор → КДН → Госуслуги
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
