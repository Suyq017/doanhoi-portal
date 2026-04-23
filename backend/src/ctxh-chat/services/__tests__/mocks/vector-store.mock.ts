import { Document } from '@langchain/core/documents';

/**
 * Create a mock Document for testing
 */
export const createMockDocument = (
  pageContent: string = 'Test content',
  metadata: Record<string, any> = {},
): Document => {
  return new Document({
    pageContent,
    metadata: {
      activityId: 'test-activity-id',
      activityName: 'Test Activity',
      organizationName: 'Test Organization',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-02T00:00:00.000Z',
      totalDays: 1,
      location: 'Test Location',
      status: 'ACTIVE',
      chunkType: 'full_activity',
      ...metadata,
    },
  });
};

/**
 * Create multiple mock Documents
 */
export const createMockDocuments = (count: number): Document[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockDocument(`Test content ${i + 1}`, { activityId: `activity-${i + 1}` }),
  );
};

/**
 * Mock PGVectorStore instance
 */
export const createMockVectorStore = () => ({
  similaritySearch: jest.fn().mockResolvedValue([
    createMockDocument('Test content 1'),
    createMockDocument('Test content 2'),
  ]),
  similaritySearchWithScore: jest.fn().mockResolvedValue([
    [createMockDocument('Test content 1'), 0.95],
    [createMockDocument('Test content 2'), 0.85],
  ]),
  addDocuments: jest.fn().mockResolvedValue(undefined),
  maxMarginalRelevanceSearch: jest.fn().mockResolvedValue([
    createMockDocument('MMR content 1'),
    createMockDocument('MMR content 2'),
  ]),
  asRetriever: jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue([createMockDocument('Retrieved content')]),
  }),
});

/**
 * Mock LangChainVectorStoreService
 */
export const createMockVectorStoreService = () => {
  const mockVectorStore = createMockVectorStore();
  
  return {
    isInitialized: jest.fn().mockReturnValue(true),
    initialize: jest.fn().mockResolvedValue(undefined),
    similaritySearch: mockVectorStore.similaritySearch,
    similaritySearchWithScore: mockVectorStore.similaritySearchWithScore,
    addDocuments: mockVectorStore.addDocuments,
    maxMarginalRelevanceSearch: mockVectorStore.maxMarginalRelevanceSearch,
    getRetriever: jest.fn().mockReturnValue({
      invoke: jest.fn().mockResolvedValue([createMockDocument('Retrieved content')]),
    }),
    getVectorStore: jest.fn().mockReturnValue(mockVectorStore),
    getEmbeddings: jest.fn().mockReturnValue({
      embedDocuments: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
      embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    }),
  };
};
