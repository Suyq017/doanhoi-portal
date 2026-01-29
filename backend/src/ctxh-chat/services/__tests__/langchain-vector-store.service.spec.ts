import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LangChainVectorStoreService } from '../langchain-vector-store.service';
import { createMockConfigService } from './mocks/config.service.mock';
import { createMockDocument, createMockVectorStore } from './mocks/vector-store.mock';
import { Document } from '@langchain/core/documents';

// Create mock vector store instance
const mockVectorStoreInstance = createMockVectorStore();

// Mock PGVectorStore
jest.mock('@langchain/community/vectorstores/pgvector', () => ({
  PGVectorStore: {
    initialize: jest.fn().mockResolvedValue(mockVectorStoreInstance),
  },
}));

// Mock Google Generative AI Embeddings
jest.mock('@langchain/google-genai', () => ({
  GoogleGenerativeAIEmbeddings: jest.fn().mockImplementation(() => ({
    embedDocuments: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  })),
}));

// Mock LangChainConfig
jest.mock('../../config/langchain.config', () => ({
  LangChainConfig: {
    getEmbeddings: jest.fn().mockReturnValue({
      embedDocuments: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
      embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    }),
    getVectorStoreConfig: jest.fn().mockReturnValue({
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'test_user',
      password: 'test_password',
    }),
  },
}));

describe('LangChainVectorStoreService', () => {
  let service: LangChainVectorStoreService;
  let mockConfigService: ReturnType<typeof createMockConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LangChainVectorStoreService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<LangChainVectorStoreService>(LangChainVectorStoreService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize vector store on module init', async () => {
      await service.onModuleInit();

      expect(service.isInitialized()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await service.onModuleInit();
      await service.onModuleInit();

      // PGVectorStore.initialize should be called only once
      const { PGVectorStore } = require('@langchain/community/vectorstores/pgvector');
      expect(PGVectorStore.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      expect(service.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await service.initialize();

      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('similaritySearch', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should perform similarity search', async () => {
      const query = 'test query';
      const k = 5;

      const results = await service.similaritySearch(query, k);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(mockVectorStoreInstance.similaritySearch).toHaveBeenCalledWith(query, k);
    });

    it('should use default k value if not provided', async () => {
      const query = 'test query';

      await service.similaritySearch(query);

      expect(mockVectorStoreInstance.similaritySearch).toHaveBeenCalledWith(query, 5);
    });
  });

  describe('similaritySearchWithScore', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should perform similarity search with scores', async () => {
      const query = 'test query';
      const k = 5;

      const results = await service.similaritySearchWithScore(query, k);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(mockVectorStoreInstance.similaritySearchWithScore).toHaveBeenCalledWith(query, k);
    });

    it('should return tuples of [Document, score]', async () => {
      const results = await service.similaritySearchWithScore('test', 2);

      results.forEach(([doc, score]) => {
        expect(doc).toBeInstanceOf(Document);
        expect(typeof score).toBe('number');
      });
    });
  });

  describe('addDocuments', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should add documents to vector store', async () => {
      const documents: Document[] = [
        createMockDocument('Content 1'),
        createMockDocument('Content 2'),
      ];

      await service.addDocuments(documents);

      expect(mockVectorStoreInstance.addDocuments).toHaveBeenCalledWith(documents);
    });

    it('should handle empty document array', async () => {
      await service.addDocuments([]);

      expect(mockVectorStoreInstance.addDocuments).toHaveBeenCalledWith([]);
    });
  });

  describe('getRetriever', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return a retriever', () => {
      const retriever = service.getRetriever();

      expect(retriever).toBeDefined();
      expect(mockVectorStoreInstance.asRetriever).toHaveBeenCalled();
    });

    it('should pass k parameter to retriever', () => {
      service.getRetriever(10);

      expect(mockVectorStoreInstance.asRetriever).toHaveBeenCalledWith({
        k: 10,
        searchType: 'similarity',
      });
    });

    it('should throw error when not initialized', () => {
      // Create a new service without initialization
      const uninitializedService = new LangChainVectorStoreService(mockConfigService as any);

      expect(() => uninitializedService.getRetriever()).toThrow(
        'VectorStore not initialized. Call initialize() first.'
      );
    });
  });

  describe('getVectorStore', () => {
    it('should return vector store after initialization', async () => {
      await service.initialize();

      const vectorStore = service.getVectorStore();

      expect(vectorStore).toBeDefined();
    });

    it('should throw error when not initialized', () => {
      expect(() => service.getVectorStore()).toThrow(
        'VectorStore not initialized. Call initialize() first.'
      );
    });
  });

  describe('getEmbeddings', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return embeddings instance', () => {
      const embeddings = service.getEmbeddings();

      expect(embeddings).toBeDefined();
    });
  });

  describe('maxMarginalRelevanceSearch', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should perform MMR search with default options', async () => {
      const query = 'test query';

      const results = await service.maxMarginalRelevanceSearch(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(mockVectorStoreInstance.maxMarginalRelevanceSearch).toHaveBeenCalled();
    });

    it('should perform MMR search with custom options', async () => {
      const query = 'test query';
      const options = { k: 10, fetchK: 40, lambda: 0.7 };

      await service.maxMarginalRelevanceSearch(query, options);

      expect(mockVectorStoreInstance.maxMarginalRelevanceSearch).toHaveBeenCalledWith(
        query,
        options
      );
    });
  });

  describe('error handling', () => {
    it('should throw error when similarity search fails', async () => {
      await service.initialize();
      
      mockVectorStoreInstance.similaritySearchWithScore.mockRejectedValueOnce(
        new Error('Search failed')
      );

      await expect(
        service.similaritySearchWithScore('test', 5)
      ).rejects.toThrow('Search failed');
    });

    it('should throw error when adding documents fails', async () => {
      await service.initialize();
      
      mockVectorStoreInstance.addDocuments.mockRejectedValueOnce(
        new Error('Add documents failed')
      );

      await expect(
        service.addDocuments([createMockDocument('test')])
      ).rejects.toThrow('Add documents failed');
    });
  });
});
