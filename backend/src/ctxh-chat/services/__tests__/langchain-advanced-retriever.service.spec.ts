import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LangChainAdvancedRetrieverService } from '../langchain-advanced-retriever.service';
import { LangChainVectorStoreService } from '../langchain-vector-store.service';
import { createMockConfigService } from './mocks/config.service.mock';
import { createMockVectorStoreService, createMockDocument } from './mocks/vector-store.mock';
import { Document } from '@langchain/core/documents';

// Mock MultiQueryRetriever
const mockMultiQueryRetrieverInstance = {
  invoke: jest.fn().mockResolvedValue([
    createMockDocument('Multi query result 1', { activityId: 'mq-1' }),
    createMockDocument('Multi query result 2', { activityId: 'mq-2' }),
  ]),
};

jest.mock('@langchain/classic/retrievers/multi_query', () => ({
  MultiQueryRetriever: {
    fromLLM: jest.fn().mockReturnValue(mockMultiQueryRetrieverInstance),
  },
}));

// Mock LangChainConfig
jest.mock('../../config/langchain.config', () => ({
  LangChainConfig: {
    getLLM: jest.fn().mockReturnValue({
      invoke: jest.fn().mockResolvedValue({ content: 'Response' }),
    }),
  },
}));

describe('LangChainAdvancedRetrieverService', () => {
  let service: LangChainAdvancedRetrieverService;
  let vectorStoreService: ReturnType<typeof createMockVectorStoreService>;
  let mockConfigService: ReturnType<typeof createMockConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    vectorStoreService = createMockVectorStoreService();
    mockConfigService = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LangChainAdvancedRetrieverService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LangChainVectorStoreService,
          useValue: vectorStoreService,
        },
      ],
    }).compile();

    service = module.get<LangChainAdvancedRetrieverService>(
      LangChainAdvancedRetrieverService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMultiQueryRetriever', () => {
    it('should create multi-query retriever', async () => {
      const retriever = await service.getMultiQueryRetriever();

      expect(retriever).toBeDefined();
      expect(retriever).toBe(mockMultiQueryRetrieverInstance);
    });

    it('should cache and reuse retriever', async () => {
      const retriever1 = await service.getMultiQueryRetriever();
      const retriever2 = await service.getMultiQueryRetriever();

      expect(retriever1).toBe(retriever2);
    });
  });

  describe('multiQuerySearch', () => {
    it('should perform multi-query search', async () => {
      const query = 'What CTXH activities are available?';

      const results = await service.multiQuerySearch(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(mockMultiQueryRetrieverInstance.invoke).toHaveBeenCalledWith(query);
    });

    it('should deduplicate results', async () => {
      const duplicateDoc = createMockDocument('Same content', { activityId: 'dup-1' });
      mockMultiQueryRetrieverInstance.invoke.mockResolvedValueOnce([
        duplicateDoc,
        duplicateDoc,
        duplicateDoc,
      ]);

      const results = await service.multiQuerySearch('test', 5);

      // Should have only unique documents
      expect(results.length).toBe(1);
    });

    it('should limit results to k', async () => {
      const manyDocs = Array.from({ length: 10 }, (_, i) =>
        createMockDocument(`Content ${i}`, { activityId: `id-${i}` })
      );
      mockMultiQueryRetrieverInstance.invoke.mockResolvedValueOnce(manyDocs);

      const results = await service.multiQuerySearch('test', 5);

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should fallback to similarity search on error', async () => {
      mockMultiQueryRetrieverInstance.invoke.mockRejectedValueOnce(
        new Error('Multi-query failed')
      );

      const results = await service.multiQuerySearch('test query');

      expect(results).toBeDefined();
      expect(vectorStoreService.similaritySearch).toHaveBeenCalled();
    });
  });

  describe('hybridSearch', () => {
    it('should perform hybrid search', async () => {
      const query = 'hybrid search test';

      const results = await service.hybridSearch(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should combine semantic and MMR results', async () => {
      vectorStoreService.similaritySearchWithScore.mockResolvedValue([
        [createMockDocument('Semantic result', { activityId: 'sem-1' }), 0.95],
      ]);
      vectorStoreService.maxMarginalRelevanceSearch.mockResolvedValue([
        createMockDocument('MMR result', { activityId: 'mmr-1' }),
      ]);

      const results = await service.hybridSearch('test');

      expect(results.length).toBeGreaterThan(0);
      expect(vectorStoreService.similaritySearchWithScore).toHaveBeenCalled();
      expect(vectorStoreService.maxMarginalRelevanceSearch).toHaveBeenCalled();
    });

    it('should use only semantic search when MMR is disabled', async () => {
      const results = await service.hybridSearch('test', {
        includeSemanticSearch: true,
        includeMMRSearch: false,
      });

      expect(results).toBeDefined();
      expect(vectorStoreService.similaritySearchWithScore).toHaveBeenCalled();
      expect(vectorStoreService.maxMarginalRelevanceSearch).not.toHaveBeenCalled();
    });

    it('should use only MMR search when semantic is disabled', async () => {
      const results = await service.hybridSearch('test', {
        includeSemanticSearch: false,
        includeMMRSearch: true,
      });

      expect(results).toBeDefined();
      expect(vectorStoreService.similaritySearchWithScore).not.toHaveBeenCalled();
      expect(vectorStoreService.maxMarginalRelevanceSearch).toHaveBeenCalled();
    });

    it('should apply custom weights', async () => {
      vectorStoreService.similaritySearchWithScore.mockResolvedValue([
        [createMockDocument('Semantic', { activityId: 'sem-1' }), 0.9],
      ]);
      vectorStoreService.maxMarginalRelevanceSearch.mockResolvedValue([
        createMockDocument('MMR', { activityId: 'mmr-1' }),
      ]);

      const results = await service.hybridSearch('test', {
        weights: { semantic: 0.8, mmr: 0.2 },
      });

      expect(results).toBeDefined();
    });

    it('should limit results to k', async () => {
      const manySemanticDocs = Array.from({ length: 10 }, (_, i) => [
        createMockDocument(`Semantic ${i}`, { activityId: `sem-${i}` }),
        0.9 - i * 0.05,
      ] as [Document, number]);
      const manyMMRDocs = Array.from({ length: 10 }, (_, i) =>
        createMockDocument(`MMR ${i}`, { activityId: `mmr-${i}` })
      );

      vectorStoreService.similaritySearchWithScore.mockResolvedValue(manySemanticDocs);
      vectorStoreService.maxMarginalRelevanceSearch.mockResolvedValue(manyMMRDocs);

      const results = await service.hybridSearch('test', { k: 5 });

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should deduplicate results from different search methods', async () => {
      const sharedDoc = createMockDocument('Shared content', { activityId: 'shared-1' });

      vectorStoreService.similaritySearchWithScore.mockResolvedValue([
        [sharedDoc, 0.95],
      ]);
      vectorStoreService.maxMarginalRelevanceSearch.mockResolvedValue([sharedDoc]);

      const results = await service.hybridSearch('test');

      // Count documents with same activityId
      const activityIds = results.map(r => r.metadata?.activityId);
      const uniqueIds = [...new Set(activityIds)];
      expect(activityIds.length).toBe(uniqueIds.length);
    });

    it('should fallback to simple search on error', async () => {
      vectorStoreService.similaritySearchWithScore.mockRejectedValue(
        new Error('Search failed')
      );

      const results = await service.hybridSearch('test');

      expect(results).toBeDefined();
      expect(vectorStoreService.similaritySearch).toHaveBeenCalled();
    });
  });

  describe('contextualSearch', () => {
    it('should perform contextual search', async () => {
      const query = 'contextual test';

      const results = await service.contextualSearch(query);

      expect(results).toBeDefined();
      expect(vectorStoreService.similaritySearch).toHaveBeenCalled();
    });

    it('should pass k parameter', async () => {
      await service.contextualSearch('test', 10);

      expect(vectorStoreService.similaritySearch).toHaveBeenCalledWith('test', 10);
    });
  });

  describe('rerankResults', () => {
    it('should rerank and limit results', async () => {
      const documents = Array.from({ length: 10 }, (_, i) =>
        createMockDocument(`Doc ${i}`, { activityId: `id-${i}` })
      );

      const reranked = await service.rerankResults('test', documents, 3);

      expect(reranked.length).toBe(3);
    });

    it('should return all documents if less than topK', async () => {
      const documents = [
        createMockDocument('Doc 1'),
        createMockDocument('Doc 2'),
      ];

      const reranked = await service.rerankResults('test', documents, 5);

      expect(reranked.length).toBe(2);
    });
  });

  describe('clearCache', () => {
    it('should clear cached retrievers', async () => {
      // First create and cache a retriever
      await service.getMultiQueryRetriever();

      // Clear cache
      service.clearCache();

      // Getting retriever again should create a new one
      const { MultiQueryRetriever } = require('@langchain/classic/retrievers/multi_query');
      const callCountBefore = MultiQueryRetriever.fromLLM.mock.calls.length;

      await service.getMultiQueryRetriever();

      expect(MultiQueryRetriever.fromLLM.mock.calls.length).toBe(callCountBefore + 1);
    });
  });

  describe('document key generation', () => {
    it('should use activityId as key when available', async () => {
      const doc1 = createMockDocument('Content 1', { activityId: 'same-id' });
      const doc2 = createMockDocument('Different content', { activityId: 'same-id' });

      mockMultiQueryRetrieverInstance.invoke.mockResolvedValueOnce([doc1, doc2]);

      const results = await service.multiQuerySearch('test');

      // Documents with same activityId should be deduplicated
      expect(results.length).toBe(1);
    });

    it('should use content hash when activityId not available', async () => {
      const doc1 = createMockDocument('Same content start...', {});
      const doc2 = createMockDocument('Same content start...', {});

      // Remove activityId from metadata
      delete doc1.metadata.activityId;
      delete doc2.metadata.activityId;

      mockMultiQueryRetrieverInstance.invoke.mockResolvedValueOnce([doc1, doc2]);

      const results = await service.multiQuerySearch('test');

      // Documents with same content should be deduplicated
      expect(results.length).toBe(1);
    });
  });

  describe('private helper branches', () => {
    it('should normalize statuses and filter out draft documents', () => {
      const normalize = (service as any).normalizeActivityStatus.bind(service);
      const filterOutDraft = (service as any).filterOutDraftDocuments.bind(service);

      expect(normalize('active')).toBe('ACTIVE');
      expect(normalize('unknown')).toBeUndefined();
      expect(normalize(undefined)).toBeUndefined();

      const docs = [
        createMockDocument('Draft doc', { status: 'DRAFT', activityId: 'draft-1' }),
        createMockDocument('Active doc', { status: 'ACTIVE', activityId: 'active-1' }),
        createMockDocument('Weird doc', { status: 'not-a-status', activityId: 'weird-1' }),
      ];

      const filtered = filterOutDraft(docs);
      expect(filtered.map((doc: Document) => doc.metadata?.activityId)).toEqual(['active-1', 'weird-1']);
    });

    it('should rank and combine duplicate results by content', () => {
      const rankAndCombine = (service as any).rankAndCombineResults.bind(service);

      const sharedA = createMockDocument('Shared content', {});
      const sharedB = createMockDocument('Shared content', {});
      const unique = createMockDocument('Unique content', { activityId: 'unique-1' });

      const ranked = rankAndCombine([
        { document: sharedA, score: 0.9, searchType: 'semantic' },
        { document: sharedB, score: 0.8, searchType: 'mmr' },
        { document: unique, score: 0.7, searchType: 'multi_query' },
      ], 5);

      expect(ranked).toHaveLength(2);
      expect(ranked[0].metadata?.score).toBeGreaterThan(ranked[1].metadata?.score);
      expect(ranked[0].pageContent).toBe('Shared content');
    });

    it('should deduplicate by content hash when activityId is missing', () => {
      const deduplicate = (service as any).deduplicateResults.bind(service);

      const doc1 = createMockDocument('Same content start for hash dedupe', { activityId: undefined });
      const doc2 = createMockDocument('Same content start for hash dedupe', { activityId: undefined });
      delete doc1.metadata.activityId;
      delete doc2.metadata.activityId;

      const unique = deduplicate([doc1, doc2], 5);
      expect(unique).toHaveLength(1);
      expect(unique[0].pageContent).toBe('Same content start for hash dedupe');
    });
  });
});
