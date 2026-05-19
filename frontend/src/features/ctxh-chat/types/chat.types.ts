/** Khớp với SourceDto backend */
export interface CtxhSource {
  activityId: string;
  activityName: string;
  organizationName: string;
  similarityScore: number;
  content?: string;
  link?: string;
  isRecruiting?: boolean;
}

/** Khớp với ChatResponseDto backend */
export interface CtxhChatResponse {
  sessionId: string;
  response: string;
  sources: CtxhSource[];
  responseTime: number;
  timestamp: string;
  followUpSuggestions?: string[];
  confidence?: number;
}

/** Dữ liệu extra gắn vào AssistantMessage để render sources */
export interface MessageMetadata {
  sources: CtxhSource[];
  responseTime: number;
  confidence?: number;
  followUpSuggestions?: string[];
  sessionId?: string;
}
