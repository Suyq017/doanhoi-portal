import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { LangChainConfig } from '../config/langchain.config';
import { Client } from 'pg';

/**
 * LangChain Vector Store Service
 * Wraps PGVectorStore for seamless integration with existing ctxh_embeddings table
 * Supports both Ollama (1024d) and Gemini (768d) embeddings
 */
@Injectable()
export class LangChainVectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(LangChainVectorStoreService.name);
  private vectorStore: any;
  private embeddings: Embeddings;
  private dbConfig: any;
  private initialized = false;
  private embeddingDimension: number;

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

      // Initialize embeddings and get dimension
      this.embeddings = LangChainConfig.getEmbeddings(this.configService);
      this.embeddingDimension = LangChainConfig.getEmbeddingDimension(this.configService);
      
      const modelType = LangChainConfig.isUsingLocalModel(this.configService) ? 'Ollama' : 'Gemini';
      this.logger.log(`Using ${modelType} embeddings with dimension: ${this.embeddingDimension}`);

      // Get database config
      const dbConfig = LangChainConfig.getVectorStoreConfig(this.configService);
      this.dbConfig = dbConfig;

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
        embeddingDimension: 1024, // Ensure this matches the embedding dimension
      };

      // Initialize PGVectorStore
      // Let it use the existing table without modifications
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
      this.logger.log(`LangChain VectorStore initialized successfully (dimension: ${this.embeddingDimension})`);
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
   * Add documents to the vector store with custom SQL to include activity_id
   */
  async addDocuments(documents: Document[]): Promise<void> {
    await this.ensureInitialized();

    if (!documents || documents.length === 0) {
      this.logger.warn('No documents to add');
      return;
    }

    // Validate documents have content
    const validDocs = documents.filter(doc => {
      if (!doc.pageContent || doc.pageContent.trim().length === 0) {
        this.logger.warn(`Skipping document with empty content: ${JSON.stringify(doc.metadata)}`);
        return false;
      }
      if (!doc.metadata?.activityId) {
        this.logger.warn(`Skipping document without activityId: ${doc.pageContent.substring(0, 50)}...`);
        return false;
      }
      return true;
    });

    if (validDocs.length === 0) {
      this.logger.warn('No valid documents after filtering');
      return;
    }

    this.logger.debug(`Adding ${validDocs.length}/${documents.length} valid documents...`);

    // Create database client for direct insert
    const client = new Client({
      host: this.dbConfig.host,
      port: this.dbConfig.port,
      database: this.dbConfig.database,
      user: this.dbConfig.user,
      password: this.dbConfig.password,
    });

    try {
      await client.connect();

      for (const doc of validDocs) {
        try {
          // Generate embedding
          const embedding = await this.embeddings.embedQuery(doc.pageContent);
          
          if (!embedding || embedding.length === 0) {
            this.logger.warn(`Empty embedding for activity: ${doc.metadata.activityId}`);
            continue;
          }

          // Format embedding as PostgreSQL vector string
          const embeddingStr = `[${embedding.join(',')}]`;

          // Insert with activity_id
          await client.query(
            `INSERT INTO ctxh_embeddings (activity_id, content_text, embedding, metadata, chunk_index)
             VALUES ($1, $2, $3::vector, $4, $5)`,
            [
              doc.metadata.activityId,
              doc.pageContent,
              embeddingStr,
              JSON.stringify(doc.metadata),
              doc.metadata.chunkIndex || 0,
            ]
          );
        } catch (docError) {
          this.logger.error(`Failed to insert document for activity ${doc.metadata.activityId}: ${docError.message}`);
          throw docError;
        }
      }

      this.logger.log(`✅ Successfully added ${validDocs.length} documents to vector store`);
    } catch (error) {
      this.logger.error('Failed to add documents', error.stack || error);
      throw error;
    } finally {
      await client.end();
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
  getEmbeddings(): Embeddings {
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
