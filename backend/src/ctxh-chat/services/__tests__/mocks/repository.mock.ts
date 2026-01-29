import { ActivityStatus } from '../../../../entities/ctxh-activity.entity';

/**
 * Create a mock CtxhActivity entity
 */
export const createMockCtxhActivity = (overrides: Partial<any> = {}) => ({
  id: 'test-activity-id-1',
  name: 'Test Activity',
  description: 'Test Description for CTXH activity',
  location: 'Test Location',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-01-02'),
  total_days: 1,
  status: ActivityStatus.ACTIVE,
  category_id: 'test-category-id',
  organization_id: 'test-org-id',
  organization: {
    id: 'test-org-id',
    name: 'Test Organization',
  },
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

/**
 * Create multiple mock activities
 */
export const createMockActivities = (count: number) => {
  return Array.from({ length: count }, (_, i) =>
    createMockCtxhActivity({
      id: `activity-${i + 1}`,
      name: `Activity ${i + 1}`,
    }),
  );
};

/**
 * Mock CtxhActivity Repository
 */
export const createMockActivityRepository = () => ({
  find: jest.fn().mockResolvedValue([
    createMockCtxhActivity({ id: 'activity-1' }),
    createMockCtxhActivity({ id: 'activity-2', name: 'Activity 2' }),
  ]),
  findOne: jest.fn().mockResolvedValue(createMockCtxhActivity()),
  count: jest.fn().mockResolvedValue(10),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  createQueryBuilder: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([createMockCtxhActivity()]),
    getCount: jest.fn().mockResolvedValue(1),
  }),
});

/**
 * Create a mock CtxhEmbedding entity
 */
export const createMockCtxhEmbedding = (overrides: Partial<any> = {}) => ({
  id: 'test-embedding-id',
  activityId: 'test-activity-id',
  contentText: 'Test content text',
  embedding: new Array(768).fill(0.1),
  chunkIndex: 0,
  metadata: { activityName: 'Test Activity' },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Mock CtxhEmbedding Repository
 */
export const createMockEmbeddingRepository = () => ({
  count: jest.fn().mockResolvedValue(100),
  clear: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  findOne: jest.fn().mockResolvedValue(createMockCtxhEmbedding()),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  createQueryBuilder: jest.fn().mockReturnValue({
    delete: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  }),
});

export const mockActivityRepository = createMockActivityRepository();
export const mockEmbeddingRepository = createMockEmbeddingRepository();
