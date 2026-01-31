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
 */
@Injectable()
export class LangChainVectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(LangChainVectorStoreService.name);
  private vectorStore: any;
  private embeddings: Embeddings;
  private dbConfig: any;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Initialize the Vector Store connection
   * Sử dụng direct SQL thay vì PGVectorStore để tránh auto-alter table dimension
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.logger.log('Initializing LangChain VectorStore (Direct SQL mode)...');

      // Initialize embeddings
      this.embeddings = LangChainConfig.getEmbeddings(this.configService);

      // Get database config
      const dbConfig = LangChainConfig.getVectorStoreConfig(this.configService);
      this.dbConfig = dbConfig;

      // Verify database connection and vector dimension
      const client = new Client({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
      });

      try {
        await client.connect();
        
        // Check current vector dimension in database
        const dimResult = await client.query(`
          SELECT atttypmod as dimension 
          FROM pg_attribute 
          WHERE attrelid = 'ctxh_embeddings'::regclass 
          AND attname = 'embedding'
        `);
        
        const dbDimension = dimResult.rows[0]?.dimension || 'unknown';
        const expectedDimension = LangChainConfig.getEmbeddingDimension(this.configService);
        
        this.logger.log(`📊 Database embedding dimension: ${dbDimension}`);
        this.logger.log(`🎯 Expected embedding dimension: ${expectedDimension}`);
        
        if (dbDimension !== expectedDimension) {
          this.logger.warn(`⚠️ Dimension mismatch! DB: ${dbDimension}, Expected: ${expectedDimension}`);
          this.logger.warn(`Run: ALTER TABLE ctxh_embeddings ALTER COLUMN embedding TYPE vector(${expectedDimension})`);
        }
      } finally {
        await client.end();
      }

      this.initialized = true;
      this.logger.log('✅ LangChain VectorStore initialized (Direct SQL mode)');
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
   * Perform similarity search with scores using direct SQL
   */
  async similaritySearchWithScore(
    query: string,
    k: number = 5,
  ): Promise<[Document, number][]> {
    await this.ensureInitialized();

    const client = new Client({
      host: this.dbConfig.host,
      port: this.dbConfig.port,
      database: this.dbConfig.database,
      user: this.dbConfig.user,
      password: this.dbConfig.password,
    });

    try {
      await client.connect();

      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query);
      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      // Cosine similarity search using pgvector
      const result = await client.query(
        `SELECT id, content_text, metadata, 1 - (embedding <=> $1::vector) as similarity
         FROM ctxh_embeddings
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [embeddingStr, k]
      );

      const results: [Document, number][] = result.rows.map((row) => [
        new Document({
          pageContent: row.content_text,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        }),
        row.similarity,
      ]);

      this.logger.debug(`Similarity search returned ${results.length} documents`);
      return results;
    } catch (error) {
      this.logger.error('Similarity search failed', error);
      throw error;
    } finally {
      await client.end();
    }
  }

  /**
   * Perform similarity search (documents only)
   */
  async similaritySearch(query: string, k: number = 5): Promise<Document[]> {
    const results = await this.similaritySearchWithScore(query, k);
    return results.map(([doc]) => doc);
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
   * Returns a custom retriever that uses direct SQL
   */
  getRetriever(k: number = 5): VectorStoreRetriever {
    if (!this.initialized) {
      throw new Error('VectorStore not initialized. Call initialize() first.');
    }

    // Create a simple retriever wrapper
    const self = this;
    return {
      async invoke(query: string): Promise<Document[]> {
        return self.similaritySearch(query, k);
      },
      async getRelevantDocuments(query: string): Promise<Document[]> {
        return self.similaritySearch(query, k);
      },
    } as unknown as VectorStoreRetriever;
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
   * Perform MMR (Maximum Marginal Relevance) search using direct SQL
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
      // Fetch more candidates first, then apply MMR
      const candidates = await this.similaritySearchWithScore(query, fetchK);
      
      if (candidates.length === 0) {
        return [];
      }

      // Simple MMR implementation: select diverse documents
      const selected: Document[] = [];
      const selectedIndices = new Set<number>();

      // Always include the most relevant document first
      selected.push(candidates[0][0]);
      selectedIndices.add(0);

      while (selected.length < k && selected.length < candidates.length) {
        let bestScore = -Infinity;
        let bestIdx = -1;

        for (let i = 0; i < candidates.length; i++) {
          if (selectedIndices.has(i)) continue;

          const relevance = candidates[i][1];
          // Simplified diversity penalty based on position
          const diversityPenalty = 1 - (selected.length / fetchK);
          const mmrScore = lambda * relevance + (1 - lambda) * diversityPenalty;

          if (mmrScore > bestScore) {
            bestScore = mmrScore;
            bestIdx = i;
          }
        }

        if (bestIdx >= 0) {
          selected.push(candidates[bestIdx][0]);
          selectedIndices.add(bestIdx);
        } else {
          break;
        }
      }

      this.logger.debug(`MMR search returned ${selected.length} documents`);
      return selected;
    } catch (error) {
      this.logger.error('MMR search failed', error);
      throw error;
    }
  }
}
