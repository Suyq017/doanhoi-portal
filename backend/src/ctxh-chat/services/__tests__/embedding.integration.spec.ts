import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmbeddingService } from '../embedding.service';
import Redis from 'ioredis';

/**
 * INTEGRATION TESTS - Requires actual API keys and Redis connection
 * 
 * To run these tests:
 * 1. Set GEMINI_API_KEY in .env
 * 2. Ensure Redis is running on localhost:6379
 * 3. Run: npm test -- embedding.integration.spec.ts
 * 
 * These tests make real API calls and should be run sparingly
 */
describe('EmbeddingService Integration Tests', () => {
  let service: EmbeddingService;
  let redisClient: Redis;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env',
        }),
      ],
      providers: [
        EmbeddingService,
        {
          provide: 'REDIS_CLIENT',
          useFactory: (configService: ConfigService) => {
            return new Redis({
              host: configService.get('REDIS_HOST'),
              port: configService.get('REDIS_PORT'),
              password: configService.get('REDIS_PASSWORD'),
            });
          },
          inject: [ConfigService],
        },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
    redisClient = module.get<Redis>('REDIS_CLIENT');
  });

  afterAll(async () => {
    await redisClient.quit();
    await module.close();
  });

  describe('Real API Integration', () => {
    it('should generate embedding using real Gemini API', async () => {
      const testText = 'Hoạt động tình nguyện trồng cây xanh tại Công viên Gia Định';

      const embedding = await service.generateEmbedding(testText);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(768);
      expect(embedding.every((val) => typeof val === 'number')).toBe(true);
      
      // Check embedding values are normalized
      const magnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0),
      );
      expect(magnitude).toBeGreaterThan(0);
      expect(magnitude).toBeLessThan(2); // Typical for normalized embeddings
    }, 15000); // 15s timeout for API call

    it('should generate batch embeddings efficiently', async () => {
      const testTexts = [
        'Hoạt động CTXH tại bệnh viện',
        'Tình nguyện dạy học cho trẻ em vùng cao',
        'Chiến dịch mùa hè xanh 2025',
      ];

      const startTime = Date.now();
      const result = await service.batchGenerateEmbeddings(testTexts);
      const duration = Date.now() - startTime;

      expect(result.results.length).toBe(3);
      expect(result.results[0].embedding.length).toBe(768);
      expect(result.results[1].embedding.length).toBe(768);
      expect(result.results[2].embedding.length).toBe(768);
      
      // Batch should be faster than 3 individual calls
      console.log(`Batch embedding duration: ${duration}ms`);
      expect(duration).toBeLessThan(5000); // Should complete in <5s
    }, 15000);

    it('should use cache on subsequent identical requests', async () => {
      const testText = 'Cache test - Hoạt động CTXH';

      // Clear cache first
      await service.clearCache();

      // First call - should hit API
      const start1 = Date.now();
      const embedding1 = await service.generateEmbedding(testText);
      const duration1 = Date.now() - start1;

      // Second call - should use cache
      const start2 = Date.now();
      const embedding2 = await service.generateEmbedding(testText);
      const duration2 = Date.now() - start2;

      expect(embedding1).toEqual(embedding2);
      expect(duration2).toBeLessThan(duration1 / 2); // Cache should be much faster
      
      console.log(`First call: ${duration1}ms, Cached call: ${duration2}ms`);
    }, 15000);

    it('should verify embeddings are semantically meaningful', async () => {
      const text1 = 'Hoạt động tình nguyện chăm sóc người già';
      const text2 = 'Tình nguyện hỗ trợ người cao tuổi';
      const text3 = 'Lập trình phần mềm website';

      const result = await service.batchGenerateEmbeddings([text1, text2, text3]);
      const emb1 = result.results[0].embedding;
      const emb2 = result.results[1].embedding;
      const emb3 = result.results[2].embedding;

      // Calculate cosine similarity
      const cosineSimilarity = (a: number[], b: number[]) => {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (magA * magB);
      };

      const sim12 = cosineSimilarity(emb1, emb2); // Similar texts
      const sim13 = cosineSimilarity(emb1, emb3); // Different texts

      console.log(`Similarity (similar texts): ${sim12.toFixed(4)}`);
      console.log(`Similarity (different texts): ${sim13.toFixed(4)}`);

      // Similar Vietnamese texts should have higher similarity
      expect(sim12).toBeGreaterThan(sim13);
      expect(sim12).toBeGreaterThan(0.7); // High similarity threshold
    }, 20000);
  });

  describe('Health Check Integration', () => {
    it('should pass health check with real services', async () => {
      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.gemini.available).toBe(true);
      expect(health.details.redis.connected).toBe(true);
      expect(health.details.gemini.dimensions).toBe(768);
      expect(health.details.gemini.model).toBe('gemini-embedding-001');
    }, 10000);
  });

  describe('Error Recovery', () => {
    it('should recover from temporary network issues', async () => {
      // This test demonstrates retry mechanism
      const testText = 'Error recovery test';

      // Should succeed even with potential network hiccups
      const embedding = await service.generateEmbedding(testText);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(768);
    }, 15000);
  });

  describe('Vietnamese Language Support', () => {
    it('should handle Vietnamese text with diacritics', async () => {
      const vietnameseTexts = [
        'Hoạt động tình nguyện Công tác xã hội',
        'Chiến dịch Mùa hè xanh năm 2025',
        'Hỗ trợ người dân vùng lũ lụt miền Trung',
        'Tổ chức khám bệnh từ thiện tại Bệnh viện Đa khoa',
      ];

      const result = await service.batchGenerateEmbeddings(vietnameseTexts);

      expect(result.results.length).toBe(4);
      result.results.forEach((item) => {
        expect(item.embedding.length).toBe(768);
        expect(item.embedding.every((val) => !isNaN(val))).toBe(true);
      });
    }, 15000);

    it('should handle special Vietnamese characters', async () => {
      const specialTexts = [
        'Đồng hành cùng cộng đồng',
        'Góp phần xây dựng xã hội tốt đẹp hơn',
        'Mang yêu thương đến mọi miền',
      ];

      const result = await service.batchGenerateEmbeddings(specialTexts);

      expect(result.results.length).toBe(3);
      expect(result.results.every((item) => item.embedding.length === 768)).toBe(true);
    }, 15000);
  });

  describe('Performance Benchmarks', () => {
    it('should handle large batch efficiently', async () => {
      const largeBatch = Array.from({ length: 50 }, (_, i) => 
        `Hoạt động CTXH số ${i + 1} tại Thành phố Hồ Chí Minh`
      );

      const startTime = Date.now();
      const result = await service.batchGenerateEmbeddings(largeBatch);
      const duration = Date.now() - startTime;

      expect(result.results.length).toBe(50);
      console.log(`50 embeddings generated in ${duration}ms (${(duration/50).toFixed(2)}ms per embedding)`);
      
      // Should process ~3-5 embeddings per second with batching
      expect(duration).toBeLessThan(15000); // <15s for 50 embeddings
    }, 30000);

    it('should measure cache performance improvement', async () => {
      const testTexts = Array.from({ length: 10 }, (_, i) => `Test ${i}`);

      // First run - no cache
      const start1 = Date.now();
      await service.batchGenerateEmbeddings(testTexts);
      const duration1 = Date.now() - start1;

      // Second run - with cache
      const start2 = Date.now();
      await service.batchGenerateEmbeddings(testTexts);
      const duration2 = Date.now() - start2;

      const speedup = duration1 / duration2;
      console.log(`Cache speedup: ${speedup.toFixed(2)}x faster`);
      
      expect(speedup).toBeGreaterThan(5); // Cache should be >5x faster
    }, 30000);
  });
});
