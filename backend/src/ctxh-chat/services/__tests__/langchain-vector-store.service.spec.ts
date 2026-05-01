import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LangChainVectorStoreService } from '../langchain-vector-store.service';
import { createMockConfigService } from './mocks/config.service.mock';
import { createMockDocument, createMockVectorStore } from './mocks/vector-store.mock';
import { Document } from '@langchain/core/documents';

// Create mock vector store instance
let mockVectorStoreInstance: ReturnType<typeof createMockVectorStore>;
let mockPgClient: {
  connect: jest.Mock;
  query: jest.Mock;
  end: jest.Mock;
};

// Mock pg Client used by addDocuments/metadata-filtered search
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => mockPgClient),
}));

// Mock PGVectorStore
jest.mock('@langchain/community/vectorstores/pgvector', () => ({
  PGVectorStore: {
    initialize: jest.fn().mockImplementation(async () => mockVectorStoreInstance),
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
    getEmbeddingDimension: jest.fn().mockReturnValue(768),
  },
}));

describe('LangChainVectorStoreService', () => {
  let service: LangChainVectorStoreService;
  let mockConfigService: ReturnType<typeof createMockConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockVectorStoreInstance = createMockVectorStore();
    mockPgClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({ rows: [] }),
      end: jest.fn().mockResolvedValue(undefined),
    };
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
      expect(mockVectorStoreInstance.similaritySearchWithScore).toHaveBeenCalledWith(query, k * 3);
    });

    it('should use default k value if not provided', async () => {
      const query = 'test query';

      await service.similaritySearch(query);

      expect(mockVectorStoreInstance.similaritySearchWithScore).toHaveBeenCalledWith(query, 15);
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
      expect(mockVectorStoreInstance.similaritySearchWithScore).toHaveBeenCalledWith(query, k * 3);
    });

    it('should return tuples of [Document, score]', async () => {
      const results = await service.similaritySearchWithScore('test', 2);

      results.forEach(([doc, score]) => {
        expect(doc).toBeDefined();
        expect(typeof doc.pageContent).toBe('string');
        expect(typeof doc.metadata?.score).toBe('number');
        expect(typeof score).toBe('number');
      });
    });

    it('should filter out draft documents and convert cosine distance to similarity', async () => {
      const rawDocs = [
        [createMockDocument('Active content', { status: 'ACTIVE' }), 0.2],
        [createMockDocument('Draft content', { status: 'DRAFT' }), 0.1],
      ] as [Document, number][];

      mockVectorStoreInstance.similaritySearchWithScore.mockResolvedValueOnce(rawDocs);

      const results = await service.similaritySearchWithScore('test', 5);

      expect(results).toHaveLength(1);
      expect(results[0][0].pageContent).toBe('Active content');
      expect(results[0][1]).toBeCloseTo(0.8);
      expect(results[0][0].metadata?.score).toBeCloseTo(0.8);
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

      expect(mockPgClient.connect).toHaveBeenCalled();
      expect(mockPgClient.query).toHaveBeenCalled();
    });

    it('should handle empty document array', async () => {
      await service.addDocuments([]);

      expect(mockPgClient.connect).not.toHaveBeenCalled();
      expect(mockPgClient.query).not.toHaveBeenCalled();
    });

    it('should skip invalid documents before inserting', async () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);

      await service.addDocuments([
        createMockDocument('   ', { activityId: 'a1' }),
        createMockDocument('Valid content', { activityId: undefined }),
      ]);

      expect(warnSpy).toHaveBeenCalled();
      expect(mockPgClient.connect).not.toHaveBeenCalled();
      expect(mockPgClient.query).not.toHaveBeenCalled();
    });

    it('should continue when an embedding is empty', async () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
      (service as any).embeddings = {
        embedQuery: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([0.1, 0.2, 0.3]),
      };

      await service.addDocuments([
        createMockDocument('Doc 1', { activityId: 'a1' }),
      ]);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Empty embedding for activity'));
      expect(mockPgClient.connect).toHaveBeenCalled();
      expect(mockPgClient.query).not.toHaveBeenCalled();
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

      expect(mockVectorStoreInstance.asRetriever).toHaveBeenCalledWith(10);
    });

    it('should throw error when not initialized', () => {
      // Create a new service without initialization
      const uninitializedService = new LangChainVectorStoreService(mockConfigService as any);

      expect(() => uninitializedService.getRetriever()).toThrow(
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

      mockPgClient.query.mockRejectedValueOnce(
        new Error('Add documents failed')
      );

      await expect(
        service.addDocuments([createMockDocument('test')])
      ).rejects.toThrow('Add documents failed');
    });

    it('should throw when initialization fails', async () => {
      const { PGVectorStore } = require('@langchain/community/vectorstores/pgvector');
      PGVectorStore.initialize.mockRejectedValueOnce(new Error('Init failed'));

      const freshService = new LangChainVectorStoreService(mockConfigService as any);

      await expect(freshService.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('private filter helpers and metadata search', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should normalize statuses and evaluate date filters', () => {
      const normalize = (service as any).normalizeActivityStatus.bind(service);
      const shouldInclude = (service as any).shouldIncludeInRetrieval.bind(service);
      const matches = (service as any).matchesDateAndStatusFilter.bind(service);

      expect(normalize('active')).toBe('ACTIVE');
      expect(normalize('invalid')).toBeUndefined();
      expect(normalize(null)).toBeUndefined();
      expect(shouldInclude(createMockDocument('x', { status: 'DRAFT' }))).toBe(false);
      expect(shouldInclude(createMockDocument('x', { status: 'ACTIVE' }))).toBe(true);

      const today = new Date('2026-04-28T00:00:00.000Z');
      expect(matches(createMockDocument('x', { status: 'ACTIVE', startDate: '2026-04-27T00:00:00.000Z', endDate: '2026-04-29T00:00:00.000Z' }), today, 'ongoing')).toBe(true);
      expect(matches(createMockDocument('x', { status: 'ACTIVE', startDate: '2026-04-30T00:00:00.000Z', endDate: '2026-05-01T00:00:00.000Z' }), today, 'upcoming')).toBe(true);
      expect(matches(createMockDocument('x', { status: 'COMPLETED' }), today, 'ended')).toBe(true);
      expect(matches(createMockDocument('x', { status: 'DRAFT' }), today, 'all')).toBe(false);
    });

    it('should build status and date range SQL fragments', () => {
      const buildStatus = (service as any).buildStatusConditions.bind(service);
      const buildDate = (service as any).buildDateRangeCondition.bind(service);

      const params: any[] = [];
      const statusResult = buildStatus(['ongoing', 'ended'], '2026-04-28', params, 2);
      expect(statusResult.clause).toContain('metadata->>\'status\'');
      expect(statusResult.nextIndex).toBeGreaterThan(2);

      const noDateResult = buildStatus(['ongoing'], undefined, [], 2);
      expect(noDateResult.clause).toBe('');

      const dateResult = buildDate({ startDate: '2026-04-01', endDate: '2026-04-30' } as any, '2026-04-28', [], 2);
      expect(dateResult.clause).toContain('metadata->>\'endDate\'');
      expect(dateResult.clause).toContain('metadata->>\'startDate\'');

      const emptyDateResult = buildDate({ startDate: null, endDate: null } as any, '2026-04-28', [], 2);
      expect(emptyDateResult.clause).toBe('');
    });

    it('should run metadata-filtered search and fallback on query errors', async () => {
      (service as any).embeddings = {
        embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      };

      const fallbackSpy = jest.spyOn(service, 'similaritySearchWithDateFilter').mockResolvedValue([
        createMockDocument('Fallback content', { status: 'ACTIVE' }),
      ]);

      const rows = [
        {
          content_text: 'Filtered content',
          metadata: JSON.stringify({ activityId: 'a1', status: 'ACTIVE' }),
          similarity_score: '0.9',
        },
      ];
      mockPgClient.query.mockResolvedValueOnce({ rows });

      const results = await service.similaritySearchWithMetadataFilters(
        'test query',
        { organizationKeywords: ['Khoa A'], locationRaw: ['HCM'], status: ['ongoing'], dateRange: { startDate: '2026-04-01', endDate: '2026-05-01' } } as any,
        5,
        '2026-04-28',
      );

      expect(results).toHaveLength(1);
      expect(results[0].pageContent).toBe('Filtered content');
      expect(mockPgClient.connect).toHaveBeenCalled();
      expect(mockPgClient.end).toHaveBeenCalled();

      mockPgClient.query.mockRejectedValueOnce(new Error('query failed'));
      const fallbackResults = await service.similaritySearchWithMetadataFilters(
        'test query',
        { organizationKeywords: [], locationRaw: [], status: [], dateRange: null } as any,
        3,
        '2026-04-28',
      );

      expect(fallbackSpy).toHaveBeenCalled();
      expect(fallbackResults).toEqual([expect.objectContaining({ pageContent: 'Fallback content' })]);
    });
  });
});
