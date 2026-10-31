export type VideoSmokingEventType = 'cigarette' | 'vape' | 'hookah' | 'smoke_only' | 'unknown';

export interface VideoSmokingEvent {
  start: string; // "MM:SS" или "HH:MM:SS"
  end: string;
  startSeconds: number;
  endSeconds: number;
  type: VideoSmokingEventType;
  typeLabelRu: string;
  description: string;
  confidence: number; // 0..100
  estimatedAge?: string; // Например: "~20–24 года"
  estimatedAgeYears?: number; // Числовая оценка возраста (0 если не видно)
}

export interface VideoSmokingAnalysis {
  smokingDetected: boolean;
  summary: string;
  events: VideoSmokingEvent[];
  model: string;
  analyzedAt: string;
}
