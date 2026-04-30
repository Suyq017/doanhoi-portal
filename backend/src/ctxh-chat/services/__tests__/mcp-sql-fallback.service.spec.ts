import { Document } from '@langchain/core/documents';
import { McpSqlFallbackService } from '../mcp-sql-fallback.service';

jest.mock(
  '@modelcontextprotocol/sdk/client/index.js',
  () => ({
    Client: class {
      connect = jest.fn();
      close = jest.fn();
      listTools = jest.fn().mockResolvedValue({ tools: [] });
      callTool = jest.fn();
    },
  }),
  { virtual: true },
);

jest.mock(
  '@modelcontextprotocol/sdk/client/sse.js',
  () => ({
    SSEClientTransport: class {
      constructor(_: URL) {}
    },
  }),
  { virtual: true },
);

describe('McpSqlFallbackService', () => {
  const mcpClient = { isConnected: jest.fn() } as any;
  const dataSource = { query: jest.fn() } as any;
  let service: McpSqlFallbackService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new McpSqlFallbackService(mcpClient, dataSource);
  });

  it('fallbackSearch returns empty when disconnected or empty rows', async () => {
    mcpClient.isConnected.mockReturnValue(false);
    expect(await service.fallbackSearch()).toEqual([]);

    mcpClient.isConnected.mockReturnValue(true);
    dataSource.query.mockResolvedValue([]);
    expect(await service.fallbackSearch('all', 5, '2026-04-30')).toEqual([]);
  });

  it('fallbackSearch maps SQL rows into Documents and catches errors', async () => {
    mcpClient.isConnected.mockReturnValue(true);
    dataSource.query.mockResolvedValue([
      {
        activity_id: 'a1',
        activity_name: 'Hiến máu',
        description: 'Mô tả',
        organization_name: 'Đoàn trường',
        category_name: 'Tình nguyện',
        location: 'BK',
        status: 'ACTIVE',
        start_date: '2026-04-20',
        end_date: '2026-04-21',
        total_days: 2,
        requires_approval: true,
        max_participants: 100,
      },
    ]);

    const docs = await service.fallbackSearch('upcoming', 10, '2026-04-19', {
      organizationKeywords: ["Khoa O'Brien"],
    } as any);

    expect(docs).toHaveLength(1);
    expect(docs[0]).toBeInstanceOf(Document);
    expect(docs[0].metadata.source).toBe('mcp_sql_fallback');

    dataSource.query.mockRejectedValue(new Error('sql failed'));
    expect(await service.fallbackSearch()).toEqual([]);
  });

  it('listActivities returns empty payload, mapped payload, and error payload', async () => {
    dataSource.query.mockResolvedValueOnce([]);
    const empty = JSON.parse(await service.listActivities('all'));
    expect(empty.found).toBe(0);

    dataSource.query.mockResolvedValueOnce([
      {
        activity_id: 'a1',
        activity_name: 'Name',
        status: 'ACTIVE',
        start_date: '2026-04-20',
        end_date: '2026-04-21',
        location: null,
        total_days: 1,
        requires_approval: false,
        max_participants: null,
        approved_count: 2,
        pending_count: 1,
        total_registered: 3,
        organization_name: 'Org',
        category_name: 'Cat',
      },
    ]);
    const mapped = JSON.parse(await service.listActivities('ongoing', 'Khoa', 3));
    expect(mapped.found).toBe(1);
    expect(mapped.activities[0].approved_count).toBe(2);

    dataSource.query.mockRejectedValueOnce(new Error('x'));
    expect(JSON.parse(await service.listActivities()).error).toBe('x');
  });

  it('filteredSearch handles null whereClause, row mapping, and errors', async () => {
    const noFilters = await service.filteredSearch({} as any);
    expect(noFilters).toEqual([]);

    dataSource.query.mockResolvedValueOnce([
      {
        activity_id: 'a1',
        activity_name: 'Name',
        description: '',
        organization_name: 'Org',
        category_name: 'Cat',
        location: 'BK',
        status: 'ACTIVE',
        start_date: '2026-04-20',
        end_date: '2026-04-21',
        total_days: 1,
        requires_approval: false,
        max_participants: null,
      },
    ]);
    const docs = await service.filteredSearch(
      {
        status: ['ongoing', 'upcoming', 'ended'],
        dateRange: { startDate: '2026-04-01', endDate: '2026-04-30' },
        organizationKeywords: ["Khoa O'Brien"],
        locationRaw: ['BK'],
      } as any,
      5,
      '2026-04-20',
    );
    expect(docs).toHaveLength(1);

    dataSource.query.mockRejectedValueOnce(new Error('filter fail'));
    const err = await service.filteredSearch({ status: ['ongoing'] } as any);
    expect(err).toEqual([]);
  });

  it('queryEmbeddingActivityIds and queryEnrolledActivityIds cover edge paths', async () => {
    expect(await service.queryEmbeddingActivityIds({} as any)).toBeNull();

    dataSource.query.mockResolvedValueOnce([]);
    expect(await service.queryEmbeddingActivityIds({ status: ['ongoing'] } as any, '2026-04-20')).toEqual([]);

    dataSource.query.mockResolvedValueOnce([{ activity_id: 1 }, { activity_id: '2' }]);
    expect(await service.queryEmbeddingActivityIds({ status: ['upcoming'] } as any, '2026-04-20')).toEqual([
      '1',
      '2',
    ]);

    dataSource.query.mockRejectedValueOnce(new Error('embed fail'));
    expect(await service.queryEmbeddingActivityIds({ status: ['ended'] } as any, '2026-04-20')).toBeNull();

    expect(await service.queryEnrolledActivityIds('')).toEqual(new Set());

    dataSource.query.mockResolvedValueOnce([{ activity_id: 'a1' }, { activity_id: 2 }]);
    const set1 = await service.queryEnrolledActivityIds('u1');
    expect(Array.from(set1)).toEqual(['a1', '2']);

    dataSource.query.mockRejectedValueOnce(new Error('enroll fail'));
    expect(await service.queryEnrolledActivityIds('u2')).toEqual(new Set());
  });

  it('covers private branch builders', () => {
    expect((service as any).buildStatusWhereClause('upcoming', '2026-04-20')).toContain('start_date >');
    expect((service as any).buildStatusWhereClause('ongoing', '2026-04-20')).toContain('start_date <=');
    expect((service as any).buildStatusWhereClause('all', '2026-04-20')).toContain('end_date >=');

    const filterClause = (service as any).buildFilteredWhereClause(
      {
        status: ['ongoing', 'upcoming', 'ended'],
        dateRange: { startDate: '2026-04-01' },
        organizationKeywords: ["Khoa O'Brien"],
        locationRaw: ['BK'],
      },
      '2026-04-20',
    );
    expect(filterClause).toContain('org.name ILIKE');

    const embedClause = (service as any).buildEmbeddingMetadataWhereClause(
      {
        status: ['ongoing', 'upcoming', 'ended'],
        dateRange: { endDate: '2026-04-30' },
        organizationKeywords: ['Đoàn'],
        locationRaw: ['BK'],
      },
      '2026-04-20',
    );
    expect(embedClause).toContain("metadata->>'status' != 'DRAFT'");
  });
});
