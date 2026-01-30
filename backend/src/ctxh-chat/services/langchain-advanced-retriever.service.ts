import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Document } from '@langchain/core/documents';
import { LangChainVectorStoreService } from './langchain-vector-store.service';
import { LangChainConfig } from '../config/langchain.config';

/**
 * Hybrid search result
 */
interface HybridSearchResult {
  document: Document;
  score: number;
  searchType: 'semantic' | 'mmr' | 'multi_query';
}

/**
 * Advanced Retriever Service
 * Provides multi-query retrieval and hybrid search capabilities
 */
@Injectable()
export class LangChainAdvancedRetrieverService {
  private readonly logger = new Logger(LangChainAdvancedRetrieverService.name);
  private multiQueryRetriever: any = null;
  private MultiQueryRetrieverClass: any = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly vectorStoreService: LangChainVectorStoreService,
  ) {
    this.initMultiQueryRetriever();
  }

  /**
   * Initialize MultiQueryRetriever class using require
   */
  private initMultiQueryRetriever(): void {
    if (!this.MultiQueryRetrieverClass) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const retrieverModule = require('@langchain/classic/retrievers/multi_query');
        this.MultiQueryRetrieverClass = retrieverModule.MultiQueryRetriever;
      } catch (error) {
        this.logger.warn('MultiQueryRetriever not available', error);
      }
    }
  }

  /**
   * Create and cache a multi-query retriever
   * Generates multiple query variations for better recall
   */
  async getMultiQueryRetriever(): Promise<any> {
    if (this.multiQueryRetriever) {
      return this.multiQueryRetriever;
    }

    this.initMultiQueryRetriever();
    
    if (!this.MultiQueryRetrieverClass) {
      throw new Error('MultiQueryRetriever is not available');
    }

    const llm = LangChainConfig.getLLM(this.configService);
    const baseRetriever = this.vectorStoreService.getRetriever(5);

    this.multiQueryRetriever = this.MultiQueryRetrieverClass.fromLLM({
      llm,
      retriever: baseRetriever,
      queryCount: 3,
      verbose: this.configService.get('NODE_ENV') === 'development',
    });

    this.logger.log('Multi-query retriever created');
    return this.multiQueryRetriever;
  }

  /**
   * Perform multi-query retrieval
   * Generates query variations and combines results
   */
  async multiQuerySearch(query: string, k: number = 5): Promise<Document[]> {
    try {
      const retriever = await this.getMultiQueryRetriever();
      const results = await retriever.invoke(query);
      
      // Deduplicate and limit results
      const uniqueDocs = this.deduplicateResults(results, k);
      
      this.logger.debug(
        `Multi-query search: ${results.length} -> ${uniqueDocs.length} unique documents`,
      );
      
      return uniqueDocs;
    } catch (error) {
      this.logger.error('Multi-query search failed', error);
      // Fallback to simple similarity search
      return this.vectorStoreService.similaritySearch(query, k);
    }
  }

  /**
   * Perform hybrid search combining multiple strategies
   */
  async hybridSearch(
    query: string,
    options: {
      k?: number;
      includeSemanticSearch?: boolean;
      includeMMRSearch?: boolean;
      weights?: { semantic: number; mmr: number };
    } = {},
  ): Promise<Document[]> {
    const {
      k = 5,
      includeSemanticSearch = true,
      includeMMRSearch = true,
      weights = { semantic: 0.6, mmr: 0.4 },
    } = options;

    const allResults: HybridSearchResult[] = [];

    try {
      // Semantic search
      if (includeSemanticSearch) {
        const semanticResults = await this.vectorStoreService.similaritySearchWithScore(
          query,
          k * 2,
        );
        
        semanticResults.forEach(([doc, score]) => {
          allResults.push({
            document: doc,
            score: score * weights.semantic,
            searchType: 'semantic',
          });
        });
      }

      // MMR search for diversity
      if (includeMMRSearch) {
        const mmrResults = await this.vectorStoreService.maxMarginalRelevanceSearch(
          query,
          { k: k * 2, fetchK: k * 4, lambda: 0.5 },
        );

        mmrResults.forEach((doc, index) => {
          // Assign decreasing scores based on rank
          const score = (1 - index / mmrResults.length) * weights.mmr;
          allResults.push({
            document: doc,
            score,
            searchType: 'mmr',
          });
        });
      }

      // Combine and rank results
      const rankedResults = this.rankAndCombineResults(allResults, k);

      this.logger.debug(
        `Hybrid search returned ${rankedResults.length} documents`,
      );

      return rankedResults;
    } catch (error) {
      this.logger.error('Hybrid search failed', error);
      // Fallback to simple search
      return this.vectorStoreService.similaritySearch(query, k);
    }
  }

  /**
   * Rank and combine results from multiple search strategies
   */
  private rankAndCombineResults(
    results: HybridSearchResult[],
    k: number,
  ): Document[] {
    // Group by document content (simple deduplication)
    const docScores = new Map<string, { doc: Document; totalScore: number }>();

    for (const result of results) {
      const key = this.getDocumentKey(result.document);
      const existing = docScores.get(key);

      if (existing) {
        // Combine scores (boost if found by multiple methods)
        existing.totalScore += result.score * 0.5; // Diminishing returns for duplicates
      } else {
        docScores.set(key, {
          doc: result.document,
          totalScore: result.score,
        });
      }
    }

    // Sort by combined score and return top k
    const ranked = Array.from(docScores.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, k)
      .map(({ doc }) => doc);

    return ranked;
  }

  /**
   * Deduplicate search results
   */
  private deduplicateResults(docs: Document[], k: number): Document[] {
    const seen = new Set<string>();
    const unique: Document[] = [];

    for (const doc of docs) {
      const key = this.getDocumentKey(doc);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(doc);
      }
      if (unique.length >= k) break;
    }

    return unique;
  }

  /**
   * Generate a unique key for a document
   */
  private getDocumentKey(doc: Document): string {
    // Use activityId if available, otherwise use content hash
    if (doc.metadata?.activityId) {
      return doc.metadata.activityId;
    }
    // Simple hash of first 200 chars of content
    return doc.pageContent.slice(0, 200).replace(/\s+/g, ' ').trim();
  }

  /**
   * Search with contextual compression
   * Extracts only the relevant portions of documents
   */
  async contextualSearch(
    query: string,
    k: number = 5,
  ): Promise<Document[]> {
    // For now, this is a placeholder for future implementation
    // Could use LangChain's ContextualCompressionRetriever
    return this.vectorStoreService.similaritySearch(query, k);
  }

  /**
   * Rerank results using the LLM
   * Useful for improving precision after initial retrieval
   */
  async rerankResults(
    query: string,
    documents: Document[],
    topK: number = 3,
  ): Promise<Document[]> {
    // Simple reranking placeholder
    // In production, could use a cross-encoder or LLM-based reranking
    this.logger.debug(`Reranking ${documents.length} documents to top ${topK}`);
    return documents.slice(0, topK);
  }

  /**
   * Clear cached retrievers (useful when vector store changes)
   */
  clearCache(): void {
    this.multiQueryRetriever = null;
    this.logger.log('Retriever cache cleared');
  }
}
