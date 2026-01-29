import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OllamaEmbeddings } from '@langchain/ollama';
import { Embeddings } from '@langchain/core/embeddings';
import { GoogleGenAIEmbeddings } from '../config/google-genai-embeddings';

/**
 * Universal Embeddings Service
 * Supports seamless switching between Ollama (local) and Gemini (cloud) embeddings
 * Toggle via USE_LOCAL_MODEL environment variable
 */
@Injectable()
export class UniversalEmbeddingsService implements OnModuleInit {
  private readonly logger = new Logger(UniversalEmbeddingsService.name);
  private embeddings: Embeddings;
  private readonly useLocalModel: boolean;
  private dimension: number;
  private modelName: string;

  constructor(private readonly configService: ConfigService) {
    this.useLocalModel =
      this.configService.get('USE_LOCAL_MODEL', 'false') === 'true';
  }

  async onModuleInit(): Promise<void> {
    await this.initializeEmbeddings();
  }

  /**
   * Initialize embeddings based on configuration
   */
  private async initializeEmbeddings(): Promise<void> {
    if (this.useLocalModel) {
      await this.initializeOllamaEmbeddings();
    } else {
      await this.initializeGeminiEmbeddings();
    }
  }

  /**
   * Initialize Ollama BGE-M3 embeddings (local)
   */
  private async initializeOllamaEmbeddings(): Promise<void> {
    const baseUrl = this.configService.get(
      'OLLAMA_BASE_URL',
      'http://localhost:11434',
    );
    this.modelName = this.configService.get('OLLAMA_EMBEDDING_MODEL', 'bge-m3');
    this.dimension = parseInt(
      this.configService.get('OLLAMA_EMBEDDING_DIMENSION', '1024'),
      10,
    );

    this.embeddings = new OllamaEmbeddings({
      baseUrl,
      model: this.modelName,
    }) as unknown as Embeddings;

    this.logger.log(
      `✅ Using LOCAL Ollama Embeddings: ${this.modelName} (dimension: ${this.dimension}) at ${baseUrl}`,
    );
  }

  /**
   * Initialize Gemini embeddings (cloud)
   */
  private async initializeGeminiEmbeddings(): Promise<void> {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    this.modelName = this.configService.get(
      'GEMINI_EMBEDDING_MODEL',
      'gemini-embedding-001',
    );
    this.dimension = parseInt(
      this.configService.get('GEMINI_EMBEDDING_DIMENSION', '768'),
      10,
    );

    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is required when USE_LOCAL_MODEL is false',
      );
    }

    this.embeddings = new GoogleGenAIEmbeddings({
      apiKey,
      model: this.modelName,
      outputDimensionality: this.dimension,
    });

    this.logger.log(
      `✅ Using GEMINI Embeddings: ${this.modelName} (dimension: ${this.dimension})`,
    );
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
    return this.useLocalModel;
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
