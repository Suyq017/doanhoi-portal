/**
 * Mock ConfigService for unit tests
 */
export const createMockConfigService = (overrides: Record<string, any> = {}) => {
  const defaultConfig: Record<string, any> = {
    USE_LANGCHAIN: 'true',
    GEMINI_API_KEY: 'test-gemini-api-key',
    RAG_MAX_SESSIONS: 100,
    RAG_SESSION_TTL_MS: 1800000, // 30 minutes
    RAG_MAX_MESSAGES_PER_SESSION: 20,
    DB_HOST: 'localhost',
    DB_PORT: 5432,
    DB_USERNAME: 'test_user',
    DB_PASSWORD: 'test_password',
    DB_NAME: 'test_db',
    VECTOR_STORE_TABLE: 'ctxh_embeddings',
    EMBEDDING_DIMENSIONS: 768,
    RAG_CHUNK_SIZE: 1000,
    RAG_CHUNK_OVERLAP: 200,
    RAG_SEARCH_K: 5,
    RAG_INGESTION_BATCH_SIZE: 10,
    INGESTION_BATCH_SIZE: 50,
    NODE_ENV: 'test',
    ...overrides,
  };

  return {
    get: jest.fn((key: string, defaultValue?: any) => {
      return defaultConfig[key] ?? defaultValue;
    }),
  };
};

export const mockConfigService = createMockConfigService();
