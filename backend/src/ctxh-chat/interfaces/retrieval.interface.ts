import { ActivityStatus } from '../../entities/ctxh-activity.entity';

export interface RetrievalOptions {
  /** Number of documents to retrieve */
  k?: number;
  
  /** Minimum similarity score threshold (0-1) */
  similarityThreshold?: number;
  
  /** Enable Maximum Marginal Relevance for diversification */
  useMMR?: boolean;
  
  /** MMR configuration options */
  mmrOptions?: MMROptions;
  
  /** Filters to apply on retrieval */
  filters?: RetrievalFilters;
}

export interface RetrievalFilters {
  /** Filter by organization ID */
  organizationId?: string;
  
  /** Filter by activity status */
  status?: ActivityStatus[];
  
  /** Filter by date range */
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  
  /** Filter by category names */
  categories?: string[];
}

export interface MMROptions {
  /** Balance between relevance (1.0) and diversity (0.0) */
  lambda?: number;
  
  /** Diversity weight */
  diversityWeight?: number;
  
  /** Maximum results to return after MMR */
  maxResults?: number;
}

export interface RetrievalResult {
  /** Retrieved and processed documents */
  documents: ProcessedDocument[];
  
  /** Total retrieval time in milliseconds */
  retrievalTime: number;
  
  /** Number of documents before filtering */
  totalFound: number;
  
  /** Original query */
  query: string;
}

export interface ProcessedDocument {
  /** Document content text */
  content: string;
  
  /** Document metadata */
  metadata: DocumentMetadata;
  
  /** Similarity score with query (0-1) */
  similarityScore: number;
  
  /** Source identifier */
  source: string;
}

export interface DocumentMetadata {
  activityId: string;
  activityName: string;
  organizationName: string;
  organizationId: string;
  categoryName: string;
  categoryId: string;
  startDate: Date;
  endDate: Date;
  location: string;
  totalDays: number;
  status: ActivityStatus;
}

export interface VectorSearchResult {
  activity_id: string;
  activity_name: string;
  organization_name: string;
  organization_id: string;
  category_name: string;
  category_id: string;
  start_date: Date;
  end_date: Date;
  location: string;
  total_days: number;
  activity_status: ActivityStatus;
  content_text: string;
  similarity_score: number;
  embedding_vector: number[];
}
