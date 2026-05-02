import { ConfigService } from '@nestjs/config';
import { LangChainConfig } from '../langchain.config';

jest.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation((options) => ({
    provider: 'gemini',
    options,
  })),
}));

jest.mock('@langchain/ollama', () => ({
  ChatOllama: jest.fn().mockImplementation((options) => ({
    provider: 'ollama',
    options,
  })),
  OllamaEmbeddings: jest.fn().mockImplementation((options) => ({
    provider: 'ollama-embeddings',
    options,
  })),
}));

jest.mock('../google-genai-embeddings', () => ({
  GoogleGenAIEmbeddings: jest.fn().mockImplementation((options) => ({
    provider: 'google-genai-embeddings',
    options,
  })),
}));

describe('LangChainConfig', () => {
  let configService: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, any> = {
          USE_LOCAL_MODEL: 'true',
          OLLAMA_BASE_URL: 'http://localhost:11434',
          OLLAMA_LLM_MODEL: 'qwen2.5',
          OLLAMA_NUM_CTX: '8192',
          RAG_TEMPERATURE: '0.7',
          OLLAMA_EMBEDDING_MODEL: 'bge-m3',
          OLLAMA_EMBEDDING_DIMENSION: '1024',
          GEMINI_API_KEY: 'test-api-key',
          RAG_CHAT_MODEL: 'gemini-2.0-flash',
          RAG_MAX_OUTPUT_TOKENS: '2048',
          GEMINI_EMBEDDING_MODEL: 'text-embedding-004',
          GEMINI_EMBEDDING_DIMENSION: '768',
          DB_HOST: 'localhost',
          DB_PORT: '5432',
          DB_NAME: 'doanhoi',
          DB_USERNAME: 'postgres',
          DB_PASSWORD: 'secret',
          RAG_TOP_K: 5,
          RAG_SIMILARITY_THRESHOLD: 0.7,
          RAG_USE_MULTI_QUERY: true,
          RAG_ENABLE_MEMORY: false,
          RAG_MEMORY_WINDOW_SIZE: 8,
        };
        return values[key];
      }),
    };
  });

  it('should detect local model usage', () => {
    expect(LangChainConfig.isUsingLocalModel(configService as unknown as ConfigService)).toBe(true);
    configService.get.mockReturnValueOnce('false');
    expect(LangChainConfig.isUsingLocalModel(configService as unknown as ConfigService)).toBe(false);
  });

  it('should build Ollama LLM when local model is enabled', () => {
    const { ChatOllama } = require('@langchain/ollama');
    const llm = LangChainConfig.getLLM(configService as unknown as ConfigService) as any;

    expect(ChatOllama).toHaveBeenCalledWith({
      baseUrl: 'http://localhost:11434',
      model: 'qwen2.5',
      temperature: 0.7,
      numCtx: 8192,
    });
    expect(llm.provider).toBe('ollama');
  });

  it('should build Gemini LLM when local model is disabled', () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, any> = {
        USE_LOCAL_MODEL: 'false',
        GEMINI_API_KEY: 'test-api-key',
        RAG_CHAT_MODEL: 'gemini-2.0-flash',
        RAG_TEMPERATURE: '0.5',
        RAG_MAX_OUTPUT_TOKENS: '1024',
      };
      return values[key];
    });

    const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
    const llm = LangChainConfig.getLLM(configService as unknown as ConfigService) as any;

    expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
      model: 'gemini-2.0-flash',
      apiKey: 'test-api-key',
      temperature: 0.5,
      maxOutputTokens: 1024,
    });
    expect(llm.provider).toBe('gemini');
  });

  it('should throw when Gemini API key is missing', () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, any> = {
        USE_LOCAL_MODEL: 'false',
        GEMINI_API_KEY: '',
      };
      return values[key];
    });

    expect(() => LangChainConfig.getLLM(configService as unknown as ConfigService)).toThrow(
      'GEMINI_API_KEY is not configured',
    );
  });

  it('should build Ollama embeddings when local model is enabled', () => {
    const { OllamaEmbeddings } = require('@langchain/ollama');
    const embeddings = LangChainConfig.getEmbeddings(configService as unknown as ConfigService) as any;

    expect(OllamaEmbeddings).toHaveBeenCalledWith({
      baseUrl: 'http://localhost:11434',
      model: 'bge-m3',
    });
    expect(embeddings.provider).toBe('ollama-embeddings');
  });

  it('should build Gemini embeddings when local model is disabled', () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, any> = {
        USE_LOCAL_MODEL: 'false',
        GEMINI_API_KEY: 'test-api-key',
        GEMINI_EMBEDDING_MODEL: 'text-embedding-004',
        GEMINI_EMBEDDING_DIMENSION: '768',
      };
      return values[key];
    });

    const { GoogleGenAIEmbeddings } = require('../google-genai-embeddings');
    const embeddings = LangChainConfig.getEmbeddings(configService as unknown as ConfigService) as any;

    expect(GoogleGenAIEmbeddings).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
      model: 'text-embedding-004',
      outputDimensionality: 768,
    });
    expect(embeddings.provider).toBe('google-genai-embeddings');
  });

  it('should throw when Gemini embeddings API key is missing', () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, any> = {
        USE_LOCAL_MODEL: 'false',
        GEMINI_API_KEY: undefined,
      };
      return values[key];
    });

    expect(() => LangChainConfig.getEmbeddings(configService as unknown as ConfigService)).toThrow(
      'GEMINI_API_KEY is not configured',
    );
  });

  it('should return embedding dimension for local and cloud models', () => {
    expect(LangChainConfig.getEmbeddingDimension(configService as unknown as ConfigService)).toBe(1024);

    configService.get.mockImplementation((key: string) => {
      const values: Record<string, any> = {
        USE_LOCAL_MODEL: 'false',
        GEMINI_EMBEDDING_DIMENSION: '768',
      };
      return values[key];
    });

    expect(LangChainConfig.getEmbeddingDimension(configService as unknown as ConfigService)).toBe(768);
  });

  it('should map vector store and rag config values', () => {
    expect(LangChainConfig.getVectorStoreConfig(configService as unknown as ConfigService)).toEqual({
      host: 'localhost',
      port: 5432,
      database: 'doanhoi',
      user: 'postgres',
      password: 'secret',
    });

    expect(LangChainConfig.getRAGConfig(configService as unknown as ConfigService)).toEqual({
      topK: 5,
      similarityThreshold: 0.7,
      useMultiQuery: true,
      enableMemory: false,
      memoryWindowSize: 8,
    });
  });
});
