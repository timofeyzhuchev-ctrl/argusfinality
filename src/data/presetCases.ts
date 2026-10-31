import { PresetCase, CameraStreamInfo } from '../types/argus';

// High-detail SVG data URLs for each scenario, formatted as surveillance camera stills with OSD overlay
function createSurveillanceSvg(
  timeStr: string,
  camLabel: string,
  scenario: 'vape_teen' | 'cigarette_teen' | 'adult_smoke' | 'food_false' | 'phone_false' | 'group_vape'
): string {
  const commonHeader = `
    <rect width="800" height="480" fill="#0d1117" />
    <!-- CCTV Grid Lines and Scanlines -->
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1f2937" stroke-width="0.8" opacity="0.4"/>
      </pattern>
      <radialGradient id="vignette" cx="50%" cy="50%" r="65%">
        <stop offset="60%" stop-color="#000000" stop-opacity="0" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.85" />
      </radialGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <rect width="800" height="480" fill="url(#grid)" />
  `;

  let sceneGraphics = '';

  if (scenario === 'vape_teen') {
    sceneGraphics = `
      <!-- Background: School entrance brick wall and stairs -->
      <rect x="0" y="320" width="800" height="160" fill="#1e293b" />
      <rect x="180" y="140" width="440" height="200" fill="#0f172a" stroke="#334155" stroke-width="2" />
      <text x="320" y="170" fill="#64748b" font-family="monospace" font-size="14">МБОУ СОШ №17 • ВХОД ДЛЯ УЧАЩИХСЯ</text>

      <!-- Teenager Silhouette / Vector Representation -->
      <g transform="translate(340, 150)">
        <!-- Hoodie / Body -->
        <path d="M 60 160 Q 60 130 90 120 L 130 120 Q 160 130 160 160 L 175 300 L 45 300 Z" fill="#3b82f6" opacity="0.85"/>
        <!-- Hood Outline -->
        <path d="M 80 120 C 75 70, 145 70, 140 120 Z" fill="#1d4ed8"/>
        <!-- Face: Young teen features, light skin tone -->
        <ellipse cx="110" cy="105" rx="22" ry="26" fill="#fcd34d" />
        <!-- Hair: juvenile haircut -->
        <path d="M 88 100 C 88 80, 132 80, 132 100 C 125 85, 95 85, 88 100 Z" fill="#451a03"/>
        <!-- Eyes & Nose -->
        <circle cx="102" cy="102" r="2.5" fill="#1e293b"/>
        <circle cx="118" cy="102" r="2.5" fill="#1e293b"/>
        <path d="M 110 106 L 109 113 L 112 113" stroke="#b45309" stroke-width="1.5" fill="none"/>
        <path d="M 104 120 Q 110 123 116 120" stroke="#b45309" stroke-width="1.5" fill="none"/>

        <!-- Right Arm lifting vape to mouth -->
        <path d="M 150 145 Q 170 170 145 130 L 125 125" stroke="#fcd34d" stroke-width="14" stroke-linecap="round" fill="none"/>
        <!-- Vape Device in Hand: Pod system stick (dark with blue LED) -->
        <rect x="118" y="118" width="10" height="26" rx="2" fill="#09090b" stroke="#06b6d4" stroke-width="1.5"/>
        <circle cx="123" cy="138" r="1.5" fill="#06b6d4" filter="url(#glow)"/>

        <!-- Vapor cloud puff escaping mouth -->
        <path d="M 115 110 Q 140 90 175 80 Q 210 95 195 115 Q 160 125 115 115 Z" fill="#f8fafc" opacity="0.65" filter="url(#glow)"/>
        <circle cx="180" cy="95" r="22" fill="#ffffff" opacity="0.45" filter="url(#glow)"/>
        <circle cx="210" cy="85" r="16" fill="#ffffff" opacity="0.35" filter="url(#glow)"/>
      </g>
    `;
  } else if (scenario === 'cigarette_teen') {
    sceneGraphics = `
      <!-- Background: Playground & bench -->
      <rect x="0" y="300" width="800" height="180" fill="#14532d" opacity="0.3" />
      <rect x="120" y="240" width="180" height="80" fill="#3f3f46" stroke="#52525b" stroke-width="2" />
      <text x="140" y="270" fill="#cbd5e1" font-family="monospace" font-size="13">ЗОНА ДЕТСКОЙ ПЛОЩАДКИ</text>
      <!-- Playground slide outline -->
      <path d="M 600 350 L 720 180 L 740 180 L 740 350" stroke="#f59e0b" stroke-width="4" fill="none"/>

      <!-- Teenager 16 years sitting on bench with classic burning cigarette -->
      <g transform="translate(260, 140)">
        <path d="M 80 150 Q 80 125 110 115 L 140 115 Q 170 125 170 150 L 180 320 L 70 320 Z" fill="#1e1b4b" opacity="0.9"/>
        <ellipse cx="125" cy="100" rx="22" ry="27" fill="#fed7aa" />
        <!-- Hair: slightly disheveled teen hair -->
        <path d="M 103 95 C 103 70, 147 70, 147 95 C 140 80, 110 80, 103 95 Z" fill="#18181b"/>
        <!-- Eyes & Nose -->
        <circle cx="118" cy="98" r="2" fill="#1e293b"/>
        <circle cx="132" cy="98" r="2" fill="#1e293b"/>
        <path d="M 125 102 L 124 109 L 127 109" stroke="#9a3412" stroke-width="1.5" fill="none"/>

        <!-- Hand with white cigarette with burning red tip -->
        <path d="M 160 140 Q 175 160 150 125 L 135 115" stroke="#fed7aa" stroke-width="12" stroke-linecap="round" fill="none"/>
        <line x1="125" y1="112" x2="142" y2="114" stroke="#ffffff" stroke-width="3"/>
        <line x1="139" y1="114" x2="143" y2="114" stroke="#f97316" stroke-width="4" filter="url(#glow)"/>
        <!-- Cigarette Smoke Stream -->
        <path d="M 143 114 Q 165 95 155 70 Q 175 50 165 30" stroke="#94a3b8" stroke-width="3" fill="none" opacity="0.65" filter="url(#glow)"/>
      </g>
    `;
  } else if (scenario === 'adult_smoke') {
    sceneGraphics = `
      <!-- Background: Public Bus Stop -->
      <rect x="0" y="320" width="800" height="160" fill="#334155" />
      <rect x="150" y="100" width="500" height="240" fill="#1e293b" stroke="#475569" stroke-width="2" rx="4"/>
      <text x="180" y="140" fill="#94a3b8" font-family="monospace" font-size="16">ОСТАНОВКА «ПРОСПЕКТ МИРА» • ПАВИЛЬОН №4</text>

      <!-- Adult male (33 years old), mature build, facial stubble -->
      <g transform="translate(350, 120)">
        <path d="M 50 170 Q 50 140 90 130 L 150 130 Q 190 140 190 170 L 195 340 L 45 340 Z" fill="#374151"/>
        <ellipse cx="120" cy="100" rx="26" ry="32" fill="#fdba74" />
        <!-- Mature short hair and visible stubble along jaw -->
        <path d="M 94 90 C 94 65, 146 65, 146 90 Z" fill="#4b5563"/>
        <path d="M 100 115 Q 120 135 140 115" stroke="#78350f" stroke-width="3" stroke-dasharray="2 2" fill="none"/>
        <circle cx="112" cy="98" r="2.5" fill="#1f2937"/>
        <circle cx="128" cy="98" r="2.5" fill="#1f2937"/>

        <!-- Cigarette in hand near mouth -->
        <path d="M 180 170 Q 185 140 140 120" stroke="#fdba74" stroke-width="14" stroke-linecap="round" fill="none"/>
        <line x1="124" y1="116" x2="140" y2="119" stroke="#ffffff" stroke-width="3.5"/>
        <circle cx="140" cy="119" r="2" fill="#ef4444" filter="url(#glow)"/>
        <path d="M 140 119 Q 155 90 170 70" stroke="#cbd5e1" stroke-width="3" fill="none" opacity="0.6"/>
      </g>
    `;
  } else if (scenario === 'food_false') {
    sceneGraphics = `
      <!-- Background: School Yard / Courtyard -->
      <rect x="0" y="320" width="800" height="160" fill="#1e293b" />
      <text x="250" y="160" fill="#475569" font-family="monospace" font-size="14">ШКОЛЬНЫЙ ДВОР • СКАМЬЯ ОТДЫХА</text>

      <!-- Teenager eating burger / sandwich (Hand to mouth false positive test) -->
      <g transform="translate(330, 140)">
        <path d="M 70 160 Q 70 130 100 120 L 140 120 Q 170 130 170 160 L 175 320 L 65 320 Z" fill="#047857" opacity="0.9"/>
        <ellipse cx="120" cy="100" rx="23" ry="26" fill="#fed7aa" />
        <circle cx="112" cy="98" r="2" fill="#1e293b"/>
        <circle cx="128" cy="98" r="2" fill="#1e293b"/>

        <!-- Hand holding a large sandwich/burger to mouth -->
        <path d="M 160 150 Q 170 140 135 125" stroke="#fed7aa" stroke-width="14" stroke-linecap="round" fill="none"/>
        <!-- Burger bun and green lettuce (clearly not a vape or cigarette) -->
        <ellipse cx="120" cy="120" rx="20" ry="12" fill="#d97706" stroke="#92400e" stroke-width="2"/>
        <ellipse cx="120" cy="122" rx="18" ry="4" fill="#22c55e"/>
        <ellipse cx="120" cy="125" rx="19" ry="8" fill="#b45309"/>
      </g>
    `;
  } else if (scenario === 'phone_false') {
    sceneGraphics = `
      <!-- Background: Bus stop wall -->
      <rect x="0" y="320" width="800" height="160" fill="#1e293b" />
      <text x="280" y="160" fill="#475569" font-family="monospace" font-size="14">ПЕШЕХОДНАЯ ЗОНА • КАМЕРА №12</text>

      <!-- Teenager holding smartphone to ear (Hand near face false positive test) -->
      <g transform="translate(340, 130)">
        <path d="M 60 160 Q 60 130 95 120 L 135 120 Q 170 130 170 160 L 175 320 L 55 320 Z" fill="#7c3aed" opacity="0.9"/>
        <ellipse cx="115" cy="100" rx="22" ry="26" fill="#fde047" />
        <circle cx="108" cy="98" r="2" fill="#1e293b"/>
        <circle cx="122" cy="98" r="2" fill="#1e293b"/>

        <!-- Hand holding black smartphone to ear -->
        <path d="M 160 155 Q 165 130 138 95" stroke="#fde047" stroke-width="12" stroke-linecap="round" fill="none"/>
        <rect x="130" y="80" width="16" height="34" rx="3" fill="#0f172a" stroke="#64748b" stroke-width="1.5" transform="rotate(10 138 97)"/>
      </g>
    `;
  } else {
    // group_vape
    sceneGraphics = `
      <rect x="0" y="320" width="800" height="160" fill="#1e293b" />
      <text x="240" y="140" fill="#475569" font-family="monospace" font-size="14">СКВЕР ВЕТЕРАНОВ • БЕСЕДКА №2</text>
      <!-- Group of three teens -->
      <g transform="translate(180, 140)">
        <!-- Teen 1 -->
        <path d="M 30 160 Q 30 130 60 120 L 90 120 Q 120 130 120 160 L 125 320 L 25 320 Z" fill="#2563eb"/>
        <ellipse cx="75" cy="100" rx="20" ry="24" fill="#fde047"/>
      </g>
      <g transform="translate(330, 135)">
        <!-- Teen 2 with bright vape puff -->
        <path d="M 40 160 Q 40 130 75 120 L 115 120 Q 150 130 150 160 L 155 320 L 35 320 Z" fill="#dc2626"/>
        <ellipse cx="95" cy="95" rx="22" ry="25" fill="#fde047"/>
        <path d="M 135 145 Q 150 135 110 115" stroke="#fde047" stroke-width="12" stroke-linecap="round" fill="none"/>
        <rect x="105" y="108" width="8" height="22" rx="2" fill="#1e1b4b" stroke="#ec4899" stroke-width="1.5"/>
        <path d="M 100 100 Q 130 80 170 70 Q 200 85 180 110 Z" fill="#ffffff" opacity="0.6" filter="url(#glow)"/>
      </g>
      <g transform="translate(500, 145)">
        <!-- Teen 3 looking on -->
        <path d="M 30 160 Q 30 130 60 120 L 90 120 Q 120 130 120 160 L 125 320 L 25 320 Z" fill="#059669"/>
        <ellipse cx="75" cy="100" rx="20" ry="24" fill="#fde047"/>
      </g>
    `;
  }

  const cctvOverlay = `
    <!-- Vignette effect -->
    <rect width="800" height="480" fill="url(#vignette)" pointer-events="none" />

    <!-- CCTV Camera OSD Elements -->
    <g font-family="monospace" font-size="13" fill="#10b981" font-weight="bold">
      <!-- Top Left REC marker -->
      <circle cx="35" cy="35" r="7" fill="#ef4444" filter="url(#glow)"/>
      <text x="50" y="40" fill="#f87171">REC • LIVE [БЕЗОПАСНЫЙ ГОРОД: АРГУС-AI]</text>
      <!-- Top Right Time & Cam -->
      <text x="520" y="40" fill="#e2e8f0">${timeStr} • ${camLabel}</text>
      <!-- Bottom Info Bar -->
      <rect x="20" y="440" width="760" height="26" fill="#000000" opacity="0.75" rx="4"/>
      <text x="35" y="458" fill="#38bdf8" font-size="11">FPS: 25.0 | ПОТОК: RTSP H.265 | АНАЛИТИКА: ПОЗА + РУКА + БИОМЕТРИЯ | КАНАЛ СВЯЗИ: ЗАЩИЩЕН (ГОСТ Р 34.12-2015)</text>
    </g>

    <!-- Crosshair Target Marks in center -->
    <line x1="390" y1="240" x2="410" y2="240" stroke="#38bdf8" stroke-width="1.5" opacity="0.6"/>
    <line x1="400" y1="230" x2="400" y2="250" stroke="#38bdf8" stroke-width="1.5" opacity="0.6"/>
  `;

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" width="100%" height="100%">
    ${commonHeader}
    ${sceneGraphics}
    ${cctvOverlay}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(fullSvg)}`;
}

export const PRESET_CASES: PresetCase[] = [
  {
    id: 'case_teen_vape',
    title: 'Подросток (15 лет) с Pod-вейпом у входа в СОШ №17',
    subtitle: 'АПК «Безопасный город» • Камера №042 • Ставрополь',
    categoryTag: 'Нарушение несовершеннолетним (до 16 лет)',
    imageSvgUrl: createSurveillanceSvg('14:32:08 19.10.2026', 'CAM-042 [СОШ №17 ВХОД]', 'vape_teen'),
    description: 'Ученик 9 класса зафиксирован в момент затяжки электронным испарителем (вейпом) с последующим выбросом плотного парового облака.',
    mockResult: {
      isSmokingOrVaping: true,
      confidencePercentage: 97.8,
      deviceType: 'vape',
      deviceLabelRu: 'Электронная система доставки никотина (вейп / под-система)',
      handToMouthPoseDetected: true,
      vaporOrSmokeDetected: true,
      ageEstimation: {
        estimatedAge: 15.2,
        errorMarginYears: 1.3,
        ageRangeString: '14–16 лет',
        ageGroup: 'middle_teen',
        ageGroupLabelRu: 'Средний подростковый возраст (14–15 лет)',
        confidencePercentage: 95.4,
        facialMorphologyMarkers: [
          {
            marker: 'Ювенильные краниофациальные пропорции',
            description: 'Высота нижней челюсти к общей высоте черепа составляет 0.28 (характерно для 14–16 лет)',
            indicativeGroup: '14–16 лет',
          },
          {
            marker: 'Эластичность дермы и отсутствие заломов',
            description: 'Плотный тургор, отсутствие носогубных складок, юношеский рельеф скуловой зоны',
            indicativeGroup: 'до 18 лет',
          },
          {
            marker: 'Угол нижней челюсти',
            description: 'Сглаженный угол ветви челюсти (128°), минерализация костного каркаса в стадии формирования',
            indicativeGroup: '14–15 лет',
          },
          {
            marker: 'Вторичные признаки',
            description: 'Отсутствие зрелой щетины, юношеская структура шеи',
            indicativeGroup: 'подросток',
          },
        ],
        isBiologicallyMinor: true,
      },
      safeCityBiometrics: {
        findFaceMatched: true,
        confidence: 99.85,
        fullName: 'Смирнов Арсений Дмитриевич',
        birthDate: '14.06.2011',
        passportAge: 15,
        educationFacility: 'МБОУ СОШ №17, 9 «Б» класс',
        legalGuardian: 'Смирнова Елена Викторовна (мать)',
        guardianPhone: '+7 (918) 742-31-09',
        residenceAddress: 'г. Ставрополь, ул. Ленина, д. 42, кв. 108',
        status: 'minor_under_16',
      },
      legalAssessment: {
        violationDetected: true,
        applicableArticle: 'ст. 5.35 КоАП РФ',
        articleTitle: 'Неисполнение родителями обязанностей по содержанию и воспитанию несовершеннолетних',
        fineAmountRu: '500 – 2 000 ₽',
        responsibleSubject: 'Родители / законные представители (подростку менее 16 лет)',
        recommendedAction: 'Автоматическая передача дела в районную КДН и направление постановления в Госуслуги',
        kdnTransferRequired: true,
        gosuslugiNoticeRequired: true,
      },
      analyticalSummaryRu: 'Комплекс «Аргус» зафиксировал классический паттерн вейпинга: поднесение компактного испарителя ко рту с удержанием 2.4 сек и образованием аэрозольного следа. Оценка возраста нейросетью: 15.2 ± 1.3 лет. По базе FindFace Multi подтверждено совпадение 99.85%: Смирнов А.Д., 15 лет (не подлежит личной адм. ответственности до 16 лет). Протокол формируется на родителей по ст. 5.35 КоАП РФ.',
      detectedObjects: [
        {
          label: 'Несовершеннолетний (Лицо: 15.2 ± 1.3г)',
          category: 'face',
          box_2d: [170, 480, 360, 600],
          confidence: 99.8,
        },
        {
          label: 'Вейп / Pod-устройство (97.8%)',
          category: 'device',
          box_2d: [260, 520, 340, 560],
          confidence: 97.8,
        },
        {
          label: 'Жест: Затяжка (Рука у рта)',
          category: 'hand',
          box_2d: [240, 480, 400, 580],
          confidence: 98.2,
        },
        {
          label: 'Облако пара (Аэрозоль)',
          category: 'smoke_vapor',
          box_2d: [180, 540, 310, 710],
          confidence: 94.6,
        },
      ],
    },
  },
  {
    id: 'case_teen_cigarette',
    title: 'Старшеклассник (16.5 лет) с сигаретой на детской площадке',
    subtitle: 'АПК «Безопасный город» • Камера №118 • Новосибирск',
    categoryTag: 'Нарушение несовершеннолетним (16+ лет)',
    imageSvgUrl: createSurveillanceSvg('16:15:42 19.10.2026', 'CAM-118 [СКВЕР ПОБЕДЫ: ДЕТСКАЯ ЗОНА]', 'cigarette_teen'),
    description: 'Подросток курит классическую сигарету на территории детской игровой площадки. Попадание под отягчающую часть ст. 6.24 КоАП РФ.',
    mockResult: {
      isSmokingOrVaping: true,
      confidencePercentage: 98.6,
      deviceType: 'cigarette',
      deviceLabelRu: 'Тлеющая сигарета традиционного типа',
      handToMouthPoseDetected: true,
      vaporOrSmokeDetected: true,
      ageEstimation: {
        estimatedAge: 16.7,
        errorMarginYears: 1.1,
        ageRangeString: '16–17.5 лет',
        ageGroup: 'older_teen',
        ageGroupLabelRu: 'Старший подростковый возраст (16–17 лет)',
        confidencePercentage: 96.1,
        facialMorphologyMarkers: [
          {
            marker: 'Оформление скулового овала',
            description: 'Четкие контуры скуловых костей, переходная маскулинизация',
            indicativeGroup: '16–18 лет',
          },
          {
            marker: 'Текстура дермы',
            description: 'Подростковые акне-элементы, высокая эластичность, отсутствие морщин',
            indicativeGroup: 'подросток',
          },
          {
            marker: 'Надбровные дуги',
            description: 'Стадия умеренного утолщения лобного гребня',
            indicativeGroup: '16–17 лет',
          },
        ],
        isBiologicallyMinor: true,
      },
      safeCityBiometrics: {
        findFaceMatched: true,
        confidence: 99.91,
        fullName: 'Ковалев Максим Сергеевич',
        birthDate: '28.02.2010',
        passportAge: 16,
        educationFacility: 'Гимназия №11, 10 «А» класс',
        legalGuardian: 'Ковалев Сергей Иванович (отец)',
        guardianPhone: '+7 (913) 980-12-88',
        residenceAddress: 'г. Новосибирск, Красный проспект, д. 85, кв. 34',
        status: 'minor_16_to_17',
      },
      legalAssessment: {
        violationDetected: true,
        applicableArticle: 'ст. 6.24 ч. 2 КоАП РФ',
        articleTitle: 'Курение табака на детских площадках (повышенная ответственность)',
        fineAmountRu: '2 000 – 3 000 ₽',
        responsibleSubject: 'Несовершеннолетний лично (достиг 16-летнего возраста)',
        recommendedAction: 'Личный административный штраф 16-летнему правонарушителю + постановка на учет в КДН',
        kdnTransferRequired: true,
        gosuslugiNoticeRequired: true,
      },
      analyticalSummaryRu: 'Зафиксировано курение табачной сигареты в зоне детской площадки. Оценка возраста: 16.7 ± 1.1 лет. Система FindFace установила личность: Ковалев М.С., паспортный возраст 16 лет. Так как возраст нарушителя превышает 16 лет, ответственность наступает непосредственно для него по ч. 2 ст. 6.24 КоАП РФ (детская площадка). Протокол направляется в КДН с уведомлением родителей.',
      detectedObjects: [
        {
          label: 'Несовершеннолетний 16+ (16.7 ± 1.1г)',
          category: 'face',
          box_2d: [150, 410, 340, 520],
          confidence: 99.9,
        },
        {
          label: 'Тлеющая сигарета (98.6%)',
          category: 'device',
          box_2d: [220, 440, 270, 490],
          confidence: 98.6,
        },
        {
          label: 'Дым сигаретный',
          category: 'smoke_vapor',
          box_2d: [120, 440, 240, 510],
          confidence: 93.1,
        },
      ],
    },
  },
  {
    id: 'case_adult_smoke',
    title: 'Взрослый гражданин (33 года) курит на остановке',
    subtitle: 'АПК «Безопасный город» • Камера №087 • Сургут',
    categoryTag: 'Совершеннолетний (Вне компетенции КДН)',
    imageSvgUrl: createSurveillanceSvg('18:04:19 19.10.2026', 'CAM-087 [ОСТАНОВКА «ПРОСПЕКТ МИРА»]', 'adult_smoke'),
    description: 'Система фиксирует курение сигареты взрослым мужчиной. Оценка возраста превышает 18 лет, реестр подтверждает 33 года. Событие автоматически закрывается без привлечения КДН.',
    mockResult: {
      isSmokingOrVaping: true,
      confidencePercentage: 99.1,
      deviceType: 'cigarette',
      deviceLabelRu: 'Классическая сигарета',
      handToMouthPoseDetected: true,
      vaporOrSmokeDetected: true,
      ageEstimation: {
        estimatedAge: 32.8,
        errorMarginYears: 2.1,
        ageRangeString: '31–35 лет',
        ageGroup: 'adult',
        ageGroupLabelRu: 'Зрелый возраст (30–35 лет)',
        confidencePercentage: 98.2,
        facialMorphologyMarkers: [
          {
            marker: 'Статические носогубные складки',
            description: 'Выраженные носогубные борозды глубиной 1.8 мм, потеря ювенильной гидрофильности',
            indicativeGroup: '28+ лет',
          },
          {
            marker: 'Зрелая структура щетины',
            description: 'Густой волосяной покров нижней трети лица со зрелыми фолликулами',
            indicativeGroup: 'взрослый',
          },
          {
            marker: 'Краниофациальная зрелость',
            description: 'Полная минерализация скуловых и нижнечелюстных костных отростков',
            indicativeGroup: 'взрослый',
          },
        ],
        isBiologicallyMinor: false,
      },
      safeCityBiometrics: {
        findFaceMatched: true,
        confidence: 99.98,
        fullName: 'Морозов Андрей Николаевич',
        birthDate: '19.09.1993',
        passportAge: 33,
        residenceAddress: 'г. Сургут, ул. Мира, д. 15, кв. 77',
        status: 'adult',
      },
      legalAssessment: {
        violationDetected: false,
        applicableArticle: 'Вне юрисдикции КДН',
        articleTitle: 'Гражданин является совершеннолетним (33 года)',
        fineAmountRu: '0 ₽ (для КДН)',
        responsibleSubject: 'Не применимо',
        recommendedAction: 'Автоматическое закрытие инцидента. Система ПДН «Аргус» игнорирует совершеннолетних граждан.',
        kdnTransferRequired: false,
        gosuslugiNoticeRequired: false,
      },
      analyticalSummaryRu: 'Факт курения подтвержден, однако биометрический анализ «Аргус» определил возраст 32.8 ± 2.1 года. Проверка в реестре жителей «Безопасного города» показала возраст 33 года (совершеннолетний). Инцидент автоматически снят с контроля — система не генерирует ложных обращений в комиссию по делам несовершеннолетних.',
      detectedObjects: [
        {
          label: 'Совершеннолетний (32.8 ± 2.1г)',
          category: 'face',
          box_2d: [160, 430, 360, 550],
          confidence: 99.9,
        },
        {
          label: 'Сигарета (99.1%)',
          category: 'device',
          box_2d: [240, 480, 280, 520],
          confidence: 99.1,
        },
      ],
    },
  },
  {
    id: 'case_food_false',
    title: 'Ложное срабатывание: подросток ест бургер/шаурму',
    subtitle: 'АПК «Безопасный город» • Камера №019 • Ставрополь',
    categoryTag: 'Фильтрация ложного срабатывания (Еда)',
    imageSvgUrl: createSurveillanceSvg('13:10:05 19.10.2026', 'CAM-019 [ДВОР СОШ №17]', 'food_false'),
    description: 'Поза «рука поднесена ко рту» вызвана употреблением пищи (бургер). Нейросеть корректно распознает форму объекта, отсутствие пара и отвергает подозрение на курение.',
    mockResult: {
      isSmokingOrVaping: false,
      confidencePercentage: 96.8,
      deviceType: 'food_or_phone',
      deviceLabelRu: 'Продукты питания (булочка / сэндвич)',
      handToMouthPoseDetected: true,
      vaporOrSmokeDetected: false,
      ageEstimation: {
        estimatedAge: 14.4,
        errorMarginYears: 1.2,
        ageRangeString: '13–15 лет',
        ageGroup: 'middle_teen',
        ageGroupLabelRu: 'Младший подросток (14 лет)',
        confidencePercentage: 94.0,
        facialMorphologyMarkers: [
          {
            marker: 'Ювенильные пропорции лица',
            description: 'Округлая форма щек, высокий тургор',
            indicativeGroup: '13–15 лет',
          },
        ],
        isBiologicallyMinor: true,
      },
      safeCityBiometrics: {
        findFaceMatched: true,
        confidence: 99.78,
        fullName: 'Белов Никита Романович',
        birthDate: '03.04.2012',
        passportAge: 14,
        educationFacility: 'МБОУ СОШ №17, 8 «В» класс',
        status: 'minor_under_16',
      },
      legalAssessment: {
        violationDetected: false,
        applicableArticle: 'Нет состава правонарушения',
        articleTitle: 'Ложное срабатывание (приём пищи)',
        fineAmountRu: '0 ₽',
        responsibleSubject: 'Отсутствует',
        recommendedAction: 'Инцидент отфильтрован вторым уровнем нейросети «Аргус». Сигнал оператору не посылается.',
        kdnTransferRequired: false,
        gosuslugiNoticeRequired: false,
      },
      analyticalSummaryRu: 'Зафиксировано приближение руки к ротовой полости. Однако детектор объектов классифицировал объект как сэндвич/бургер (уверенность 96.8%), дымовой или аэрозольный шлейф отсутствует. Инцидент классифицирован как безопасный (ложное срабатывание исключено алгоритмом).',
      detectedObjects: [
        {
          label: 'Подросток (14.4 ± 1.2г)',
          category: 'face',
          box_2d: [160, 440, 350, 550],
          confidence: 99.7,
        },
        {
          label: 'Объект: Еда / Бургер (96.8%)',
          category: 'other',
          box_2d: [240, 440, 310, 520],
          confidence: 96.8,
        },
      ],
    },
  },
  {
    id: 'case_phone_false',
    title: 'Ложное срабатывание: девушка разговаривает по смартфону',
    subtitle: 'АПК «Безопасный город» • Камера №063 • Новосибирск',
    categoryTag: 'Фильтрация ложного срабатывания (Смартфон)',
    imageSvgUrl: createSurveillanceSvg('17:40:11 19.10.2026', 'CAM-063 [УЛ. ЛЕНИНА]', 'phone_false'),
    description: 'Рука находится возле головы и лица, удерживая прямоугольный гаджет (смартфон у уха). Отсутствие затяжки, пара и специфического хвата.',
    mockResult: {
      isSmokingOrVaping: false,
      confidencePercentage: 98.4,
      deviceType: 'food_or_phone',
      deviceLabelRu: 'Мобильный телефон (смартфон)',
      handToMouthPoseDetected: false,
      vaporOrSmokeDetected: false,
      ageEstimation: {
        estimatedAge: 15.6,
        errorMarginYears: 1.4,
        ageRangeString: '14–17 лет',
        ageGroup: 'middle_teen',
        ageGroupLabelRu: 'Подросток (15–16 лет)',
        confidencePercentage: 95.1,
        facialMorphologyMarkers: [
          {
            marker: 'Юношеская морфология',
            description: 'Отсутствие носогубных борозд, ювенильный тургор кожи',
            indicativeGroup: '15–17 лет',
          },
        ],
        isBiologicallyMinor: true,
      },
      safeCityBiometrics: {
        findFaceMatched: true,
        confidence: 99.89,
        fullName: 'Ильина Дарья Павловна',
        birthDate: '12.11.2010',
        passportAge: 15,
        educationFacility: 'Лицей №22, 9 «А» класс',
        status: 'minor_under_16',
      },
      legalAssessment: {
        violationDetected: false,
        applicableArticle: 'Нет состава правонарушения',
        articleTitle: 'Штатная ситуация: телефонный разговор',
        fineAmountRu: '0 ₽',
        responsibleSubject: 'Отсутствует',
        recommendedAction: 'Инцидент закрыт в фоновом режиме.',
        kdnTransferRequired: false,
        gosuslugiNoticeRequired: false,
      },
      analyticalSummaryRu: 'Объект у лица классифицирован как смартфон (98.4%), положение кисти соответствует разговору по телефону (хват пальцами корпуса). Факт курения отсутствует, событие отклонено.',
      detectedObjects: [
        {
          label: 'Лицо (15.6 ± 1.4г)',
          category: 'face',
          box_2d: [160, 440, 350, 540],
          confidence: 99.8,
        },
        {
          label: 'Смартфон (98.4%)',
          category: 'other',
          box_2d: [180, 470, 260, 510],
          confidence: 98.4,
        },
      ],
    },
  },
  {
    id: 'case_group_vape',
    title: 'Группа подростков в беседке: курение вейпа и передача',
    subtitle: 'АПК «Безопасный город» • Камера №204 • Сургут',
    categoryTag: 'Групповое нарушение несовершеннолетними',
    imageSvgUrl: createSurveillanceSvg('19:12:30 19.10.2026', 'CAM-204 [СКВЕР ВЕТЕРАНОВ]', 'group_vape'),
    description: 'Детекция группы из трех несовершеннолетних, использование электронного парогенератора (ElfBar), передача устройства между подростками.',
    mockResult: {
      isSmokingOrVaping: true,
      confidencePercentage: 99.3,
      deviceType: 'vape',
      deviceLabelRu: 'Одноразовый электронный испаритель (вейп / disposable)',
      handToMouthPoseDetected: true,
      vaporOrSmokeDetected: true,
      ageEstimation: {
        estimatedAge: 15.8,
        errorMarginYears: 1.3,
        ageRangeString: '14.5–17 лет',
        ageGroup: 'middle_teen',
        ageGroupLabelRu: 'Подростковая группа (15–16 лет)',
        confidencePercentage: 96.5,
        facialMorphologyMarkers: [
          {
            marker: 'Групповой анализ пубертатных признаков',
            description: 'Все 3 субъекта в фокусе обладают выраженными ювенильными признаками',
            indicativeGroup: '14–17 лет',
          },
        ],
        isBiologicallyMinor: true,
      },
      safeCityBiometrics: {
        findFaceMatched: true,
        confidence: 99.75,
        fullName: 'Тихонов Глеб Александрович (основной нарушитель)',
        birthDate: '07.01.2011',
        passportAge: 15,
        educationFacility: 'СОШ №8, 9 «В» класс',
        legalGuardian: 'Тихонова Ольга Сергеевна (мать)',
        guardianPhone: '+7 (922) 651-90-21',
        status: 'minor_under_16',
      },
      legalAssessment: {
        violationDetected: true,
        applicableArticle: 'ст. 5.35 КоАП РФ (дополнительно ст. 6.23 КоАП РФ - вовлечение)',
        articleTitle: 'Курение вейпа в общественном месте несовершеннолетним',
        fineAmountRu: '500 – 2 000 ₽',
        responsibleSubject: 'Родители нарушителя + проверка факта вовлечения других подростков',
        recommendedAction: 'Передача в районную КДН и инспекцию ПДН МВД по району',
        kdnTransferRequired: true,
        gosuslugiNoticeRequired: true,
      },
      analyticalSummaryRu: 'Зафиксировано групповое курение вейпа в беседке сквера. Основной субъект (Тихонов Г.А., 15 лет) совершил серию глубоких затяжек с обильным выдохом аэрозоля. Дело передано на пульт оператора для верификации и отправки в КДН.',
      detectedObjects: [
        {
          label: 'Субъект 1: Несовершеннолетний (15.8г)',
          category: 'face',
          box_2d: [160, 440, 340, 540],
          confidence: 99.7,
        },
        {
          label: 'Вейп-устройство (99.3%)',
          category: 'device',
          box_2d: [230, 460, 290, 490],
          confidence: 99.3,
        },
        {
          label: 'Густое облако пара',
          category: 'smoke_vapor',
          box_2d: [140, 470, 260, 620],
          confidence: 97.4,
        },
      ],
    },
  },
];

export const INITIAL_CAMERA_FEEDS: CameraStreamInfo[] = [
  {
    id: 'CAM-042',
    name: 'Камера 042 • СОШ №17 (Главный вход)',
    zone: 'Территория образовательного учреждения',
    address: 'г. Ставрополь, ул. Ленина, 42',
    resolution: '3840x2160 (4K)',
    fps: 25.0,
    status: 'alert',
    activeAlert: 'ВЕЙПИНГ • ПОДРОСТОК 15 ЛЕТ (СТ. 5.35)',
    imageUrl: PRESET_CASES[0].imageSvgUrl,
    presetCaseId: 'case_teen_vape',
  },
  {
    id: 'CAM-118',
    name: 'Камера 118 • Сквер Победы (Детская площадка)',
    zone: 'Детская игровая зона (ч. 2 ст. 6.24)',
    address: 'г. Новосибирск, Красный проспект, 85',
    resolution: '1920x1080 (FullHD)',
    fps: 25.0,
    status: 'alert',
    activeAlert: 'СИГАРЕТА НА ДЕТСКОЙ ПЛОЩАДКЕ (16 ЛЕТ)',
    imageUrl: PRESET_CASES[1].imageSvgUrl,
    presetCaseId: 'case_teen_cigarette',
  },
  {
    id: 'CAM-087',
    name: 'Камера 087 • Остановка «Проспект Мира»',
    zone: 'Общественный транспорт',
    address: 'г. Сургут, пр-т Мира, 15',
    resolution: '2560x1440 (2K)',
    fps: 25.0,
    status: 'active',
    activeAlert: undefined,
    imageUrl: PRESET_CASES[2].imageSvgUrl,
    presetCaseId: 'case_adult_smoke',
  },
  {
    id: 'CAM-019',
    name: 'Камера 019 • Школьный двор Лицея №22',
    zone: 'Рекреационная зона лицея',
    address: 'г. Новосибирск, ул. Советская, 63',
    resolution: '1920x1080',
    fps: 25.0,
    status: 'active',
    activeAlert: undefined,
    imageUrl: PRESET_CASES[3].imageSvgUrl,
    presetCaseId: 'case_food_false',
  },
  {
    id: 'CAM-063',
    name: 'Камера 063 • Пешеходная зона',
    zone: 'Городской тротуар',
    address: 'г. Ставрополь, ул. Дзержинского, 102',
    resolution: '1920x1080',
    fps: 25.0,
    status: 'active',
    activeAlert: undefined,
    imageUrl: PRESET_CASES[4].imageSvgUrl,
    presetCaseId: 'case_phone_false',
  },
  {
    id: 'CAM-204',
    name: 'Камера 204 • Сквер Ветеранов (Беседка №2)',
    zone: 'Парковая зона',
    address: 'г. Сургут, ул. Университетская, 1',
    resolution: '3840x2160',
    fps: 25.0,
    status: 'warning',
    activeAlert: 'ГРУППОВОЕ СКОПЛЕНИЕ • ВЕЙПИНГ',
    imageUrl: PRESET_CASES[5].imageSvgUrl,
    presetCaseId: 'case_group_vape',
  },
];
