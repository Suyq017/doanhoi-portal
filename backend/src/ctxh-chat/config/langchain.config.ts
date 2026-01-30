import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

/**
 * LangChain Configuration for CTXH Chat Module
 * Provides centralized configuration for LLM and Embeddings
 */
export class LangChainConfig {
  /**
   * Get configured Chat LLM instance
   */
  static getLLM(configService: ConfigService): ChatGoogleGenerativeAI {
    const apiKey = configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    return new ChatGoogleGenerativeAI({
      model: configService.get('RAG_CHAT_MODEL') || 'gemini-2.5-flash',
      apiKey,
      temperature: configService.get('RAG_TEMPERATURE') || 0.7,
      maxOutputTokens: configService.get('RAG_MAX_OUTPUT_TOKENS') || 1024,
    });
  }

  /**
   * Get configured Embeddings instance
   */
  static getEmbeddings(configService: ConfigService): GoogleGenerativeAIEmbeddings {
    const apiKey = configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    return new GoogleGenerativeAIEmbeddings({
      apiKey,
      model: configService.get('RAG_EMBEDDING_MODEL') || 'text-embedding-004',
    });
  }

  /**
   * Get PostgreSQL connection config for Vector Store
   */
  static getVectorStoreConfig(configService: ConfigService) {
    return {
      host: configService.get<string>('DB_HOST', 'localhost'),
      port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
      database: configService.get<string>('DB_NAME', 'doanhoi'),
      user: configService.get<string>('DB_USERNAME', 'postgres'),
      password: configService.get<string>('DB_PASSWORD', ''),
    };
  }

  /**
   * Get RAG configuration parameters
   */
  static getRAGConfig(configService: ConfigService) {
    return {
      topK: configService.get<number>('RAG_TOP_K', 5),
      similarityThreshold: configService.get<number>('RAG_SIMILARITY_THRESHOLD', 0.7),
      useMultiQuery: configService.get<boolean>('RAG_USE_MULTI_QUERY', false),
      enableMemory: configService.get<boolean>('RAG_ENABLE_MEMORY', true),
      memoryWindowSize: configService.get<number>('RAG_MEMORY_WINDOW_SIZE', 6),
    };
  }
}
