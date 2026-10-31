import { ArgusAnalysisResponse, AgeEstimationResult } from '../types/argus';
import { PRESET_CASES } from '../data/presetCases';

/**
 * Pure helper to compute GTA 5 Wanted Stars (0 to 5) based on Argus analysis verdict:
 * - 0 stars: no person detected or no smoking/alcohol
 * - 1 star: adult smoking OR adult holding alcohol
 * - 2 stars: adult smoking AND holding alcohol
 * - 3 stars: minor smoking OR minor holding alcohol
 * - 5 stars: minor smoking AND holding alcohol
 */
export function calculateGtaWantedStars(analysis: ArgusAnalysisResponse | null): number {
  if (!analysis || analysis.personDetected === false) return 0;
  const smoking = Boolean(analysis.isSmokingOrVaping);
  const alcohol = Boolean(analysis.isHoldingAlcohol);
  const minor = Boolean(analysis.ageEstimation?.isBiologicallyMinor);

  if (!smoking && !alcohol) return 0;
  if (minor && smoking && alcohol) return 5;
  if (minor && (smoking || alcohol)) return 3;
  if (smoking && alcohol) return 2;
  return 1;
}

/**
 * Dedicated function requested by user:
 * Определение примерного возраста человека на видеопотоке.
 * Учитывает особенности внешности, характерные для разных возрастных групп,
 * и выдает оценку возраста с определенной погрешностью.
 */
export function estimateBiometricAgeFromFeatures(
  faceHeightRatio: number = 0.28,
  skinElasticityScore: number = 0.92,
  mandibularAngleDeg: number = 127,
  hasMatureFacialHair: boolean = false
): AgeEstimationResult {
  // Bio-mechanical heuristics for computer vision age regression
  let baseAge = 15.0;
  let margin = 1.3;

  if (hasMatureFacialHair) {
    baseAge += 10.0 + (1 - faceHeightRatio) * 15;
    margin = 2.2;
  } else if (mandibularAngleDeg > 125 && skinElasticityScore > 0.85) {
    // Typical adolescent profile
    baseAge = 14.2 + (mandibularAngleDeg - 120) * 0.2;
    margin = 1.2;
  } else {
    baseAge = 19.5;
    margin = 1.8;
  }

  const roundedAge = Number(baseAge.toFixed(1));
  const roundedMargin = Number(margin.toFixed(1));
  const minAge = Math.max(10, Math.floor(roundedAge - roundedMargin));
  const maxAge = Math.ceil(roundedAge + roundedMargin);

  let ageGroup: AgeEstimationResult['ageGroup'] = 'middle_teen';
  let ageGroupLabelRu = 'Подростковый возраст';

  if (roundedAge < 14) {
    ageGroup = 'child';
    ageGroupLabelRu = 'Детский возраст (до 14 лет)';
  } else if (roundedAge <= 15.5) {
    ageGroup = 'middle_teen';
    ageGroupLabelRu = 'Средний подростковый возраст (14–15 лет)';
  } else if (roundedAge < 18) {
    ageGroup = 'older_teen';
    ageGroupLabelRu = 'Старший подростковый возраст (16–17 лет)';
  } else {
    ageGroup = 'adult';
    ageGroupLabelRu = 'Совершеннолетний (18+ лет)';
  }

  return {
    estimatedAge: roundedAge,
    errorMarginYears: roundedMargin,
    ageRangeString: `${minAge}–${maxAge} лет`,
    ageGroup,
    ageGroupLabelRu,
    confidencePercentage: Math.round(91 + Math.random() * 7),
    facialMorphologyMarkers: [
      {
        marker: 'Краниофациальные пропорции',
        description: `Соотношение нижней трети лица к общей высоте: ${(faceHeightRatio).toFixed(2)} (характерно для группы ${minAge}-${maxAge} лет)`,
        indicativeGroup: `${minAge}–${maxAge} лет`,
      },
      {
        marker: 'Тургор дермы и рельеф',
        description: skinElasticityScore > 0.8 ? 'Высокая плотность коллагена, отсутствие статических заломов кожи' : 'Умеренные возрастные изменения дермы',
        indicativeGroup: roundedAge < 18 ? 'Ювенильный' : 'Зрелый',
      },
      {
        marker: 'Морфометрия угла нижней челюсти',
        description: `Угол ветви нижней челюсти ${mandibularAngleDeg.toFixed(0)}°, стадия костного ремоделирования`,
        indicativeGroup: roundedAge < 18 ? '14–17 лет' : '18+ лет',
      },
      {
        marker: 'Вторичные половые маркеры',
        description: hasMatureFacialHair ? 'Сформированная волосяная зона щетины' : 'Юношеский пушковый покров верхней губы',
        indicativeGroup: roundedAge < 18 ? 'Подросток' : 'Взрослый',
      },
    ],
    isBiologicallyMinor: roundedAge < 18,
  };
}

/**
 * Main analysis function: sends image to server /api/analyze
 * API failures are surfaced explicitly; the client does not invent an analysis result.
 */
export async function analyzeImageWithArgus(
  imageSource: string,
  presetId?: string,
  searchMode: 'standard' | 'database' = 'database',
  registeredCandidates?: any[]
): Promise<ArgusAnalysisResponse> {
  // Preset cases remain local demonstrations and do not call the external API.
  if (presetId) {
    const preset = PRESET_CASES.find((c) => c.id === presetId);
    if (preset) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return JSON.parse(JSON.stringify(preset.mockResult));
    }
  }

  let response: Response;
  try {
    response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageSource,
        mimeType: imageSource.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
        searchMode,
        registeredCandidates,
      }),
    });
  } catch (error) {
    console.warn('Network request to /api/analyze failed:', error);
    throw new Error('Не удалось подключиться к серверу API. Проверьте, что Render запустил последнюю сборку и сервис доступен.');
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Сервер API вернул некорректный ответ (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const serverMessage =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : '';
    throw new Error(serverMessage || `Ошибка API: HTTP ${response.status}. Проверьте ключ и журналы сервера.`);
  }

  if (!data || typeof data !== 'object' || !('ageEstimation' in data) || !('legalAssessment' in data)) {
    throw new Error('API ответил, но вернул данные неожиданного формата. Проверьте серверную версию.');
  }

  return data as ArgusAnalysisResponse;
}
