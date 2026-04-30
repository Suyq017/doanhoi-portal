import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { Document } from '@langchain/core/documents';

// Virtual mocks for MCP SDK
jest.mock(
  '@modelcontextprotocol/sdk/client/index.js',
  () => ({
    Client: jest.fn(),
  }),
  { virtual: true },
);

jest.mock(
  '@modelcontextprotocol/sdk/client/sse.js',
  () => ({
    SSEClientTransport: jest.fn(),
  }),
  { virtual: true },
);

jest.mock('@langchain/core/tools', () => ({
  DynamicTool: jest.fn(),
}));

import { McpMetadataEnricherService } from '../mcp-metadata-enricher.service';
import { PostgresMcpClientService } from '../postgres-mcp-client.service';

describe('McpMetadataEnricherService', () => {
  let service: McpMetadataEnricherService;
  let mockDataSource: DataSource;
  let mockMcpClient: PostgresMcpClientService;

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    } as any;

    mockMcpClient = {} as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpMetadataEnricherService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: PostgresMcpClientService, useValue: mockMcpClient },
      ],
    }).compile();

    service = module.get<McpMetadataEnricherService>(McpMetadataEnricherService);
  });

  describe('enrichDocuments', () => {
    it('should return empty array when input is empty', async () => {
      const result = await service.enrichDocuments([]);
      expect(result).toEqual([]);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should return docs unenriched when no activityIds found', async () => {
      const docs = [
        new Document({ pageContent: 'test', metadata: {} }),
      ];

      const result = await service.enrichDocuments(docs);
      expect(result).toEqual(docs);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should enrich documents with metadata from database', async () => {
      const docs = [
        new Document({
          pageContent: 'Activity A',
          metadata: { activityId: 'act-1' },
        }),
        new Document({
          pageContent: 'Activity B',
          metadata: { activityId: 'act-2' },
        }),
      ];

      (mockDataSource.query as jest.Mock).mockResolvedValue([
        {
          id: 'act-1',
          requires_approval: true,
          max_participants: 50,
          category_name: 'Volunteer',
          approved_count: '10',
          pending_count: '5',
          total_registered: '15',
        },
        {
          id: 'act-2',
          requires_approval: false,
          max_participants: 100,
          category_name: 'Social',
          approved_count: '30',
          pending_count: '0',
          total_registered: '30',
        },
      ]);

      const result = await service.enrichDocuments(docs);

      expect(result.length).toBe(2);
      expect(result[0].metadata.requiresApproval).toBe(true);
      expect(result[0].metadata.approvedCount).toBe(10);
      expect(result[0].metadata.pendingCount).toBe(5);
      expect(result[0].metadata.remainingSlots).toBe(40);
      expect(result[0].metadata.categoryName).toBe('Volunteer');

      expect(result[1].metadata.requiresApproval).toBe(false);
      expect(result[1].metadata.maxParticipants).toBe(100);
      expect(result[1].metadata.remainingSlots).toBe(70);
    });

    it('should handle null max_participants (unlimited slots)', async () => {
      const docs = [
        new Document({
          pageContent: 'Unlimited Activity',
          metadata: { activityId: 'act-3' },
        }),
      ];

      (mockDataSource.query as jest.Mock).mockResolvedValue([
        {
          id: 'act-3',
          requires_approval: false,
          max_participants: null,
          category_name: 'Open',
          approved_count: '100',
          pending_count: '10',
          total_registered: '110',
        },
      ]);

      const result = await service.enrichDocuments(docs);

      expect(result[0].metadata.maxParticipants).toBeNull();
      expect(result[0].metadata.remainingSlots).toBeNull();
      expect(result[0].metadata.totalRegistered).toBe(110);
    });

    it('should return unenriched docs when database query fails', async () => {
      const docs = [
        new Document({
          pageContent: 'Activity',
          metadata: { activityId: 'act-1' },
        }),
      ];

      (mockDataSource.query as jest.Mock).mockRejectedValue(
        new Error('Database connection error'),
      );

      const result = await service.enrichDocuments(docs);

      // Should return original docs on error (graceful degradation)
      expect(result).toEqual(docs);
      expect(result[0].metadata.requiresApproval).toBeUndefined();
    });

    it('should skip enrichment for docs without activityId', async () => {
      const docs = [
        new Document({
          pageContent: 'Activity A',
          metadata: { activityId: 'act-1' },
        }),
        new Document({
          pageContent: 'Activity B (no id)',
          metadata: { someOther: 'field' },
        }),
      ];

      (mockDataSource.query as jest.Mock).mockResolvedValue([
        {
          id: 'act-1',
          requires_approval: true,
          max_participants: 50,
          category_name: 'Volunteer',
          approved_count: '10',
          pending_count: '5',
          total_registered: '15',
        },
      ]);

      const result = await service.enrichDocuments(docs);

      expect(result.length).toBe(2);
      // First doc enriched
      expect(result[0].metadata.requiresApproval).toBe(true);
      // Second doc not enriched (no activityId in enrichMap)
      expect(result[1].metadata.requiresApproval).toBeUndefined();
    });

    it('should handle string activityId consistently', async () => {
      const docs = [
        new Document({
          pageContent: 'Activity',
          metadata: { activityId: 'act-1' },
        }),
      ];

      // Return activity with numeric id field (should still match when converted to string)
      (mockDataSource.query as jest.Mock).mockResolvedValue([
        {
          id: 'act-1',
          requires_approval: true,
          max_participants: 100,
          category_name: 'Test',
          approved_count: '0',
          pending_count: '0',
          total_registered: '0',
        },
      ]);

      const result = await service.enrichDocuments(docs);
      expect(result[0].metadata.requiresApproval).toBe(true);
    });

    it('should convert numeric counts to integers', async () => {
      const docs = [
        new Document({
          pageContent: 'Activity',
          metadata: { activityId: 'act-1' },
        }),
      ];

      // Counts may come as strings from database
      (mockDataSource.query as jest.Mock).mockResolvedValue([
        {
          id: 'act-1',
          requires_approval: false,
          max_participants: 50,
          category_name: 'Test',
          approved_count: '12',
          pending_count: '3',
          total_registered: '15',
        },
      ]);

      const result = await service.enrichDocuments(docs);
      expect(typeof result[0].metadata.approvedCount).toBe('number');
      expect(typeof result[0].metadata.pendingCount).toBe('number');
      expect(typeof result[0].metadata.totalRegistered).toBe('number');
      expect(result[0].metadata.approvedCount).toBe(12);
      expect(result[0].metadata.pendingCount).toBe(3);
      expect(result[0].metadata.totalRegistered).toBe(15);
    });

    it('should preserve original pageContent and other metadata fields', async () => {
      const docs = [
        new Document({
          pageContent: 'Original content',
          metadata: {
            activityId: 'act-1',
            source: 'vector-search',
            score: 0.95,
          },
        }),
      ];

      (mockDataSource.query as jest.Mock).mockResolvedValue([
        {
          id: 'act-1',
          requires_approval: true,
          max_participants: 50,
          category_name: 'Test',
          approved_count: '5',
          pending_count: '2',
          total_registered: '7',
        },
      ]);

      const result = await service.enrichDocuments(docs);

      // Original fields preserved
      expect(result[0].pageContent).toBe('Original content');
      expect(result[0].metadata.source).toBe('vector-search');
      expect(result[0].metadata.score).toBe(0.95);
      expect(result[0].metadata.activityId).toBe('act-1');
      // New fields added
      expect(result[0].metadata.requiresApproval).toBe(true);
      expect(result[0].metadata.categoryName).toBe('Test');
    });
  });
});
