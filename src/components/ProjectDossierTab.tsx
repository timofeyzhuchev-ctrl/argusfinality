import React, { useState } from 'react';
import {
  BookOpen,
  Dna,
  HeartPulse,
  TrendingUp,
  Scale,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calculator,
  FileCheck,
  Sparkles,
  Users,
} from 'lucide-react';

export const ProjectDossierTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'workflow' | 'science' | 'economy' | 'legal'>('workflow');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [cameraCount, setCameraCount] = useState<number>(3700);

  // Economic calculations based on user brief
  const costPerNewCamera = 120000; // 120,000 ₽ average (50-200k in brief)
  const hardwareCostWithoutArgus = cameraCount * costPerNewCamera;
  const argusSoftwareCost = cameraCount * 9500; // Software server processing layer
  const totalSavings = hardwareCostWithoutArgus - argusSoftwareCost;
  const savingsPercent = Math.round((totalSavings / hardwareCostWithoutArgus) * 100);

  const workflowSteps = [
    {
      step: 1,
      title: 'Камера «Безопасного города»',
      subtitle: 'Существующий RTSP-видеопоток',
      desc: 'Система подключается к уже установленной городской сети камер (школы, парки, остановки, дворы) без закупки нового оборудования.',
      badge: '3 703+ камер',
      color: 'blue',
    },
    {
      step: 2,
      title: 'Нейросеть «Аргус»',
      subtitle: 'Анализ позы, руки и траектории',
      desc: 'Двухэтапная модель: этап 1 — детекция позы и кисти; этап 2 — распознавание зажатого устройства, поднесения ко рту и выброса аэрозоля/дыма.',
      badge: 'Задержка < 120 мс',
      color: 'cyan',
    },
    {
      step: 3,
      title: 'Фильтрация ложных срабатываний',
      subtitle: 'Отсечение еды, напитков и телефонов',
      desc: 'Если человек просто ест сэндвич, пьет воду или держит телефон у уха — нейросеть фиксирует отсутствие пара и безопасный объект. Наблюдение продолжается.',
      badge: 'Точность 98.4%',
      color: 'emerald',
    },
    {
      step: 4,
      title: 'Запрос в «Безопасный город» (FindFace)',
      subtitle: 'Биометрия и паспортный возраст',
      desc: 'При фиксации курения кадр лица направляется в государственный биометрический модуль (FindFace Multi NtechLab). Возвращается паспортная дата рождения.',
      badge: 'Точность 99.9%',
      color: 'purple',
    },
    {
      step: 5,
      title: 'Проверка возраста (< 18 лет)',
      subtitle: 'Юридическая селекция',
      desc: 'Если возраст 18+ лет — событие автоматически закрывается (система ПДН не тратит ресурсы). Если младше 18 лет — формируется карточка тревоги.',
      badge: '100% паспортный возраст',
      color: 'amber',
    },
    {
      step: 6,
      title: 'Пульт оператора мониторинга',
      subtitle: 'Человек подтверждает (Human-in-the-loop)',
      desc: 'Оператор единого центра просматривает скриншот, время и паспортные данные, подтверждая или отклоняя инцидент.',
      badge: 'Принцип ИИ + Человек',
      color: 'indigo',
    },
    {
      step: 7,
      title: 'КДН и штраф через Госуслуги',
      subtitle: 'Замкнутый правовой цикл',
      desc: 'Дело уходит в районную КДН. До 16 лет штраф родителям по ст. 5.35 КоАП РФ (500–2000 ₽). С 16 лет штраф подростку по ст. 6.24 КоАП РФ. Уведомление летит в Госуслуги.',
      badge: 'ст. 5.35 / 6.24 КоАП',
      color: 'red',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Subtab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2 rounded-2xl">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveSubTab('workflow')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'workflow'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Схема работы системы</span>
          </button>
          <button
            onClick={() => setActiveSubTab('science')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'science'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Dna className="w-4 h-4" />
            <span>Исследования и цифры (DKFZ, ВОЗ)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('economy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'economy'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Экономический калькулятор</span>
          </button>
          <button
            onClick={() => setActiveSubTab('legal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'legal'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Правовая база и 152-ФЗ</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 pr-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Проект «Аргус» • Технико-правовое досье</span>
        </div>
      </div>

      {/* TAB 1: WORKFLOW DIAGRAM */}
      {activeSubTab === 'workflow' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-1">
              Интерактивная архитектура сквозного взаимодействия
            </h3>
            <p className="text-xs text-slate-400 mb-6 max-w-2xl">
              Нажмите на любой шаг цепочки, чтобы изучить протокол работы, задействованные модули и юридические основания:
            </p>

            {/* Interactive Timeline Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2 relative">
              {workflowSteps.map((item) => {
                const isActive = activeStep === item.step;
                return (
                  <div
                    key={item.step}
                    onClick={() => setActiveStep(item.step)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg scale-102'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                        <span className="text-cyan-400">ШАГ {item.step}</span>
                        <span className="text-slate-500">{item.badge}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-snug">
                        {item.title}
                      </h4>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-400 line-clamp-2">
                      {item.subtitle}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Step Detail Card */}
            <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-cyan-900/60 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-cyan-500 text-slate-950 font-black flex items-center justify-center text-xs">
                    {activeStep}
                  </span>
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase">
                      ДЕТАЛИЗАЦИЯ ШАГА {activeStep} ИЗ 7
                    </span>
                    <h4 className="text-base font-bold text-white">
                      {workflowSteps[activeStep - 1].title} — {workflowSteps[activeStep - 1].subtitle}
                    </h4>
                  </div>
                </div>

                <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {workflowSteps[activeStep - 1].badge}
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                {workflowSteps[activeStep - 1].desc}
              </p>
            </div>
          </div>

          {/* Key Innovation Card */}
          <div className="bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-900 border border-indigo-800/40 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Главная новизна проекта «Аргус»</span>
            </div>
            <h4 className="text-base font-bold text-white mb-2">
              Тандем двух систем: поведенческий ИИ + государственная биометрия
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Существующий «Безопасный город» умеет распознавать лица, скопления, драки, оставленные предметы и автономера. Но в нем <strong>нет детекции курения и вейпинга</strong>.
              «Аргус» закрывает этот пробел: наша нейросеть определяет <em>что происходит</em> (поведенческий жест курения), а «Безопасный город» определяет <em>кто это</em> (паспортный возраст через FindFace Multi).
              Подобный тандем для профилактики курения несовершеннолетних не имеет прямых аналогов.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: SCIENCE & EPIDEMIOLOGY */}
      {activeSubTab === 'science' && (
        <div className="space-y-6">
          {/* Numbers row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="text-xs text-slate-400 uppercase font-mono">Минздрав РФ (15–17 лет)</div>
              <div className="text-3xl font-black text-red-400 font-mono mt-1">&gt; 30%</div>
              <p className="text-xs text-slate-400 mt-2">
                Каждый третий старшеклассник пробовал электронные сигареты или регулярно использует вейпы.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="text-xs text-slate-400 uppercase font-mono">ВОЗ (Возраст первой пробы)</div>
              <div className="text-3xl font-black text-cyan-400 font-mono mt-1">12–14 лет</div>
              <p className="text-xs text-slate-400 mt-2">
                Подавляющее большинство курильщиков приобретают никотиновую зависимость до достижения 18 лет.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="text-xs text-slate-400 uppercase font-mono">DKFZ (Германия, 2024)</div>
              <div className="text-3xl font-black text-cyan-400 font-mono mt-1">535 локусов</div>
              <p className="text-xs text-slate-400 mt-2">
                Участков метилирования ДНК, изменяющихся у вейперов идентично курильщикам традиционных сигарет.
              </p>
            </div>
          </div>

          {/* Detailed Scientific Findings Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                <Dna className="w-4 h-4" />
                <span>Метилирование ДНК — переключатели генов (DKFZ, 2024)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Немецкий центр исследований рака (DKFZ) исследовал свыше 3500 биообразцов. Выявлено 535 участков генома, подверженных эпигенетическому ремоделированию у вейперов с небольшим стажем. Электронные сигареты активируют те же онкогенные механизмы, что и классический табак.
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                <HeartPulse className="w-4 h-4" />
                <span>Ускоренное биологическое старение легких (2025)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Клиническое исследование 2025 года продемонстрировало, что у подростков-вейперов легочная ткань деградирует опережающими темпами: биологический возраст альвеол опережает паспортный возраст на 4–8 лет.
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                <TrendingUp className="w-4 h-4" />
                <span>Иммуноциты крови и сосудистый риск у девушек</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                У вейперов зафиксирована дисфункция моноцитов — ключевых клеток сосудистого эндотелия. У девушек эффект деструкции эндотелия выражен статистически сильнее, повышая ранний риск сердечно-сосудистых патологий.
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Изменения эпителия ротовой полости (2025)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                У молодых людей, употребляющих исключительно вейпы (без традиционных сигарет), выявлены мутационные эпигенетические маркеры в клетках ротовой полости, ассоциированные с предопухолевыми процессами.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ECONOMIC CALCULATOR */}
      {activeSubTab === 'economy' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              Калькулятор экономической эффективности внедрения для муниципалитета
            </h3>
            <p className="text-xs text-slate-400">
              Сравнение затрат: закупка новых специализированных камер (50 000 – 200 000 ₽ за шт.) против развертывания нейросети «Аргус» поверх существующей инфраструктуры «Безопасного города».
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-sm text-slate-300 mb-2">
              <span>Парк камер «Безопасный город» в муниципалитете:</span>
              <span className="font-mono text-cyan-400 font-bold text-base">
                {cameraCount.toLocaleString()} камер
              </span>
            </div>
            <input
              type="range"
              min="500"
              max="20000"
              step="100"
              value={cameraCount}
              onChange={(e) => setCameraCount(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Малый город (500)</span>
              <span>Ставрополь (3 703)</span>
              <span>Мегаполис (20 000)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-xl">
              <span className="text-[10px] font-mono text-red-400 uppercase">
                Традиционный путь (Закупка камер с аналитикой)
              </span>
              <div className="text-2xl font-black text-red-300 font-mono mt-1">
                {(hardwareCostWithoutArgus / 1000000).toFixed(1)} млн ₽
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Закупка оборудования, монтаж, кабельные трассы (от 120 тыс. ₽ за точку).
              </p>
            </div>

            <div className="bg-cyan-950/30 border border-cyan-500/30 p-4 rounded-xl">
              <span className="text-[10px] font-mono text-cyan-400 uppercase">
                Внедрение «Аргус» (Программный слой поверх потоков)
              </span>
              <div className="text-2xl font-black text-cyan-300 font-mono mt-1">
                {(argusSoftwareCost / 1000000).toFixed(1)} млн ₽
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                0 ₽ на железо камер. Только серверная обработка существующих RTSP видеопотоков.
              </p>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl">
              <span className="text-[10px] font-mono text-emerald-400 uppercase">
                Чистая экономия бюджета
              </span>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {(totalSavings / 1000000).toFixed(1)} млн ₽ ({savingsPercent}%)
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Снижение нагрузки на инспекторов ПДН на 65% + автоматизация оформления протоколов.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LEGAL BASIS AND DATA PRIVACY */}
      {activeSubTab === 'legal' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              Нормативно-правовая база функционирования комплекса
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-cyan-400 font-bold font-mono text-sm block">
                  ст. 5.35 КоАП РФ (до 16 лет)
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Неисполнение родителями или иными законными представителями обязанностей по содержанию и воспитанию несовершеннолетних. Нарушителю до 16 лет не может быть выписан личный административный штраф, поэтому ответственность возлагается на родителей (предупреждение или штраф от 500 до 2 000 ₽).
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-red-400 font-bold font-mono text-sm block">
                  ст. 6.24 КоАП РФ (16–17 лет)
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Нарушение установленного федеральным законом запрета курения табака, потребления никотинсодержащей продукции или использования кальянов. Нарушитель от 16 лет отвечает лично: штраф 500–1 500 ₽ (на детских площадках — от 2 000 до 3 000 ₽).
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Соответствие 152-ФЗ «О персональных данных» и этический протокол</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside leading-relaxed">
                <li>
                  <strong>Только инцидентная фиксация:</strong> видеозапись буферизуется в оперативной памяти и сбрасывается в постоянное защищенное хранилище <em>только</em> при фиксации факта правонарушения. Постоянная слежка за потоком без инцидентов исключена.
                </li>
                <li>
                  <strong>Селективный биометрический запрос:</strong> запрос на идентификацию в базу «Безопасного города» отправляется исключительно по событию курения.
                </li>
                <li>
                  <strong>Защита персональных данных:</strong> передача протокола в КДН и родителям через ЕСИА («Госуслуги») ведется по защищенным каналам в соответствии с ГОСТ Р 34.12-2015.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
