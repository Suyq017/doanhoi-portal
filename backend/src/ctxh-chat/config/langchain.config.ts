import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import { OllamaEmbeddings } from '@langchain/ollama';
import { GoogleGenAIEmbeddings } from './google-genai-embeddings';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * LangChain Configuration for CTXH Chat Module
 * Provides centralized configuration for LLM and Embeddings
 * Supports toggle between Ollama (local) and Gemini (cloud)
 */
export class LangChainConfig {
  /**
   * Check if using local model (Ollama)
   */
  static isUsingLocalModel(configService: ConfigService): boolean {
    return configService.get('USE_LOCAL_MODEL') === 'true';
  }

  /**
   * Get configured Chat LLM instance
   * Returns Ollama or Gemini based on USE_LOCAL_MODEL config
   */
  static getLLM(configService: ConfigService): BaseChatModel {
    const useLocalModel = this.isUsingLocalModel(configService);

    if (useLocalModel) {
      // Use Ollama Qwen2.5:7b
      const baseUrl = configService.get('OLLAMA_BASE_URL');
      const model = configService.get('OLLAMA_LLM_MODEL');
      const numCtx = parseInt(configService.get('OLLAMA_NUM_CTX'));
      const temperature = parseFloat(configService.get('RAG_TEMPERATURE'));

      return new ChatOllama({
        baseUrl,
        model,
        temperature,
        numCtx,
      }) as unknown as BaseChatModel;
    } else {
      // Use Gemini
      const apiKey = configService.get<string>('GEMINI_API_KEY');
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      return new ChatGoogleGenerativeAI({
        model: configService.get('RAG_CHAT_MODEL'),
        apiKey,
        temperature: parseFloat(configService.get('RAG_TEMPERATURE')),
        maxOutputTokens: parseInt(configService.get('RAG_MAX_OUTPUT_TOKENS')),
      });
    }
  }

  /**
   * Get configured Embeddings instance
   * Returns Ollama BGE-M3 or Gemini based on USE_LOCAL_MODEL config
   */
  static getEmbeddings(configService: ConfigService): Embeddings {
    const useLocalModel = this.isUsingLocalModel(configService);

    if (useLocalModel) {
      // Use Ollama BGE-M3 (dimension: 1024)
      const baseUrl = configService.get('OLLAMA_BASE_URL');
      const model = configService.get('OLLAMA_EMBEDDING_MODEL');

      return new OllamaEmbeddings({
        baseUrl,
        model,
      }) as unknown as Embeddings;
    } else {
      // Use Gemini (dimension: 768)
      const apiKey = configService.get<string>('GEMINI_API_KEY');
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      return new GoogleGenAIEmbeddings({
        apiKey,
        model: configService.get('GEMINI_EMBEDDING_MODEL'),
        outputDimensionality: parseInt(
          configService.get('GEMINI_EMBEDDING_DIMENSION'),
          10,
        ),
      });
    }
  }

  /**
   * Get embedding dimension based on current model
   */
  static getEmbeddingDimension(configService: ConfigService): number {
    const useLocalModel = this.isUsingLocalModel(configService);
    
    if (useLocalModel) {
      return parseInt(configService.get('OLLAMA_EMBEDDING_DIMENSION'), 10);
    } else {
      return parseInt(configService.get('GEMINI_EMBEDDING_DIMENSION'), 10);
    }
  }

  /**
   * Get PostgreSQL connection config for Vector Store
   */
  static getVectorStoreConfig(configService: ConfigService) {
    return {
      host: configService.get<string>('DB_HOST'),
      port: parseInt(configService.get<string>('DB_PORT'), 10),
      database: configService.get<string>('DB_NAME'),
      user: configService.get<string>('DB_USERNAME'),
      password: configService.get<string>('DB_PASSWORD'),
    };
  }

  /**
   * Get RAG configuration parameters
   */
  static getRAGConfig(configService: ConfigService) {
    return {
      topK: configService.get<number>('RAG_TOP_K'),
      similarityThreshold: configService.get<number>('RAG_SIMILARITY_THRESHOLD'),
      useMultiQuery: configService.get<boolean>('RAG_USE_MULTI_QUERY'),
      enableMemory: configService.get<boolean>('RAG_ENABLE_MEMORY'),
      memoryWindowSize: configService.get<number>('RAG_MEMORY_WINDOW_SIZE'),
    };
  }
}
