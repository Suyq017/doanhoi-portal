import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import Redis from 'ioredis';
import * as crypto from 'crypto';

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  provider: 'openai' | 'local';
  model: string;
  dimensions: number;
  batchSize: number;
  maxRetries: number;
  cacheEnabled: boolean;
  cacheTTL: number; // seconds
}

/**
 * Embedding result structure
 */
export interface EmbeddingResult {
  text: string;
  embedding: number[];
  cached: boolean;
  tokenCount?: number;
}

/**
 * Batch embedding result
 */
export interface BatchEmbeddingResult {
  results: EmbeddingResult[];
  totalProcessed: number;
  cacheHits: number;
  cacheMisses: number;
  errors: Array<{ index: number; error: string }>;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openaiEmbeddings: OpenAIEmbeddings;
  private redis: Redis;

  private readonly config: EmbeddingConfig = {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 20,
    maxRetries: 3,
    cacheEnabled: true,
    cacheTTL: 30 * 24 * 60 * 60, // 30 days
  };

  constructor(private readonly configService: ConfigService) {
    this.initialize();
  }

  /**
   * Initialize OpenAI and Redis connections
   */
  private async initialize() {
    try {
      // Initialize OpenAI Embeddings
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not found in environment variables');
      }

      this.openaiEmbeddings = new OpenAIEmbeddings({
        model: this.config.model,
        dimensions: this.config.dimensions,
        apiKey: apiKey,
      });

      this.logger.log(
        `OpenAI Embeddings initialized: model=${this.config.model}, dimensions=${this.config.dimensions}`
      );

      // Initialize Redis for caching
      if (this.config.cacheEnabled) {
        const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

        this.redis = new Redis({
          host: redisHost,
          port: redisPort,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });

        this.redis.on('connect', () => {
          this.logger.log(`Redis connected for embedding cache: ${redisHost}:${redisPort}`);
        });

        this.redis.on('error', (err) => {
          this.logger.error('Redis connection error:', err);
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize EmbeddingService:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = await this.getCachedEmbedding(text);
      if (cached) {
        this.logger.debug('Cache hit for embedding');
        return cached;
      }
    }

    // Generate new embedding with retry logic
    const embedding = await this.embedWithRetry(text);

    // Cache the result
    if (this.config.cacheEnabled) {
      await this.setCachedEmbedding(text, embedding);
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async batchGenerateEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
    this.logger.log(`Generating embeddings for ${texts.length} texts in batches...`);

    const result: BatchEmbeddingResult = {
      results: [],
      totalProcessed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: [],
    };

    // Process in batches
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);
      const batchNumber = Math.floor(i / this.config.batchSize) + 1;
      const totalBatches = Math.ceil(texts.length / this.config.batchSize);

      this.logger.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} texts)`);

      try {
        const batchResults = await this.processBatch(batch, i);
        result.results.push(...batchResults.results);
        result.cacheHits += batchResults.cacheHits;
        result.cacheMisses += batchResults.cacheMisses;
        result.totalProcessed += batchResults.results.length;

        // Rate limiting - small delay between batches
        if (i + this.config.batchSize < texts.length) {
          await this.delay(100);
        }
      } catch (error) {
        this.logger.error(`Failed to process batch ${batchNumber}:`, error);
        
        // Record errors for this batch
        batch.forEach((text, batchIndex) => {
          result.errors.push({
            index: i + batchIndex,
            error: error.message,
          });
        });
      }
    }

    this.logger.log(
      `Batch embedding completed: ${result.totalProcessed}/${texts.length} successful, ` +
      `${result.cacheHits} cache hits, ${result.errors.length} errors`
    );

    return result;
  }

  /**
   * Process a single batch of texts
   */
  private async processBatch(
    texts: string[],
    startIndex: number
  ): Promise<{ results: EmbeddingResult[]; cacheHits: number; cacheMisses: number }> {
    const results: EmbeddingResult[] = [];
    let cacheHits = 0;
    let cacheMisses = 0;

    // Check cache for all texts
    const cacheChecks = await Promise.all(
      texts.map(async (text) => {
        if (this.config.cacheEnabled) {
          const cached = await this.getCachedEmbedding(text);
          return cached;
        }
        return null;
      })
    );

    // Separate cached and non-cached texts
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    texts.forEach((text, i) => {
      if (cacheChecks[i]) {
        results[i] = {
          text: text,
          embedding: cacheChecks[i]!,
          cached: true,
        };
        cacheHits++;
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(i);
        cacheMisses++;
      }
    });

    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      try {
        const embeddings = await this.openaiEmbeddings.embedDocuments(uncachedTexts);

        // Store in cache and results
        for (let i = 0; i < uncachedTexts.length; i++) {
          const text = uncachedTexts[i];
          const embedding = embeddings[i];
          const originalIndex = uncachedIndices[i];

          results[originalIndex] = {
            text: text,
            embedding: embedding,
            cached: false,
          };

          // Cache the embedding
          if (this.config.cacheEnabled) {
            await this.setCachedEmbedding(text, embedding);
          }
        }
      } catch (error) {
        this.logger.error('Failed to generate embeddings from OpenAI:', error);
        throw error;
      }
    }

    return {
      results: results.filter(r => r !== undefined),
      cacheHits: cacheHits,
      cacheMisses: cacheMisses,
    };
  }

  /**
   * Embed with exponential backoff retry logic
   */
  private async embedWithRetry(text: string, attempt: number = 1): Promise<number[]> {
    try {
      const embedding = await this.openaiEmbeddings.embedQuery(text);
      return embedding;
    } catch (error) {
      if (attempt >= this.config.maxRetries) {
        this.logger.error(`Failed to generate embedding after ${attempt} attempts`);
        throw new Error(`Embedding generation failed after ${attempt} attempts: ${error.message}`);
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      this.logger.warn(`Embedding attempt ${attempt} failed, retrying in ${delay}ms...`);
      
      await this.delay(delay);
      return this.embedWithRetry(text, attempt + 1);
    }
  }

  /**
   * Get cached embedding from Redis
   */
  private async getCachedEmbedding(text: string): Promise<number[] | null> {
    if (!this.redis || !this.config.cacheEnabled) {
      return null;
    }

    try {
      const textHash = this.hashText(text);
      const cacheKey = `embedding:${textHash}`;
      
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.error('Error getting cached embedding:', error);
    }

    return null;
  }

  /**
   * Set cached embedding in Redis
   */
  private async setCachedEmbedding(text: string, embedding: number[]): Promise<void> {
    if (!this.redis || !this.config.cacheEnabled) {
      return;
    }

    try {
      const textHash = this.hashText(text);
      const cacheKey = `embedding:${textHash}`;
      
      await this.redis.setex(
        cacheKey,
        this.config.cacheTTL,
        JSON.stringify(embedding)
      );
    } catch (error) {
      this.logger.error('Error caching embedding:', error);
    }
  }

  /**
   * Hash text for cache key
   */
  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    enabled: boolean;
    totalKeys: number;
    memoryUsage: string;
  }> {
    if (!this.redis || !this.config.cacheEnabled) {
      return {
        enabled: false,
        totalKeys: 0,
        memoryUsage: '0',
      };
    }

    try {
      const keys = await this.redis.keys('embedding:*');
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      
      return {
        enabled: true,
        totalKeys: keys.length,
        memoryUsage: memoryMatch ? memoryMatch[1] : 'unknown',
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        enabled: true,
        totalKeys: 0,
        memoryUsage: 'error',
      };
    }
  }

  /**
   * Clear embedding cache
   */
  async clearCache(): Promise<number> {
    if (!this.redis || !this.config.cacheEnabled) {
      return 0;
    }

    try {
      const keys = await this.redis.keys('embedding:*');
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Cleared ${keys.length} embedding cache entries`);
      }
      
      return keys.length;
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
      return 0;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<EmbeddingConfig>): void {
    Object.assign(this.config, updates);
    this.logger.log('Embedding config updated', updates);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // Test embedding generation
      const testEmbedding = await this.openaiEmbeddings.embedQuery('test');
      
      // Check Redis connection
      let redisHealthy = false;
      if (this.redis && this.config.cacheEnabled) {
        await this.redis.ping();
        redisHealthy = true;
      }

      return {
        status: 'healthy',
        details: {
          openai: {
            available: true,
            model: this.config.model,
            dimensions: testEmbedding.length,
          },
          redis: {
            enabled: this.config.cacheEnabled,
            connected: redisHealthy,
          },
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed');
    }
  }
}
