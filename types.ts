export interface VideoClip {
  id: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  title: string;
  summary: string;
  viralityScore: number; // 0-100
  reasoning: string;
  tags: string[];
  transcriptStub: string;
  embedding?: number[];
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export interface ProcessingProgress {
  stage: string;
  progress: number; // 0-100
}

export interface VideoFrame {
  timestamp: number;
  data: string; // Base64
}

export interface CommentAnalysis {
  sentiment: 'Positive' | 'Negative' | 'Neutral' | 'Mixed';
  summary: string;
  keyTopics: string[];
  viewerRequests: string[];
  contentSuggestions: string[];
}

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}
