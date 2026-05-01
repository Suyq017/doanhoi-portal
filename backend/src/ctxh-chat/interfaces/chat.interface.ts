import { ProcessedDocument } from './retrieval.interface';

export interface ChatResponse {
  /** Session ID */
  sessionId: string;
  
  /** Generated response text */
  response: string;
  
  /** Source information */
  sources: SourceInfo[];
  
  /** Total processing time */
  responseTime: number;
  
  /** Response timestamp */
  timestamp: Date;
  
  /** Optional follow-up suggestions */
  followUpSuggestions?: string[];
  
  /** Confidence score (0-100) */
  confidence?: number;
}

export interface SourceInfo {
  activityId: string;
  activityName: string;
  organizationName: string;
  categoryName: string;
  similarityScore: number;
  link?: string;
}

export interface AgentResponse {
  /** Generated content */
  content: string;
  
  /** Retrieved documents */
  sources: ProcessedDocument[];
  
  /** Retrieval time */
  retrievalTime: number;
}

export interface ChatOptions {
  /** Maximum response tokens */
  maxResponseTokens?: number;
  
  /** Temperature for generation (0-1) */
  temperature?: number;
  
  /** Include source links in response */
  includeSourceLinks?: boolean;
  
  /** Enable markdown formatting */
  enableMarkdown?: boolean;
  
  /** Enable follow-up suggestions */
  addFollowUpSuggestions?: boolean;
}

export type ResponseType = 'no_results' | 'single_activity' | 'multiple_activities' | 'general_info' | 'fallback';

export interface FormattedResponse {
  content: string;
  sources: SourceInfo[];
  followUpSuggestions: string[];
  metadata: {
    responseType: ResponseType;
    confidence: number;
    processingTime: number;
  };
}

export interface FormattingOptions {
  includeSourceLinks?: boolean;
  enableMarkdown?: boolean;
  addFollowUpSuggestions?: boolean;
}
