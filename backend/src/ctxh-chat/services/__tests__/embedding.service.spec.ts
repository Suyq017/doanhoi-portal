import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from '../embedding.service';

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockRedisClient: any;
  let mockGeminiAI: any;

  beforeEach(async () => {
    // Mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      setex: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    // Mock Gemini AI
    mockGeminiAI = {
      models: {
        embedContent: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                GEMINI_API_KEY: 'test-api-key',
                GOOGLE_API_KEY: 'test-api-key',
              };
              return config[key];
            }),
          },
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
    // Inject mock Gemini client
    (service as any).geminiAI = mockGeminiAI;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmbedding - Single Embedding', () => {
    it('should generate embedding for a single text', async () => {
      const testText = 'Hoạt động CTXH tình nguyện vì cộng đồng';
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

      mockRedisClient.get.mockResolvedValue(null);
      mockGeminiAI.models.embedContent.mockResolvedValue({
        embeddings: [{ values: mockEmbedding }],
      });

      const result = await service.generateEmbedding(testText);

      expect(result).toEqual(mockEmbedding);
      expect(result.length).toBe(768);
      expect(mockGeminiAI.models.embedContent).toHaveBeenCalledWith({
        model: 'gemini-embedding-001',
        contents: testText,
        config: { outputDimensionality: 768 },
      });
    });

    it('should return cached embedding if available', async () => {
      const testText = 'Hoạt động CTXH tình nguyện';
      const cachedEmbedding = new Array(768).fill(0).map(() => Math.random());

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedEmbedding));

      const result = await service.generateEmbedding(testText);

      expect(result).toEqual(cachedEmbedding);
      expect(mockGeminiAI.models.embedContent).not.toHaveBeenCalled();
    });

    it('should cache the embedding after generation', async () => {
      const testText = 'Hoạt động trồng cây xanh';
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

      mockRedisClient.get.mockResolvedValue(null);
      mockGeminiAI.models.embedContent.mockResolvedValue({
        embeddings: [{ values: mockEmbedding }],
      });

      await service.generateEmbedding(testText);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.stringContaining('embedding:'),
        2592000, // 30 days
        JSON.stringify(mockEmbedding),
      );
    });

    it('should handle empty text gracefully', async () => {
      await expect(service.generateEmbedding('')).rejects.toThrow();
    });
  });

  describe('batchGenerateEmbeddings - Batch Embedding', () => {
    it('should generate embeddings for multiple texts', async () => {
      const testTexts = [
        'Hoạt động CTXH 1',
        'Hoạt động CTXH 2',
        'Hoạt động CTXH 3',
      ];
      const mockEmbeddings = testTexts.map(() =>
        new Array(768).fill(0).map(() => Math.random()),
      );

      mockRedisClient.get.mockResolvedValue(null);
      mockGeminiAI.models.embedContent.mockResolvedValue({
        embeddings: mockEmbeddings.map((values) => ({ values })),
      });

      const result = await service.batchGenerateEmbeddings(testTexts);

      expect(result.results.length).toBe(3);
      expect(result.results[0].embedding.length).toBe(768);
      expect(mockGeminiAI.models.embedContent).toHaveBeenCalledWith({
        model: 'gemini-embedding-001',
        contents: testTexts,
        config: { outputDimensionality: 768 },
      });
    });

    it('should use cached embeddings when available', async () => {
      const testTexts = ['Text 1', 'Text 2'];
      const cachedEmbedding1 = new Array(768).fill(0).map(() => Math.random());
      const newEmbedding2 = new Array(768).fill(0).map(() => Math.random());

      // First text is cached, second is not
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(cachedEmbedding1))
        .mockResolvedValueOnce(null);

      mockGeminiAI.models.embedContent.mockResolvedValue({
        embeddings: [{ values: newEmbedding2 }],
      });

      const result = await service.batchGenerateEmbeddings(testTexts);

      expect(result.results.length).toBe(2);
      expect(result.results[0].embedding).toEqual(cachedEmbedding1);
      expect(result.results[1].embedding).toEqual(newEmbedding2);
      // API should only be called for uncached text
      expect(mockGeminiAI.models.embedContent).toHaveBeenCalledTimes(1);
    });

    it('should handle batch size limits correctly', async () => {
      const testTexts = new Array(25).fill(0).map((_, i) => `Text ${i}`);
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

      mockRedisClient.get.mockResolvedValue(null);
      mockGeminiAI.models.embedContent.mockResolvedValue({
        embeddings: new Array(20).fill({ values: mockEmbedding }),
      });

      const result = await service.batchGenerateEmbeddings(testTexts);

      expect(result.results.length).toBe(25);
      // Should be called twice: 20 + 5
      expect(mockGeminiAI.models.embedContent).toHaveBeenCalledTimes(2);
    });

    it('should handle empty array', async () => {
      const result = await service.batchGenerateEmbeddings([]);
      expect(result.results).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should retry on API failure', async () => {
      const testText = 'Test text';
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

      mockRedisClient.get.mockResolvedValue(null);
      
      // Fail first 2 times, succeed on 3rd
      mockGeminiAI.models.embedContent
        .mockRejectedValueOnce(new Error('API Error'))
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          embeddings: [{ values: mockEmbedding }],
        });

      const result = await service.generateEmbedding(testText);

      expect(result).toEqual(mockEmbedding);
      expect(mockGeminiAI.models.embedContent).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const testText = 'Test text';

      mockRedisClient.get.mockResolvedValue(null);
      mockGeminiAI.models.embedContent.mockRejectedValue(
        new Error('Persistent API Error'),
      );

      await expect(service.generateEmbedding(testText)).rejects.toThrow();
      expect(mockGeminiAI.models.embedContent).toHaveBeenCalledTimes(3);
    });

    it('should handle malformed API response', async () => {
      const testText = 'Test text';

      mockRedisClient.get.mockResolvedValue(null);
      mockGeminiAI.models.embedContent.mockResolvedValue({
        embeddings: [], // Empty response
      });

      const result = await service.generateEmbedding(testText);
      expect(result).toEqual([]);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when all systems operational', async () => {
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

      mockGeminiAI.models.embedContent.mockResolvedValue({
        embeddings: [{ values: mockEmbedding }],
      });

      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.gemini.available).toBe(true);
      expect(health.details.redis.connected).toBe(true);
      expect(health.details.gemini.dimensions).toBe(768);
    });

    it('should return unhealthy status when Gemini API fails', async () => {
      mockGeminiAI.models.embedContent.mockRejectedValue(
        new Error('API Error'),
      );

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.error).toBeDefined();
    });

    it('should return unhealthy status when Redis fails', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Redis Error'));
      mockGeminiAI.models.embedContent.mockRejectedValue(new Error('Redis Error'));

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.error).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should generate correct cache key for text', () => {
      const text1 = 'Same text';
      const text2 = 'Same text';
      const text3 = 'Different text';

      // Note: Testing private method indirectly through behavior
      mockRedisClient.get.mockResolvedValue(null);
      mockGeminiAI.models.embedContent.mockResolvedValue({
        embeddings: [{ values: new Array(768).fill(0) }],
      });

      // Same text should generate same cache key
      service.generateEmbedding(text1);
      service.generateEmbedding(text2);
      
      const calls = mockRedisClient.get.mock.calls;
      expect(calls[0][0]).toBe(calls[1][0]);
    });

    it('should handle Redis cache errors gracefully', async () => {
      const testText = 'Test text';
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

      mockRedisClient.get.mockRejectedValue(new Error('Redis Error'));
      mockGeminiAI.models.embedContent.mockResolvedValue({
        embeddings: [{ values: mockEmbedding }],
      });

      // Should still work even if cache fails
      const result = await service.generateEmbedding(testText);
      expect(result.length).toBe(768);
      expect(mockGeminiAI.models.embedContent).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should complete single embedding in reasonable time', async () => {
      const testText = 'Performance test';
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

      mockRedisClient.get.mockResolvedValue(null);
      mockGeminiAI.models.embedContent.mockResolvedValue({
        embeddings: [{ values: mockEmbedding }],
      });

      const startTime = Date.now();
      await service.generateEmbedding(testText);
      const duration = Date.now() - startTime;

      // Should complete within 100ms (mocked, but tests the flow)
      expect(duration).toBeLessThan(100);
    });

    it('should process batch faster than individual calls', async () => {
      const testTexts = new Array(10).fill(0).map((_, i) => `Text ${i}`);
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

      jest.clearAllMocks(); // Clear previous mocks
      mockRedisClient.get.mockResolvedValue(null);
      mockGeminiAI.models.embedContent.mockResolvedValue({
        embeddings: testTexts.map(() => ({ values: mockEmbedding })),
      });

      await service.batchGenerateEmbeddings(testTexts);

      // Should make 1 API call for batch, not 10
      expect(mockGeminiAI.models.embedContent).toHaveBeenCalledTimes(1);
    });
  });
});
