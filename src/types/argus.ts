export interface FacialMorphologyMarker {
  marker: string;
  description: string;
  indicativeGroup: string;
}

export interface AgeEstimationResult {
  estimatedAge: number;
  errorMarginYears: number; // e.g. ±1.4 года
  ageRangeString: string; // e.g. "14–16 лет"
  ageGroup: 'child' | 'early_teen' | 'middle_teen' | 'older_teen' | 'young_adult' | 'adult';
  ageGroupLabelRu: string;
  confidencePercentage: number;
  facialMorphologyMarkers: FacialMorphologyMarker[];
  isBiologicallyMinor: boolean;
}

export interface DetectedBoundingBox {
  label: string;
  category: 'face' | 'device' | 'hand' | 'smoke_vapor' | 'other';
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0..1000
  confidence: number;
}

export interface ArgusPersonRecord {
  id: string;
  fullName: string;
  birthDate: string;
  age: number;
  isMinor: boolean;
  schoolOrOrg?: string;
  vkUrl?: string;
  photoUrl: string;
  registeredAt: string;
}

export interface BiometricProfileDescriptor {
  gender: 'male' | 'female' | 'unspecified';
  genderLabelRu: string;
  phenotypeDescriptionRu: string;
  biometricHash: string;
  interpupillaryDistanceMm: number;
  facialIndex: number;
  qualityScore: number;
  headPose: string;
}

export interface RussianDatabaseMatch {
  id: string;
  name: string;
  code: 'argus_db' | 'vk' | 'sferum' | 'open_web' | 'pdn_registry' | 'yandex_faces' | 'search4faces';
  category: 'internal' | 'social' | 'education' | 'registry';
  matched: boolean;
  confidence: number;
  statusBadge: string;
  details: string;
  profileUrl?: string;
  actionText?: string;
  sourceType: string;
  recordsCount?: number;
  metaBadge?: string;
}

export interface CandidateMatchRecord {
  id: string;
  fullName: string;
  age: number;
  birthDate?: string;
  schoolOrOrg?: string;
  photoUrl?: string;
  similarityScore: number;
  isMatch: boolean;
  statusBadge: string;
  details: string;
}

export interface SafeCityBiometrics {
  findFaceMatched: boolean;
  matchedInArgusDb?: boolean;
  matchedPersonId?: string;
  confidence: number;
  fullName: string;
  birthDate: string;
  passportAge: number;
  educationFacility?: string;
  legalGuardian?: string;
  guardianPhone?: string;
  residenceAddress?: string;
  status: 'minor_under_16' | 'minor_16_to_17' | 'adult' | 'unidentified';
  onlineSearchSource?: string;
  searchMatchSnippet?: string;
  biometricProfile?: BiometricProfileDescriptor;
  candidateMatches?: CandidateMatchRecord[];
  vkProfile?: {
    matched: boolean;
    username: string;
    fullName: string;
    searchQuery: string;
    vkSearchUrl: string;
    yandexSearchUrl: string;
    search4facesUrl?: string;
    profileUrl: string;
    city: string;
    confidence: number;
  };
  databases?: RussianDatabaseMatch[];
}

export interface LegalAssessment {
  violationDetected: boolean;
  applicableArticle: string;
  articleTitle: string;
  fineAmountRu: string;
  responsibleSubject: string;
  recommendedAction: string;
  kdnTransferRequired: boolean;
  gosuslugiNoticeRequired: boolean;
}

export interface ArgusAnalysisResponse {
  personDetected?: boolean;
  isSmokingOrVaping: boolean;
  isHoldingAlcohol?: boolean;
  alcoholLabelRu?: string;
  confidencePercentage: number;
  deviceType: 'vape' | 'cigarette' | 'heated_tobacco' | 'hookah' | 'alcohol' | 'none' | 'food_or_phone';
  deviceLabelRu: string;
  handToMouthPoseDetected: boolean;
  vaporOrSmokeDetected: boolean;
  ageEstimation: AgeEstimationResult;
  safeCityBiometrics: SafeCityBiometrics;
  legalAssessment: LegalAssessment;
  analyticalSummaryRu: string;
  detectedObjects: DetectedBoundingBox[];
}

export interface PresetCase {
  id: string;
  title: string;
  subtitle: string;
  categoryTag: string;
  imageSvgUrl: string;
  description: string;
  mockResult: ArgusAnalysisResponse;
}

export interface IncidentRecord {
  id: string;
  timestamp: string;
  cameraId: string;
  cameraName: string;
  locationName: string;
  imageUrl: string;
  analysis: ArgusAnalysisResponse;
  status: 'pending' | 'verified_kdn' | 'rejected_false_positive' | 'closed_adult';
  operatorComment?: string;
  protocolNumber?: string;
}

export interface CameraStreamInfo {
  id: string;
  name: string;
  zone: string;
  address: string;
  resolution: string;
  fps: number;
  status: 'active' | 'warning' | 'alert';
  activeAlert?: string;
  imageUrl: string;
  presetCaseId: string;
}
