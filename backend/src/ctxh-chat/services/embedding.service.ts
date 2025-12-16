import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import Redis from 'ioredis';
import * as crypto from 'crypto';

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  provider: 'gemini';
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
  private geminiAI: GoogleGenAI;
  private redis: Redis;

  private readonly config: EmbeddingConfig = {
    provider: 'gemini',
    model: 'text-embedding-004',
    dimensions: 768,
    batchSize: 20,
    maxRetries: 3,
    cacheEnabled: true,
    cacheTTL: 30 * 24 * 60 * 60, // 30 days
  };

  constructor(private readonly configService: ConfigService) {
    this.initialize();
  }

  /**
   * Initialize Google Gemini and Redis connections
   */
  private async initialize() {
    try {
      // Initialize Google Gemini
      const GEMINI_API_KEY = this.configService.get<string>('GEMINI_API_KEY');
      
      //this.logger.log(`API Key from config: ${GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' + GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4) : 'NOT FOUND'}`);
      
      if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not found in environment variables');
      }

      this.geminiAI = new GoogleGenAI({
        apiKey: GEMINI_API_KEY,
      });

      this.logger.log(
        `Google Gemini Embeddings initialized: model=${this.config.model}, dimensions=${this.config.dimensions}`
      );

      // Initialize Redis for caching
      if (this.config.cacheEnabled) {
        const redisHost = this.configService.get<string>('REDIS_HOST');
        const redisPort = this.configService.get<number>('REDIS_PORT');
        const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
        
        this.redis = new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });

        this.redis.on('connect', () => {
          this.logger.log(`Redis connected for embedding cache: ${this.configService.get('REDIS_HOST')}:${this.configService.get('REDIS_PORT', 6379)}`);
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
        // Google Gemini supports batch embedding
        const response = await this.geminiAI.models.embedContent({
          model: this.config.model,
          contents: uncachedTexts,
          config: {
            outputDimensionality: this.config.dimensions,
          },
        });

        const embeddings = response.embeddings || [];

        // Store in cache and results
        for (let i = 0; i < uncachedTexts.length; i++) {
          const text = uncachedTexts[i];
          const embedding = embeddings[i]?.values || [];
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
        this.logger.error('Failed to generate embeddings from Google Gemini:', error);
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
      const response = await this.geminiAI.models.embedContent({
        model: this.config.model,
        contents: text,
        config: {
          outputDimensionality: this.config.dimensions,
        },
      });

      return response.embeddings?.[0]?.values || [];
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
      const response = await this.geminiAI.models.embedContent({
        model: this.config.model,
        contents: 'test',
        config: {
          outputDimensionality: this.config.dimensions,
        },
      });

      const testEmbedding = response.embeddings?.[0]?.values || [];
      
      // Check Redis connection
      let redisHealthy = false;
      if (this.redis && this.config.cacheEnabled) {
        await this.redis.ping();
        redisHealthy = true;
      }

      return {
        status: 'healthy',
        details: {
          gemini: {
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
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          stack: error.stack,
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
