import { LangChainIngestionService } from '../langchain-ingestion.service';

describe('LangChainIngestionService', () => {
  let svc: LangChainIngestionService;
  const configService: any = { get: jest.fn().mockReturnValue(50) };
  const vectorStoreService: any = { addDocuments: jest.fn(), isInitialized: jest.fn().mockReturnValue(true) };
  const activityRepository: any = { find: jest.fn(), findOne: jest.fn(), count: jest.fn() };
  const embeddingRepository: any = { clear: jest.fn(), delete: jest.fn(), count: jest.fn(), findOne: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new LangChainIngestionService(
      configService,
      vectorStoreService,
      activityRepository,
      embeddingRepository,
    );
  });

  it('runFullIngestion returns early when no activities', async () => {
    activityRepository.find.mockResolvedValue([]);
    const res = await svc.runFullIngestion();
    expect(res.totalActivities).toBe(0);
    expect(res.processedActivities).toBe(0);
  });

  it('runFullIngestion processes activities and calls vector store', async () => {
    const act = { id: 'a1', name: 'A1', organization: { name: 'Org' }, category: { name: 'Cat' }, start_date: new Date(), end_date: new Date(), total_days: 1, location: 'X', status: 'ACTIVE', description: 'd' };
    activityRepository.find.mockResolvedValue([act]);
    embeddingRepository.clear.mockResolvedValue(undefined);
    vectorStoreService.addDocuments.mockResolvedValue(undefined);

    const res = await svc.runFullIngestion();
    expect(embeddingRepository.clear).toHaveBeenCalled();
    expect(vectorStoreService.addDocuments).toHaveBeenCalled();
    expect(res.processedActivities).toBe(1);
    expect(res.totalEmbeddings).toBeGreaterThan(0);
  });

  it('runFullIngestion collects errors when batch add fails', async () => {
    const act = { id: 'a2', name: 'A2', organization: {}, category: {}, start_date: new Date(), end_date: new Date(), total_days: 1 };
    activityRepository.find.mockResolvedValue([act]);
    embeddingRepository.clear.mockResolvedValue(undefined);
    vectorStoreService.addDocuments.mockRejectedValue(new Error('VS fail'));

    const res = await svc.runFullIngestion();
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('processActivity throws when activity not found and succeeds when found', async () => {
    activityRepository.findOne.mockResolvedValue(null);
    await expect(svc.processActivity('missing')).rejects.toThrow(/not found/);

    const act = { id: 'a3', name: 'A3', organization: {}, category: {}, start_date: new Date(), end_date: new Date(), total_days: 2 };
    activityRepository.findOne.mockResolvedValue(act);
    embeddingRepository.delete.mockResolvedValue(undefined);
    vectorStoreService.addDocuments.mockResolvedValue(undefined);

    await expect(svc.processActivity('a3')).resolves.toBeUndefined();
    expect(embeddingRepository.delete).toHaveBeenCalledWith({ activityId: 'a3' });
    expect(vectorStoreService.addDocuments).toHaveBeenCalled();
  });

  it('deleteActivity calls embeddingRepository.delete', async () => {
    embeddingRepository.delete.mockResolvedValue(undefined);
    await svc.deleteActivity('a4');
    expect(embeddingRepository.delete).toHaveBeenCalledWith({ activityId: 'a4' });
  });

  it('getIngestionStats returns counts and lastUpdated', async () => {
    embeddingRepository.count.mockResolvedValue(10);
    activityRepository.count.mockResolvedValue(5);
    embeddingRepository.findOne.mockResolvedValue({ createdAt: new Date('2020-01-01') });

    const s = await svc.getIngestionStats();
    expect(s.totalEmbeddings).toBe(10);
    expect(s.totalActivities).toBe(5);
    expect(s.lastUpdated).toBeInstanceOf(Date);
  });

  it('healthCheck reports healthy when vector store and DB ok', async () => {
    vectorStoreService.isInitialized.mockReturnValue(true);
    embeddingRepository.count.mockResolvedValue(2);
    const res = await svc.healthCheck();
    expect(res.status).toBe('healthy');
    expect(res.vectorStore).toBe(true);
    expect(res.database).toBe(true);
  });

  it('healthCheck reports unhealthy when vector store not initialized', async () => {
    vectorStoreService.isInitialized.mockImplementation(() => { throw new Error('nope'); });
    embeddingRepository.count.mockRejectedValue(new Error('db error'));
    const res = await svc.healthCheck();
    expect(res.status).toBe('unhealthy');
    expect(res.vectorStore).toBe(false);
    expect(res.database).toBe(false);
  });
});

export {};
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LangChainIngestionService, IngestionResult } from '../langchain-ingestion.service';
import { LangChainVectorStoreService } from '../langchain-vector-store.service';
import { CtxhActivity } from '../../../entities/ctxh-activity.entity';
import { CtxhEmbedding } from '../../../entities/ctxh-embedding.entity';
import { createMockConfigService } from './mocks/config.service.mock';
import { createMockVectorStoreService } from './mocks/vector-store.mock';
import {
  createMockActivityRepository,
  createMockEmbeddingRepository,
  createMockCtxhActivity,
  createMockActivities,
} from './mocks/repository.mock';

describe('LangChainIngestionService', () => {
  let service: LangChainIngestionService;
  let vectorStoreService: ReturnType<typeof createMockVectorStoreService>;
  let mockConfigService: ReturnType<typeof createMockConfigService>;
  let mockActivityRepo: ReturnType<typeof createMockActivityRepository>;
  let mockEmbeddingRepo: ReturnType<typeof createMockEmbeddingRepository>;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    vectorStoreService = createMockVectorStoreService();
    mockConfigService = createMockConfigService();
    mockActivityRepo = createMockActivityRepository();
    mockEmbeddingRepo = createMockEmbeddingRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LangChainIngestionService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LangChainVectorStoreService,
          useValue: vectorStoreService,
        },
        {
          provide: getRepositoryToken(CtxhActivity),
          useValue: mockActivityRepo,
        },
        {
          provide: getRepositoryToken(CtxhEmbedding),
          useValue: mockEmbeddingRepo,
        },
      ],
    }).compile();

    service = module.get<LangChainIngestionService>(LangChainIngestionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runFullIngestion', () => {
    it('should run full ingestion pipeline', async () => {
      const activities = [
        createMockCtxhActivity({ id: 'activity-1' }),
        createMockCtxhActivity({ id: 'activity-2' }),
      ];
      mockActivityRepo.find.mockResolvedValue(activities);

      const result = await service.runFullIngestion();

      expect(result).toBeDefined();
      expect(result.totalActivities).toBe(2);
      expect(result.processedActivities).toBe(2);
      expect(result.errors).toEqual([]);
      expect(mockActivityRepo.find).toHaveBeenCalled();
      expect(mockEmbeddingRepo.clear).toHaveBeenCalled();
      expect(vectorStoreService.addDocuments).toHaveBeenCalled();
    });

    it('should handle empty activities list', async () => {
      mockActivityRepo.find.mockResolvedValue([]);

      const result = await service.runFullIngestion();

      expect(result).toBeDefined();
      expect(result.totalActivities).toBe(0);
      expect(result.processedActivities).toBe(0);
      expect(vectorStoreService.addDocuments).not.toHaveBeenCalled();
    });

    it('should return correct timing information', async () => {
      mockActivityRepo.find.mockResolvedValue([createMockCtxhActivity()]);

      const result = await service.runFullIngestion();

      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should process activities in batches', async () => {
      // Create 60 activities to test batching with batch size of 50
      const activities = createMockActivities(60);
      mockActivityRepo.find.mockResolvedValue(activities);

      const result = await service.runFullIngestion();

      expect(result.processedActivities).toBe(60);
      // Should be called twice for 60 activities with batch size 50
      expect(vectorStoreService.addDocuments).toHaveBeenCalledTimes(2);
    });

    it('should continue processing when a batch fails', async () => {
      const activities = createMockActivities(10);
      mockActivityRepo.find.mockResolvedValue(activities);
      
      // Fail on first call, succeed on second
      vectorStoreService.addDocuments
        .mockRejectedValueOnce(new Error('Batch error'))
        .mockResolvedValue(undefined);

      const result = await service.runFullIngestion();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Batch error');
    });

    it('should handle repository errors', async () => {
      mockActivityRepo.find.mockRejectedValue(new Error('Database error'));

      const result = await service.runFullIngestion();

      expect(result.errors).toContain('Database error');
      expect(result.processedActivities).toBe(0);
    });
  });

  describe('runIncrementalUpdate', () => {
    it('should run incremental update for recent activities', async () => {
      const sinceDate = new Date('2024-01-01');
      const activities = [
        createMockCtxhActivity({ id: 'activity-1', updated_at: new Date('2024-01-15') }),
      ];
      mockActivityRepo.find.mockResolvedValue(activities);

      const result = await service.runIncrementalUpdate(sinceDate);

      expect(result).toBeDefined();
      expect(result.totalActivities).toBe(1);
      expect(result.processedActivities).toBe(1);
    });

    it('should handle no activities to update', async () => {
      mockActivityRepo.find.mockResolvedValue([]);

      const result = await service.runIncrementalUpdate(new Date());

      expect(result.totalActivities).toBe(0);
      expect(result.processedActivities).toBe(0);
    });

    it('should record errors for failed activity processing', async () => {
      const activities = [createMockCtxhActivity({ id: 'activity-1' })];
      mockActivityRepo.find.mockResolvedValue(activities);
      mockActivityRepo.findOne.mockResolvedValue(null); // Simulate activity not found

      const result = await service.runIncrementalUpdate(new Date());

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('processActivity', () => {
    it('should process single activity', async () => {
      const activityId = 'test-activity-id';
      mockActivityRepo.findOne.mockResolvedValue(createMockCtxhActivity({ id: activityId }));

      await service.processActivity(activityId);

      expect(mockActivityRepo.findOne).toHaveBeenCalled();
      expect(mockEmbeddingRepo.delete).toHaveBeenCalledWith({ activityId });
      expect(vectorStoreService.addDocuments).toHaveBeenCalled();
    });

    it('should throw error for non-existent activity', async () => {
      mockActivityRepo.findOne.mockResolvedValue(null);

      await expect(service.processActivity('non-existent')).rejects.toThrow(
        'Activity non-existent not found'
      );
    });

    it('should delete existing embeddings before adding new ones', async () => {
      const activityId = 'activity-with-embeddings';
      mockActivityRepo.findOne.mockResolvedValue(createMockCtxhActivity({ id: activityId }));

      await service.processActivity(activityId);

      expect(mockEmbeddingRepo.delete).toHaveBeenCalledWith({ activityId });
      expect(vectorStoreService.addDocuments).toHaveBeenCalled();
    });
  });

  describe('deleteActivity', () => {
    it('should delete embeddings for activity', async () => {
      const activityId = 'activity-to-delete';

      await service.deleteActivity(activityId);

      expect(mockEmbeddingRepo.delete).toHaveBeenCalledWith({ activityId });
    });
  });

  describe('getIngestionStats', () => {
    it('should return ingestion statistics', async () => {
      mockEmbeddingRepo.count.mockResolvedValue(100);
      mockActivityRepo.count.mockResolvedValue(10);
      mockEmbeddingRepo.findOne.mockResolvedValue({
        createdAt: new Date('2024-01-01'),
      });

      const stats = await service.getIngestionStats();

      expect(stats.totalEmbeddings).toBe(100);
      expect(stats.totalActivities).toBe(10);
      expect(stats.lastUpdated).toEqual(new Date('2024-01-01'));
    });

    it('should return null for lastUpdated when no embeddings', async () => {
      mockEmbeddingRepo.count.mockResolvedValue(0);
      mockActivityRepo.count.mockResolvedValue(0);
      mockEmbeddingRepo.findOne.mockResolvedValue(null);

      const stats = await service.getIngestionStats();

      expect(stats.lastUpdated).toBeNull();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all systems are ok', async () => {
      vectorStoreService.isInitialized.mockReturnValue(true);
      mockEmbeddingRepo.count.mockResolvedValue(100);

      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.vectorStore).toBe(true);
      expect(health.database).toBe(true);
    });

    it('should return unhealthy when vector store not initialized', async () => {
      vectorStoreService.isInitialized.mockReturnValue(false);
      mockEmbeddingRepo.count.mockResolvedValue(100);

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.vectorStore).toBe(false);
      expect(health.database).toBe(true);
    });

    it('should return unhealthy when database is not accessible', async () => {
      vectorStoreService.isInitialized.mockReturnValue(true);
      mockEmbeddingRepo.count.mockRejectedValue(new Error('Database connection failed'));

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.vectorStore).toBe(true);
      expect(health.database).toBe(false);
      expect(health.details.database).toContain('error');
    });

    it('should return details about each component', async () => {
      vectorStoreService.isInitialized.mockReturnValue(true);
      mockEmbeddingRepo.count.mockResolvedValue(100);

      const health = await service.healthCheck();

      expect(health.details).toBeDefined();
      expect(health.details.vectorStore).toBe('connected');
      expect(health.details.database).toBe('connected');
    });
  });

  describe('document preparation', () => {
    it('should format activity content correctly', async () => {
      const activity = createMockCtxhActivity({
        name: 'Test Activity Name',
        description: 'Test Description',
        location: 'Test Location',
        total_days: 5,
        status: 'ACTIVE',
        organization: { name: 'Test Org' },
      });
      mockActivityRepo.find.mockResolvedValue([activity]);

      await service.runFullIngestion();

      expect(vectorStoreService.addDocuments).toHaveBeenCalled();
      const calledDocuments = vectorStoreService.addDocuments.mock.calls[0][0];
      expect(calledDocuments.length).toBe(1);
      
      const doc = calledDocuments[0];
      expect(doc.pageContent).toContain('Test Activity Name');
      expect(doc.pageContent).toContain('Test Description');
      expect(doc.pageContent).toContain('Test Location');
      expect(doc.metadata.activityId).toBe(activity.id);
    });

    it('should handle missing optional fields', async () => {
      const activity = createMockCtxhActivity({
        description: null,
        location: null,
        total_days: null,
        organization: null,
      });
      mockActivityRepo.find.mockResolvedValue([activity]);

      await service.runFullIngestion();

      expect(vectorStoreService.addDocuments).toHaveBeenCalled();
      const calledDocuments = vectorStoreService.addDocuments.mock.calls[0][0];
      const doc = calledDocuments[0];
      
      expect(doc.pageContent).toContain('N/A');
    });
  });
});
