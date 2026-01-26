import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Document } from '@langchain/core/documents';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { LangChainConfig } from '../config/langchain.config';

/**
 * LangChain Vector Store Service
 * Wraps PGVectorStore for seamless integration with existing ctxh_embeddings table
 */
@Injectable()
export class LangChainVectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(LangChainVectorStoreService.name);
  private vectorStore: any;
  private embeddings: GoogleGenerativeAIEmbeddings;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Initialize the Vector Store connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.logger.log('Initializing LangChain VectorStore...');

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PGVectorStore } = require('@langchain/community/vectorstores/pgvector');

      // Initialize embeddings
      this.embeddings = LangChainConfig.getEmbeddings(this.configService);

      // Get database config
      const dbConfig = LangChainConfig.getVectorStoreConfig(this.configService);

      // PostgreSQL connection config
      const poolConfig = {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
        max: 10, // Maximum pool connections
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };

      // Initialize PGVectorStore with existing table schema
      this.vectorStore = await PGVectorStore.initialize(this.embeddings, {
        postgresConnectionOptions: poolConfig,
        tableName: 'ctxh_embeddings',
        columns: {
          idColumnName: 'id',
          vectorColumnName: 'embedding',
          contentColumnName: 'content_text',
          metadataColumnName: 'metadata',
        },
        distanceStrategy: 'cosine',
      });

      this.initialized = true;
      this.logger.log('LangChain VectorStore initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize LangChain VectorStore', error);
      throw error;
    }
  }

  /**
   * Ensure vector store is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Perform similarity search with scores
   */
  async similaritySearchWithScore(
    query: string,
    k: number = 5,
  ): Promise<[Document, number][]> {
    await this.ensureInitialized();

    try {
      const results = await this.vectorStore.similaritySearchWithScore(query, k);
      this.logger.debug(`Similarity search returned ${results.length} documents`);
      return results;
    } catch (error) {
      this.logger.error('Similarity search failed', error);
      throw error;
    }
  }

  /**
   * Perform similarity search (documents only)
   */
  async similaritySearch(query: string, k: number = 5): Promise<Document[]> {
    await this.ensureInitialized();
    return this.vectorStore.similaritySearch(query, k);
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(documents: Document[]): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.vectorStore.addDocuments(documents);
      this.logger.log(`Added ${documents.length} documents to vector store`);
    } catch (error) {
      this.logger.error('Failed to add documents', error);
      throw error;
    }
  }

  /**
   * Get a retriever for use in LangChain chains
   */
  getRetriever(k: number = 5): VectorStoreRetriever {
    if (!this.initialized) {
      throw new Error('VectorStore not initialized. Call initialize() first.');
    }

    return this.vectorStore.asRetriever({
      k,
      searchType: 'similarity',
    });
  }

  /**
   * Get the underlying vector store instance
   */
  getVectorStore(): any {
    if (!this.initialized) {
      throw new Error('VectorStore not initialized. Call initialize() first.');
    }
    return this.vectorStore;
  }

  /**
   * Get the embeddings instance
   */
  getEmbeddings(): GoogleGenerativeAIEmbeddings {
    return this.embeddings;
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Perform MMR (Maximum Marginal Relevance) search
   * Returns diverse results that are relevant but not too similar to each other
   */
  async maxMarginalRelevanceSearch(
    query: string,
    options: {
      k?: number;
      fetchK?: number;
      lambda?: number;
    } = {},
  ): Promise<Document[]> {
    await this.ensureInitialized();

    const { k = 5, fetchK = 20, lambda = 0.5 } = options;

    try {
      const results = await this.vectorStore.maxMarginalRelevanceSearch(query, {
        k,
        fetchK,
        lambda,
      });
      this.logger.debug(`MMR search returned ${results.length} documents`);
      return results;
    } catch (error) {
      this.logger.error('MMR search failed', error);
      throw error;
    }
  }
}
