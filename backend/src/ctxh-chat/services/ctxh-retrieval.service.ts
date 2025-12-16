import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CtxhEmbedding } from '../../entities/ctxh-embedding.entity';
import { EmbeddingService } from './embedding.service';
import {
  RetrievalOptions,
  RetrievalResult,
  ProcessedDocument,
  VectorSearchResult,
  MMROptions,
  RetrievalFilters,
} from '../interfaces';

@Injectable()
export class CtxhRetrievalService {
  private readonly logger = new Logger(CtxhRetrievalService.name);

  constructor(
    @InjectRepository(CtxhEmbedding)
    private readonly embeddingRepository: Repository<CtxhEmbedding>,
    
    private readonly embeddingService: EmbeddingService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Retrieve relevant documents based on query
   * Implements vector similarity search with optional MMR for diversification
   */
  async retrieveRelevantDocuments(
    query: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Generate query embedding
      this.logger.debug(`Generating embedding for query: "${query.substring(0, 50)}..."`);
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      
      // Step 2: Extract options with defaults
      const {
        k = this.configService.get('RAG_TOP_K', 5),
        similarityThreshold = this.configService.get('RAG_SIMILARITY_THRESHOLD', 0.7),
        useMMR = false,
        mmrOptions = {},
        filters = {}
      } = options;
      
      // Step 3: Perform vector search
      const searchResults = await this.performVectorSearch(
        queryEmbedding,
        k * 2, // Get more results if MMR is enabled
        similarityThreshold,
        filters
      );
      
      this.logger.debug(`Found ${searchResults.length} documents above threshold ${similarityThreshold}`);
      
      // Step 4: Apply MMR if enabled
      let finalResults = searchResults;
      if (useMMR && searchResults.length > 1) {
        finalResults = this.applyMMR(searchResults, {
          lambda: 0.5,
          diversityWeight: 0.3,
          maxResults: k,
          ...mmrOptions
        });
        this.logger.debug(`MMR reduced results to ${finalResults.length} documents`);
      } else {
        finalResults = searchResults.slice(0, k);
      }
      
      // Step 5: Post-process results
      const processedResults = await this.postProcessResults(finalResults, query);
      
      const retrievalTime = Date.now() - startTime;
      
      return {
        documents: processedResults,
        retrievalTime,
        totalFound: searchResults.length,
        query,
      };
      
    } catch (error) {
      this.logger.error('Retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Perform pgVector similarity search with filters
   */
  private async performVectorSearch(
    queryEmbedding: number[],
    k: number,
    threshold: number,
    filters: RetrievalFilters
  ): Promise<VectorSearchResult[]> {
    let queryBuilder = this.embeddingRepository
      .createQueryBuilder('embedding')
      .innerJoin('embedding.activity', 'activity')
      .innerJoin('activity.organization', 'organization')
      .innerJoin('activity.category', 'category')
      .select([
        'activity.id AS activity_id',
        'activity.name AS activity_name',
        'organization.name AS organization_name',
        'organization.id AS organization_id',
        'category.name AS category_name',
        'category.id AS category_id',
        'activity.start_date AS start_date',
        'activity.end_date AS end_date',
        'activity.location AS location',
        'activity.total_days AS total_days',
        'activity.status AS activity_status',
        'embedding.content_text AS content_text',
        'embedding.embedding_vector AS embedding_vector',
        `1 - (embedding.embedding_vector <=> '[${queryEmbedding.join(',')}]') AS similarity_score`
      ])
      .where(`1 - (embedding.embedding_vector <=> '[${queryEmbedding.join(',')}]') >= :threshold`, { 
        threshold 
      })
      .orderBy('similarity_score', 'DESC')
      .limit(k);

    // Apply organization filter
    if (filters.organizationId) {
      queryBuilder = queryBuilder.andWhere('activity.organization_id = :orgId', {
        orgId: filters.organizationId
      });
    }

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      queryBuilder = queryBuilder.andWhere('activity.status IN (:...statuses)', {
        statuses: filters.status
      });
    }

    // Apply date range filter
    if (filters.dateRange) {
      const { startDate, endDate } = filters.dateRange;
      if (startDate) {
        queryBuilder = queryBuilder.andWhere('activity.start_date >= :startDate', { startDate });
      }
      if (endDate) {
        queryBuilder = queryBuilder.andWhere('activity.end_date <= :endDate', { endDate });
      }
    }

    // Apply category filter
    if (filters.categories && filters.categories.length > 0) {
      queryBuilder = queryBuilder.andWhere('category.name IN (:...categories)', {
        categories: filters.categories
      });
    }

    const results = await queryBuilder.getRawMany();
    return results;
  }

  /**
   * Apply Maximum Marginal Relevance (MMR) for result diversification
   */
  private applyMMR(
    results: VectorSearchResult[],
    options: Required<MMROptions>
  ): VectorSearchResult[] {
    if (results.length <= 1) return results;
    
    const selected: VectorSearchResult[] = [];
    const candidates = [...results];
    const { lambda, maxResults } = options;
    
    // Select first document (highest similarity)
    selected.push(candidates.shift()!);
    
    while (candidates.length > 0 && selected.length < maxResults) {
      let bestCandidate: VectorSearchResult | null = null;
      let bestScore = -Infinity;
      let bestIndex = -1;
      
      candidates.forEach((candidate, index) => {
        // Skip candidates without embedding vectors
        if (!candidate.embedding_vector || !Array.isArray(candidate.embedding_vector)) {
          return;
        }
        
        // Calculate relevance score (similarity to query)
        const relevanceScore = candidate.similarity_score;
        
        // Calculate diversity score (minimum similarity to selected docs)
        let minSimilarityToSelected = Infinity;
        for (const selectedDoc of selected) {
          if (!selectedDoc.embedding_vector || !Array.isArray(selectedDoc.embedding_vector)) {
            continue;
          }
          const similarity = this.cosineSimilarity(
            candidate.embedding_vector,
            selectedDoc.embedding_vector
          );
          minSimilarityToSelected = Math.min(minSimilarityToSelected, similarity);
        }
        
        // MMR score: balance relevance and diversity
        const mmrScore = lambda * relevanceScore - (1 - lambda) * minSimilarityToSelected;
        
        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestCandidate = candidate;
          bestIndex = index;
        }
      });
      
      if (bestCandidate) {
        selected.push(bestCandidate);
        candidates.splice(bestIndex, 1);
      } else {
        break;
      }
    }
    
    return selected;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Post-process and format search results
   */
  private async postProcessResults(
    results: VectorSearchResult[],
    originalQuery: string
  ): Promise<ProcessedDocument[]> {
    return results.map(result => ({
      content: result.content_text,
      metadata: {
        activityId: result.activity_id,
        activityName: result.activity_name,
        organizationName: result.organization_name,
        organizationId: result.organization_id,
        categoryName: result.category_name,
        categoryId: result.category_id,
        startDate: result.start_date,
        endDate: result.end_date,
        location: result.location,
        totalDays: result.total_days,
        status: result.activity_status,
      },
      similarityScore: result.similarity_score,
      source: `ctxh_activity:${result.activity_id}`
    }));
  }

  /**
   * Legacy method for backward compatibility
   */
  async vectorSimilaritySearch(queryVector: number[], topK: number = 5): Promise<any[]> {
    const results = await this.performVectorSearch(
      queryVector,
      topK,
      this.configService.get('RAG_SIMILARITY_THRESHOLD', 0.7),
      {}
    );
    
    return this.postProcessResults(results, '');
  }
}