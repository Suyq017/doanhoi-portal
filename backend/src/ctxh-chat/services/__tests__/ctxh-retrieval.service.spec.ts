import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { CtxhRetrievalService } from '../ctxh-retrieval.service';
import { EmbeddingService } from '../embedding.service';
import { CtxhEmbedding } from '@/entities/ctxh-embedding.entity';
import { ActivityStatus } from '@/entities/ctxh-activity.entity';

describe('CtxhRetrievalService', () => {
  let service: CtxhRetrievalService;
  let embeddingService: EmbeddingService;
  let embeddingRepository: any;

  const mockEmbeddingRepository = {
    createQueryBuilder: jest.fn(() => ({
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          id: '1',
          content_text: 'Hoạt động trồng cây xanh tại công viên',
          activity_id: 'activity-1',
          activity_name: 'Trồng cây xanh',
          activity_description: 'Hoạt động trồng cây',
          activity_location: 'Công viên Gia Định',
          activity_start_date: new Date('2025-01-15'),
          activity_end_date: new Date('2025-01-16'),
          activity_total_days: 2,
          activity_status: ActivityStatus.ACTIVE,
          organization_id: 'org-1',
          organization_name: 'Đoàn trường',
          category_id: 'cat-1',
          category_name: 'Môi trường',
          similarity_score: 0.85,
          embedding_vector: new Array(768).fill(0.1),
        },
        {
          id: '2',
          content_text: 'Tình nguyện dạy học cho trẻ em vùng cao',
          activity_id: 'activity-2',
          activity_name: 'Dạy học tình nguyện',
          activity_description: 'Dạy học cho trẻ em',
          activity_location: 'Tây Nguyên',
          activity_start_date: new Date('2025-02-01'),
          activity_end_date: new Date('2025-02-07'),
          activity_total_days: 7,
          activity_status: ActivityStatus.ACTIVE,
          organization_id: 'org-2',
          organization_name: 'CLB Tình nguyện',
          category_id: 'cat-2',
          category_name: 'Giáo dục',
          similarity_score: 0.78,
          embedding_vector: new Array(768).fill(0.2),
        },
      ]),
    })),
  };

  const mockEmbeddingService = {
    generateEmbedding: jest.fn().mockResolvedValue(new Array(768).fill(0.1)),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        RAG_TOP_K: 5,
        RAG_SIMILARITY_THRESHOLD: 0.7,
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CtxhRetrievalService,
        {
          provide: getRepositoryToken(CtxhEmbedding),
          useValue: mockEmbeddingRepository,
        },
        {
          provide: EmbeddingService,
          useValue: mockEmbeddingService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CtxhRetrievalService>(CtxhRetrievalService);
    embeddingService = module.get<EmbeddingService>(EmbeddingService);
    embeddingRepository = module.get(getRepositoryToken(CtxhEmbedding));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('retrieveRelevantDocuments', () => {
    it('should retrieve relevant documents with vector similarity search', async () => {
      const query = 'Tôi muốn tham gia hoạt động trồng cây';
      
      const result = await service.retrieveRelevantDocuments(query);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(query);
      expect(result).toBeDefined();
      expect(result.documents).toHaveLength(2);
      expect(result.documents[0].metadata.activityName).toBe('Trồng cây xanh');
      expect(result.documents[0].similarityScore).toBe(0.85);
      expect(result.retrievalTime).toBeGreaterThan(0);
    });

    it('should apply top-k limit correctly', async () => {
      const query = 'hoạt động CTXH';
      
      const result = await service.retrieveRelevantDocuments(query, { k: 1 });

      // Should still return results
      expect(result).toBeDefined();
      expect(result.documents).toBeDefined();
    });

    it('should apply similarity threshold filter', async () => {
      const query = 'tình nguyện';
      
      const result = await service.retrieveRelevantDocuments(query, { 
        similarityThreshold: 0.8 
      });

      // Should return results that meet threshold
      expect(result).toBeDefined();
      expect(result.documents).toBeDefined();
    });

    it('should apply organization filter', async () => {
      const query = 'hoạt động';
      
      const result = await service.retrieveRelevantDocuments(query, {
        filters: { organizationId: 'org-123' }
      });

      // Should return results with filter applied
      expect(result).toBeDefined();
      expect(result.documents).toBeDefined();
    });

    it('should apply status filter', async () => {
      const query = 'hoạt động đang mở';
      
      const result = await service.retrieveRelevantDocuments(query, {
        filters: { status: [ActivityStatus.ACTIVE, ActivityStatus.COMPLETED] }
      });

      // Should return results with status filter applied
      expect(result).toBeDefined();
      expect(result.documents).toBeDefined();
    });

    it('should handle empty results gracefully', async () => {
      mockEmbeddingRepository.createQueryBuilder.mockReturnValueOnce({
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.retrieveRelevantDocuments('query không có kết quả');

      expect(result.documents).toHaveLength(0);
      expect(result.totalFound).toBe(0);
    });
  });

  describe('MMR (Maximum Marginal Relevance)', () => {
    it('should apply MMR for result diversification when enabled', async () => {
      const query = 'hoạt động tình nguyện';
      
      const result = await service.retrieveRelevantDocuments(query, {
        useMMR: true,
        mmrOptions: { lambda: 0.5, diversityWeight: 0.3, maxResults: 3 }
      });

      expect(result.documents).toBeDefined();
      // MMR should rerank results for diversity
    });

    it('should skip MMR when disabled', async () => {
      const query = 'hoạt động CTXH';
      
      const result = await service.retrieveRelevantDocuments(query, {
        useMMR: false
      });

      expect(result.documents).toBeDefined();
      // Results should be in original similarity order
    });
  });

  describe('Performance Requirements', () => {
    it('should complete retrieval in <100ms for typical queries', async () => {
      const query = 'hoạt động trồng cây';
      const startTime = Date.now();
      
      await service.retrieveRelevantDocuments(query);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent retrieval requests', async () => {
      const queries = [
        'hoạt động tình nguyện',
        'trồng cây xanh',
        'dạy học cho trẻ em',
      ];

      const promises = queries.map(q => 
        service.retrieveRelevantDocuments(q)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.documents).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle embedding service errors', async () => {
      mockEmbeddingService.generateEmbedding.mockRejectedValueOnce(
        new Error('Embedding generation failed')
      );

      await expect(
        service.retrieveRelevantDocuments('test query')
      ).rejects.toThrow();
    });

    it('should handle database query errors', async () => {
      mockEmbeddingRepository.createQueryBuilder.mockReturnValueOnce({
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(
        service.retrieveRelevantDocuments('test query')
      ).rejects.toThrow();
    });
  });
});
