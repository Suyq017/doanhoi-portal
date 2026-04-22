import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Embeddings } from '@langchain/core/embeddings';
import { LangChainConfig } from '../config/langchain.config';

/**
 * Universal Embeddings Service
 * Supports seamless switching between Ollama (local) and Gemini (cloud) embeddings
 * Toggle via USE_LOCAL_MODEL_EMBEDDING environment variable
 */
@Injectable()
export class UniversalEmbeddingsService implements OnModuleInit {
  private readonly logger = new Logger(UniversalEmbeddingsService.name);
  private embeddings: Embeddings;
  private dimension: number;
  private modelName: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.embeddings = LangChainConfig.getEmbeddings(this.configService);
    this.dimension = LangChainConfig.getEmbeddingDimension(this.configService);

    const useLocal = LangChainConfig.isUsingLocalEmbedding(this.configService);
    if (useLocal) {
      this.modelName = this.configService.get('OLLAMA_EMBEDDING_MODEL');
      this.logger.log(
        `✅ Using LOCAL Ollama Embeddings: ${this.modelName} (dimension: ${this.dimension})`,
      );
    } else {
      this.modelName = this.configService.get('GEMINI_EMBEDDING_MODEL');
      this.logger.log(
        `✅ Using GEMINI Embeddings: ${this.modelName} (dimension: ${this.dimension})`,
      );
    }
  }

  /**
   * Get the embeddings instance
   */
  getEmbeddings(): Embeddings {
    return this.embeddings;
  }

  /**
   * Get the embedding dimension
   */
  getDimension(): number {
    return this.dimension;
  }

  /**
   * Get the model name
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Check if using local model (Ollama)
   */
  isUsingLocalModel(): boolean {
    return LangChainConfig.isUsingLocalEmbedding(this.configService);
  }

  /**
   * Embed a single query
   */
  async embedQuery(text: string): Promise<number[]> {
    return this.embeddings.embedQuery(text);
  }

  /**
   * Embed multiple documents
   */
  async embedDocuments(documents: string[]): Promise<number[][]> {
    return this.embeddings.embedDocuments(documents);
  }

  /**
   * Health check for embeddings service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testEmbedding = await this.embeddings.embedQuery('health check');
      const isValid = Array.isArray(testEmbedding) && testEmbedding.length > 0;
      
      if (isValid) {
        this.logger.log(`Embeddings health check passed (dimension: ${testEmbedding.length})`);
      }
      
      return isValid;
    } catch (error) {
      this.logger.error('Embeddings health check failed', error);
      return false;
    }
  }
}
