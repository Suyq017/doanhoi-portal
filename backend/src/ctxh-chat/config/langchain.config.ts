import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai'
import { ChatOllama } from '@langchain/ollama';
import { OllamaEmbeddings } from '@langchain/ollama';
import { GoogleGenAIEmbeddings } from './google-genai-embeddings';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * LangChain Configuration for CTXH Chat Module
 * Provides centralized configuration for LLM and Embeddings
 * Supports independent toggle between Ollama (local) and Gemini (cloud)
 * USE_LOCAL_MODEL_LLM: controls LLM (true = Ollama, false = Gemini)
 * USE_LOCAL_MODEL_EMBEDDING: controls Embeddings (true = Ollama, false = Gemini)
 */
export class LangChainConfig {
  /**
   * Check if using local LLM (Ollama)
   */
  static isUsingLocalLLM(configService: ConfigService): boolean {
    return configService.get('USE_LOCAL_MODEL_LLM') === 'true';
  }

  /**
   * Check if using local Embeddings (Ollama)
   */
  static isUsingLocalEmbedding(configService: ConfigService): boolean {
    return configService.get('USE_LOCAL_MODEL_EMBEDDING') === 'true';
  }

  /**
   * Get configured Chat LLM instance
   * Returns Ollama or Gemini based on USE_LOCAL_MODEL_LLM config
   */
  static getLLM(configService: ConfigService): BaseChatModel {
    const useLocalModel = this.isUsingLocalLLM(configService);

    if (useLocalModel) {
      // Use Ollama Qwen
      const baseUrl = configService.get('OLLAMA_BASE_URL');
      const model = configService.get('OLLAMA_LLM_MODEL');
      const numCtx = parseInt(configService.get('OLLAMA_NUM_CTX'), 10);
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
        apiKey,
        model: configService.get('GEMINI_MODEL'),
        temperature: parseFloat(configService.get('RAG_TEMPERATURE')),
        // maxOutputTokens: parseInt(configService.get('RAG_MAX_OUTPUT_TOKENS'), 10),
      });
    }
  }

  /**
   * Get configured Embeddings instance
   * Returns Ollama BGE-M3 or Gemini based on USE_LOCAL_MODEL_EMBEDDING config
   */
  static getEmbeddings(configService: ConfigService): Embeddings {
    const useLocalModel = this.isUsingLocalEmbedding(configService);

    if (useLocalModel) {
      // Use Ollama BGE-M3 (dimension: 1024)
      const baseUrl = configService.get('OLLAMA_BASE_URL');
      const model = configService.get('OLLAMA_EMBEDDING_MODEL');

      return new OllamaEmbeddings({
        baseUrl,
        model,
      }) as unknown as Embeddings;
    } else {
      // Use Gemini (dimension: 1024)
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
   * Get the name of the currently configured LLM model
   */
  static getModelName(configService: ConfigService): string {
    if (this.isUsingLocalLLM(configService)) {
      return configService.get('OLLAMA_LLM_MODEL');
    } else {
      return configService.get('GEMINI_MODEL');
    }
  }

  /**
   * Get embedding dimension based on current model
   */
  static getEmbeddingDimension(configService: ConfigService): number {
    const useLocalModel = this.isUsingLocalEmbedding(configService);
    
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
