import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { LangChainConfig } from '../config/langchain.config';
import {
  PGVectorStore,
  DistanceStrategy,
} from '@langchain/community/vectorstores/pgvector';
import { PoolConfig } from 'pg';
import { Client } from 'pg';
import { ActivityStatus } from '@/entities/ctxh-activity.entity';
import { MetadataFilters } from '../dto/filter-extraction.dto';
import { getSearchTermsForLocation } from '../constants/location.constants';

/**
 * LangChain Vector Store Service
 * Wraps PGVectorStore for seamless integration with existing ctxh_embeddings table
 */
@Injectable()
export class LangChainVectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(LangChainVectorStoreService.name);
  private vectorStore: PGVectorStore;
  private embeddings: Embeddings;
  private dbConfig: any;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Initialize the Vector Store connection using PGVectorStore
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.logger.log('Initializing LangChain VectorStore with PGVectorStore...');

      // Initialize embeddings
      this.embeddings = LangChainConfig.getEmbeddings(this.configService);

      // Get database config
      const dbConfig = LangChainConfig.getVectorStoreConfig(this.configService);
      this.dbConfig = dbConfig;

      const expectedDimension = LangChainConfig.getEmbeddingDimension(this.configService);
      this.logger.log(`🎯 Expected embedding dimension: ${expectedDimension}`);

      // Initialize PGVectorStore with existing ctxh_embeddings table
      this.vectorStore = await PGVectorStore.initialize(this.embeddings, {
        postgresConnectionOptions: {
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user,
          password: dbConfig.password,
        } as PoolConfig,
        tableName: 'ctxh_embeddings',
        columns: {
          idColumnName: 'id',
          vectorColumnName: 'embedding',
          contentColumnName: 'content_text',
          metadataColumnName: 'metadata',
        },
        distanceStrategy: 'cosine' as DistanceStrategy,
      });

      this.initialized = true;
      this.logger.log('✅ LangChain VectorStore initialized with PGVectorStore');
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

  private normalizeActivityStatus(status: unknown): ActivityStatus | undefined {
    if (!status || typeof status !== 'string') {
      return undefined;
    }

    const normalized = status.toUpperCase();
    if (Object.values(ActivityStatus).includes(normalized as ActivityStatus)) {
      return normalized as ActivityStatus;
    }

    return undefined;
  }

  private shouldIncludeInRetrieval(doc: Document): boolean {
    const status = this.normalizeActivityStatus(doc.metadata?.status);
    return status !== ActivityStatus.DRAFT;
  }

  private matchesDateAndStatusFilter(
    doc: Document,
    today: Date,
    statusFilter: 'ongoing' | 'upcoming' | 'ended' | 'all',
  ): boolean {
    const meta = doc.metadata || {};
    const activityStatus = this.normalizeActivityStatus(meta.status);

    if (activityStatus === ActivityStatus.DRAFT) {
      return false;
    }

    if (statusFilter === 'all') {
      return true;
    }

    const hasStart = !!meta.startDate;
    const hasEnd = !!meta.endDate;
    const start = hasStart ? new Date(meta.startDate) : null;
    const end = hasEnd ? new Date(meta.endDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(0, 0, 0, 0);

    if (statusFilter === 'ended') {
      if (
        activityStatus === ActivityStatus.COMPLETED ||
        activityStatus === ActivityStatus.CANCELLED
      ) {
        return true;
      }

      return activityStatus === ActivityStatus.ACTIVE && !!end && today > end;
    }

    // Only ACTIVE activities can be considered ongoing/upcoming and potentially recruitable.
    if (activityStatus !== ActivityStatus.ACTIVE || !start || !end) {
      return false;
    }

    if (statusFilter === 'ongoing') {
      return today >= start && today <= end;
    }

    if (statusFilter === 'upcoming') {
      return today < start;
    }

    return true;
  }

  /**
   * Perform similarity search with scores using PGVectorStore.
   *
   * Note: PGVectorStore with distanceStrategy='cosine' returns **cosine distance**
   * (0 = identical vectors, 1 = opposite vectors), NOT cosine similarity.
   * We convert: similarityScore = 1 - cosineDistance so that higher = more relevant.
   */
  async similaritySearchWithScore(
    query: string,
    k: number = 5,
  ): Promise<[Document, number][]> {
    await this.ensureInitialized();

    try {
      const rawResults = await this.vectorStore.similaritySearchWithScore(query, k * 3);

      // Debug: log the first few raw scores to verify what PGVectorStore actually returns
      if (rawResults.length > 0) {
        const sample = rawResults.slice(0, 3).map(([doc, s]) => ({
          activity: doc.metadata?.activityName,
          rawScore: s,
        }));
        this.logger.debug(`RAW scores from PGVectorStore (cosine distance): ${JSON.stringify(sample)}`);
      }

      const filteredResults = rawResults
        .filter(([doc]) => this.shouldIncludeInRetrieval(doc))
        .map(([doc, cosineDistance]) => {
          // Convert cosine distance → cosine similarity
          const similarityScore = 1 - cosineDistance;
          return [
            {
              ...doc,
              metadata: { ...doc.metadata, score: similarityScore },
            },
            similarityScore,
          ] as [Document, number];
        })
        .slice(0, k);

      this.logger.debug(
        `Similarity search returned ${filteredResults.length}/${rawResults.length} documents after ActivityStatus filtering`,
      );
      return filteredResults;
    } catch (error) {
      this.logger.error('Similarity search failed', error);
      throw error;
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
   * Perform similarity search with post-retrieval date filter.
   * Fetches k*3 candidates then filters by real-time status derived from
   * metadata.startDate / metadata.endDate compared to `currentDate`.
   * Preserves similarity scores in document metadata.
   *
   * @param query - search query
   * @param k - max documents to return
   * @param currentDate - ISO date string (YYYY-MM-DD) for filtering
   * @param statusFilter - 'ongoing' | 'upcoming' | 'ended' | 'all'
   */
  async similaritySearchWithDateFilter(
    query: string,
    k: number = 5,
    currentDate?: string,
    statusFilter: 'ongoing' | 'upcoming' | 'ended' | 'all' = 'all',
  ): Promise<Document[]> {
    // Fetch with scores to preserve them through filtering
    const candidatesWithScores = await this.similaritySearchWithScore(query, k * 3);
    const candidates = candidatesWithScores.map(([doc]) => doc);

    if (statusFilter === 'all' || !currentDate) {
      return candidates
        .filter(doc => this.shouldIncludeInRetrieval(doc))
        .slice(0, k);
    }

    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);

    const filtered = candidates.filter(doc =>
      this.matchesDateAndStatusFilter(doc, today, statusFilter),
    );

    this.logger.debug(
      `Date+status filter '${statusFilter}' returned ${filtered.length}/${candidates.length} documents for ${currentDate}`,
    );

    return filtered.slice(0, k);
  }

  /**
   * Perform similarity search with **pre-retrieval** metadata filters.
   *
   * Instead of fetching K*3 candidates and filtering in memory,
   * this method pushes filter predicates into the SQL WHERE clause
   * so pgvector only ranks vectors that already match the metadata.
   *
   * Falls back to the regular `similaritySearchWithDateFilter`
   * when the filters are empty.
   *
   * @param query  Natural-language search query
   * @param filters  Structured metadata filters from the extraction service
   * @param k  Maximum documents to return
   * @param currentDate  ISO YYYY-MM-DD for date computations
   */
  async similaritySearchWithMetadataFilters(
    query: string,
    filters: MetadataFilters,
    k: number = 5,
    currentDate?: string,
  ): Promise<Document[]> {
    await this.ensureInitialized();

    try {
      // 1. Embed the query
      const queryEmbedding = await this.embeddings.embedQuery(query);
      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      // 2. Build dynamic WHERE clauses
      const conditions: string[] = [];
      const params: any[] = [embeddingStr]; // $1 = query vector
      let paramIndex = 2;

      // Always exclude DRAFT activities
      conditions.push(`metadata->>'status' != 'DRAFT'`);

      // --- Status (ongoing / upcoming / ended) ---
      if (filters.status && filters.status.length > 0) {
        const statusConditions = this.buildStatusConditions(
          filters.status,
          currentDate,
          params,
          paramIndex,
        );
        if (statusConditions.clause) {
          conditions.push(statusConditions.clause);
          paramIndex = statusConditions.nextIndex;
        }
      }

      // --- Category ---
      // Tạm thời vô hiệu hóa filter category theo yêu cầu
      /*
      if (filters.category && filters.category.length > 0) {
        const placeholders = filters.category.map((cat) => {
          params.push(cat);
          return `$${paramIndex++}`;
        });
        conditions.push(
          `metadata->>'categoryName' IN (${placeholders.join(', ')})`,
        );
      }
      */

      // --- Organization keywords (ILIKE) ---
      if (filters.organizationKeywords && filters.organizationKeywords.length > 0) {
        const orgClauses = filters.organizationKeywords.map((kw) => {
          params.push(`%${kw}%`);
          return `metadata->>'organizationName' ILIKE $${paramIndex++}`;
        });
        conditions.push(`(${orgClauses.join(' OR ')})`);
      }

      // --- Location (ILIKE) ---
      if (filters.locationRaw && filters.locationRaw.length > 0) {
        const locClauses: string[] = [];
        filters.locationRaw.forEach((loc) => {
          const searchTerms = getSearchTermsForLocation(loc);
          if (searchTerms.length > 0) {
            const aliasClauses: string[] = [];
            searchTerms.forEach((term) => {
              params.push(`%${term}%`);
              aliasClauses.push(`metadata->>'location' ILIKE $${paramIndex++}`);
            });
            locClauses.push(`(${aliasClauses.join(' OR ')})`);
          }
        });
        
        if (locClauses.length > 0) {
          conditions.push(`(${locClauses.join(' OR ')})`);
        }
      }

      // --- Date range ---
      if (filters.dateRange) {
        const dateClause = this.buildDateRangeCondition(
          filters.dateRange,
          currentDate,
          params,
          paramIndex,
        );
        if (dateClause.clause) {
          conditions.push(dateClause.clause);
          paramIndex = dateClause.nextIndex;
        }
      }

      // 3. Compose full SQL
      const whereSQL =
        conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      params.push(k); // last param = LIMIT
      const limitParam = `$${paramIndex}`;

      // Priority Boost: Substract distance (increase similarity) if the activity starts or ends exactly today
      let orderByStr = `embedding <=> $1::vector`;
      let scoreStr = `1 - (embedding <=> $1::vector)`;

      if (currentDate) {
        // Boost by 0.15 if starts today, 0.10 if ends today (since lower pgvector distance = better)
        orderByStr = `
          (embedding <=> $1::vector) - (
            CASE 
              WHEN (metadata->>'startDate')::date = '${currentDate}'::date THEN 0.15
              WHEN (metadata->>'endDate')::date = '${currentDate}'::date THEN 0.10
              ELSE 0 
            END
          )
        `;
        scoreStr = `
          1 - (embedding <=> $1::vector) + (
            CASE 
              WHEN (metadata->>'startDate')::date = '${currentDate}'::date THEN 0.15
              WHEN (metadata->>'endDate')::date = '${currentDate}'::date THEN 0.10
              ELSE 0 
            END
          )
        `;
      }

      const sql = `
        SELECT
          id,
          content_text,
          metadata,
          ${scoreStr} AS similarity_score
        FROM ctxh_embeddings
        ${whereSQL}
        ORDER BY ${orderByStr}
        LIMIT ${limitParam}
      `;

      this.logger.debug(
        `Metadata-filtered SQL (${conditions.length} conditions, k=${k})`,
      );

      // 4. Execute
      const client = new Client({
        host: this.dbConfig.host,
        port: this.dbConfig.port,
        database: this.dbConfig.database,
        user: this.dbConfig.user,
        password: this.dbConfig.password,
      });

      try {
        await client.connect();
        const result = await client.query(sql, params);

        const documents: Document[] = result.rows.map((row: any) => {
          const metadata =
            typeof row.metadata === 'string'
              ? JSON.parse(row.metadata)
              : row.metadata;

          return new Document({
            pageContent: row.content_text,
            metadata: {
              ...metadata,
              score: parseFloat(row.similarity_score),
            },
          });
        });

        this.logger.debug(
          `Metadata-filtered search returned ${documents.length} documents`,
        );

        return documents;
      } finally {
        await client.end();
      }
    } catch (error) {
      this.logger.error('Metadata-filtered search failed, falling back', error);
      // Graceful fallback to un-filtered search
      return this.similaritySearchWithDateFilter(
        query,
        k,
        currentDate,
        'all',
      );
    }
  }

  // ─── Private helpers for SQL clause building ──────────────────────────

  /**
   * Build WHERE clause fragment for status-based filtering
   * using metadata startDate / endDate and ActivityStatus.
   */
  private buildStatusConditions(
    statuses: string[],
    currentDate: string | undefined,
    params: any[],
    paramIndex: number,
  ): { clause: string; nextIndex: number } {
    if (!currentDate) {
      return { clause: '', nextIndex: paramIndex };
    }

    params.push(currentDate);
    const dateParam = `$${paramIndex++}`;

    const parts: string[] = [];

    for (const s of statuses) {
      switch (s) {
        case 'ongoing':
          // ACTIVE + startDate <= today <= endDate
          parts.push(
            `(metadata->>'status' = 'ACTIVE' AND (metadata->>'startDate')::date <= ${dateParam}::date AND (metadata->>'endDate')::date >= ${dateParam}::date)`,
          );
          break;
        case 'upcoming':
          // ACTIVE + startDate > today
          parts.push(
            `(metadata->>'status' = 'ACTIVE' AND (metadata->>'startDate')::date > ${dateParam}::date)`,
          );
          break;
        case 'ended':
          // COMPLETED/CANCELLED, or ACTIVE with endDate < today
          parts.push(
            `(metadata->>'status' IN ('COMPLETED','CANCELLED') OR (metadata->>'status' = 'ACTIVE' AND (metadata->>'endDate')::date < ${dateParam}::date))`,
          );
          break;
      }
    }

    if (parts.length === 0) {
      return { clause: '', nextIndex: paramIndex };
    }

    return {
      clause: `(${parts.join(' OR ')})`,
      nextIndex: paramIndex,
    };
  }

  /**
   * Build WHERE clause fragment for date-range overlap filtering.
   * An activity "overlaps" a range if activity.startDate <= range.end
   * AND activity.endDate >= range.start.
   */
  private buildDateRangeCondition(
    dateRange: NonNullable<MetadataFilters['dateRange']>,
    currentDate: string | undefined,
    params: any[],
    paramIndex: number,
  ): { clause: string; nextIndex: number } {
    const start = dateRange.startDate;
    const end = dateRange.endDate;

    if (!start && !end) {
      return { clause: '', nextIndex: paramIndex };
    }

    const parts: string[] = [];

    if (start) {
      params.push(start);
      parts.push(`(metadata->>'endDate')::date >= $${paramIndex++}::date`);
    }
    if (end) {
      params.push(end);
      parts.push(`(metadata->>'startDate')::date <= $${paramIndex++}::date`);
    }

    return {
      clause: parts.join(' AND '),
      nextIndex: paramIndex,
    };
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
   * Get a retriever for use in LangChain chains using PGVectorStore
   */
  getRetriever(k: number = 5): VectorStoreRetriever {
    if (!this.initialized) {
      throw new Error('VectorStore not initialized. Call initialize() first.');
    }

    return this.vectorStore.asRetriever(k);
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
   * Perform MMR (Maximum Marginal Relevance) search using PGVectorStore
   * Returns diverse results that are relevant but not too similar to each other
   * Sets a default score of 1.0 (best diversity score) in metadata.
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
      const rawResults = await this.vectorStore.maxMarginalRelevanceSearch(query, {
        k,
        fetchK,
        lambda,
      });

      const filteredResults = rawResults
        .filter(doc => this.shouldIncludeInRetrieval(doc))
        .map(doc => ({
          ...doc,
          metadata: { ...doc.metadata, score: doc.metadata?.score || 1.0 },
        }))
        .slice(0, k);

      this.logger.debug(
        `MMR search returned ${filteredResults.length}/${rawResults.length} documents after ActivityStatus filtering`,
      );
      return filteredResults;
    } catch (error) {
      this.logger.error('MMR search failed', error);
      throw error;
    }
  }
}
