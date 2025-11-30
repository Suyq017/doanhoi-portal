import { Injectable, Logger } from '@nestjs/common';
import { encoding_for_model } from 'tiktoken';
import { CtxhActivity } from '@/entities/ctxh-activity.entity';
import { PreparedActivityData, ActivityMetadata } from './ctxh-data-preparation.service';

/**
 * Chunking strategy enum
 */
export enum ChunkingStrategy {
  ACTIVITY_LEVEL = 'activity_level', // Current: 1 activity = 1 chunk
  FIELD_BASED = 'field_based',       // Future: Split by fields
  SEMANTIC_SPLIT = 'semantic_split'  // Future: Semantic splitting
}

/**
 * Chunking configuration
 */
export interface ChunkingConfig {
  strategy: ChunkingStrategy;
  maxChunkTokens: number;
  overlapTokens: number;
  minChunkTokens: number;
  preserveStructure: boolean;
}

/**
 * Activity chunk structure
 */
export interface ActivityChunk {
  index: number;
  text: string;
  metadata: ChunkMetadata;
  tokenCount: number;
}

/**
 * Extended metadata for chunks
 */
export interface ChunkMetadata extends ActivityMetadata {
  chunkType: 'activity' | 'field' | 'semantic';
  totalChunks: number;
}

/**
 * Chunk result for an activity
 */
export interface ChunkResult {
  activityId: string;
  chunks: ActivityChunk[];
  totalTokens: number;
  strategy: ChunkingStrategy;
}

@Injectable()
export class CtxhChunkingService {
  private readonly logger = new Logger(CtxhChunkingService.name);
  
  private readonly config: ChunkingConfig = {
    strategy: ChunkingStrategy.ACTIVITY_LEVEL,
    maxChunkTokens: 1000,
    overlapTokens: 100,
    minChunkTokens: 50,
    preserveStructure: true,
  };

  private tokenizer: any;

  constructor() {
    // Initialize tiktoken for OpenAI token counting
    try {
      this.tokenizer = encoding_for_model('text-embedding-3-small');
      this.logger.log('Tiktoken tokenizer initialized successfully');
    } catch (error) {
      this.logger.warn('Failed to initialize tiktoken, falling back to simple counting');
      this.tokenizer = null;
    }
  }

  /**
   * Process a single activity into chunks
   */
  async processActivity(activityData: PreparedActivityData): Promise<ChunkResult> {
    this.logger.debug(`Processing activity ${activityData.activityId} for chunking`);

    const tokenCount = this.countTokens(activityData.formattedText);

    // Check if chunking is needed
    if (tokenCount <= this.config.maxChunkTokens) {
      return this.createSingleChunk(activityData, tokenCount);
    }

    // If exceeds max tokens, apply splitting strategy
    this.logger.warn(
      `Activity ${activityData.activityId} exceeds ${this.config.maxChunkTokens} tokens (${tokenCount}), applying split strategy`
    );

    return this.splitActivityIntoChunks(activityData, tokenCount);
  }

  /**
   * Process multiple activities into chunks
   */
  async processActivities(activitiesData: PreparedActivityData[]): Promise<ChunkResult[]> {
    this.logger.log(`Processing ${activitiesData.length} activities for chunking...`);

    const results: ChunkResult[] = [];

    for (const activityData of activitiesData) {
      try {
        const chunkResult = await this.processActivity(activityData);
        results.push(chunkResult);
      } catch (error) {
        this.logger.error(
          `Failed to chunk activity ${activityData.activityId}: ${error.message}`,
          error.stack
        );
        // Continue processing other activities
      }
    }

    const totalChunks = results.reduce((sum, result) => sum + result.chunks.length, 0);
    this.logger.log(
      `Chunking completed: ${results.length} activities -> ${totalChunks} chunks`
    );

    return results;
  }

  /**
   * Create a single chunk for an activity (no splitting needed)
   */
  private createSingleChunk(
    activityData: PreparedActivityData,
    tokenCount: number
  ): ChunkResult {
    const chunk: ActivityChunk = {
      index: 0,
      text: activityData.formattedText,
      tokenCount: tokenCount,
      metadata: {
        ...activityData.metadata,
        chunkType: 'activity',
        totalChunks: 1,
      },
    };

    return {
      activityId: activityData.activityId,
      chunks: [chunk],
      totalTokens: tokenCount,
      strategy: ChunkingStrategy.ACTIVITY_LEVEL,
    };
  }

  /**
   * Split long activity description into multiple chunks
   */
  private splitActivityIntoChunks(
    activityData: PreparedActivityData,
    totalTokens: number
  ): ChunkResult {
    this.logger.log(
      `Splitting activity ${activityData.activityId} (${totalTokens} tokens) into smaller chunks`
    );

    // For now, implement simple text splitting
    // Future: Can implement more sophisticated semantic splitting
    const chunks: ActivityChunk[] = [];
    const text = activityData.formattedText;
    
    // Split by paragraphs first
    const sections = text.split('\n\n').filter(s => s.trim());
    
    let currentChunk = '';
    let currentTokens = 0;
    let chunkIndex = 0;

    for (const section of sections) {
      const sectionTokens = this.countTokens(section);
      
      if (currentTokens + sectionTokens > this.config.maxChunkTokens && currentChunk) {
        // Save current chunk
        chunks.push({
          index: chunkIndex++,
          text: currentChunk.trim(),
          tokenCount: currentTokens,
          metadata: {
            ...activityData.metadata,
            chunkType: 'field',
            totalChunks: 0, // Will update later
          },
        });
        
        currentChunk = section + '\n\n';
        currentTokens = sectionTokens;
      } else {
        currentChunk += section + '\n\n';
        currentTokens += sectionTokens;
      }
    }

    // Add last chunk
    if (currentChunk.trim()) {
      chunks.push({
        index: chunkIndex++,
        text: currentChunk.trim(),
        tokenCount: currentTokens,
        metadata: {
          ...activityData.metadata,
          chunkType: 'field',
          totalChunks: 0,
        },
      });
    }

    // Update totalChunks in metadata
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    this.logger.log(
      `Split activity ${activityData.activityId} into ${chunks.length} chunks`
    );

    return {
      activityId: activityData.activityId,
      chunks: chunks,
      totalTokens: totalTokens,
      strategy: ChunkingStrategy.FIELD_BASED,
    };
  }

  /**
   * Count tokens in text using tiktoken
   */
  private countTokens(text: string): number {
    if (!text) return 0;

    try {
      if (this.tokenizer) {
        const tokens = this.tokenizer.encode(text);
        return tokens.length;
      } else {
        // Fallback: rough estimation (1 token ≈ 4 characters)
        return Math.ceil(text.length / 4);
      }
    } catch (error) {
      this.logger.error('Error counting tokens, using fallback', error);
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Validate chunk quality
   */
  validateChunk(chunk: ActivityChunk): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (chunk.tokenCount < this.config.minChunkTokens) {
      warnings.push(
        `Chunk ${chunk.index} has only ${chunk.tokenCount} tokens (min: ${this.config.minChunkTokens})`
      );
    }

    if (chunk.tokenCount > this.config.maxChunkTokens) {
      warnings.push(
        `Chunk ${chunk.index} exceeds max tokens: ${chunk.tokenCount} > ${this.config.maxChunkTokens}`
      );
    }

    if (!chunk.text || chunk.text.trim().length === 0) {
      warnings.push(`Chunk ${chunk.index} has empty text`);
    }

    return {
      isValid: warnings.length === 0,
      warnings: warnings,
    };
  }

  /**
   * Get chunking statistics
   */
  getChunkingStats(results: ChunkResult[]): {
    totalActivities: number;
    totalChunks: number;
    totalTokens: number;
    avgTokensPerChunk: number;
    avgChunksPerActivity: number;
    maxTokensInChunk: number;
    minTokensInChunk: number;
  } {
    const totalChunks = results.reduce((sum, r) => sum + r.chunks.length, 0);
    const totalTokens = results.reduce((sum, r) => sum + r.totalTokens, 0);
    
    const allChunks = results.flatMap(r => r.chunks);
    const tokenCounts = allChunks.map(c => c.tokenCount);

    return {
      totalActivities: results.length,
      totalChunks: totalChunks,
      totalTokens: totalTokens,
      avgTokensPerChunk: totalChunks > 0 ? Math.round(totalTokens / totalChunks) : 0,
      avgChunksPerActivity: results.length > 0 ? totalChunks / results.length : 0,
      maxTokensInChunk: tokenCounts.length > 0 ? Math.max(...tokenCounts) : 0,
      minTokensInChunk: tokenCounts.length > 0 ? Math.min(...tokenCounts) : 0,
    };
  }

  /**
   * Get configuration
   */
  getConfig(): ChunkingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ChunkingConfig>): void {
    Object.assign(this.config, updates);
    this.logger.log('Chunking config updated', updates);
  }

  /**
   * Cleanup tokenizer on destroy
   */
  onModuleDestroy() {
    if (this.tokenizer) {
      try {
        this.tokenizer.free();
        this.logger.log('Tokenizer resources freed');
      } catch (error) {
        this.logger.error('Error freeing tokenizer resources', error);
      }
    }
  }
}
