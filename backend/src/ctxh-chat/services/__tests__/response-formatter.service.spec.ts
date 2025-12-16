import { Test, TestingModule } from '@nestjs/testing';
import { ResponseFormatterService } from '../response-formatter.service';
import { AgentResponse, ProcessedDocument } from '../../interfaces';
import { ActivityStatus } from '@/entities/ctxh-activity.entity';

describe('ResponseFormatterService', () => {
  let service: ResponseFormatterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseFormatterService],
    }).compile();

    service = module.get<ResponseFormatterService>(ResponseFormatterService);
  });

  describe('formatResponse', () => {
    const mockDocument: ProcessedDocument = {
      content: 'Hoạt động trồng cây xanh tại công viên',
      metadata: {
        activityId: 'activity-1',
        activityName: 'Trồng cây xanh',
        organizationId: 'org-1',
        organizationName: 'Đoàn trường',
        categoryId: 'cat-1',
        categoryName: 'Môi trường',
        location: 'Công viên Gia Định',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-16'),
        totalDays: 2,
        status: ActivityStatus.ACTIVE,
      },
      similarityScore: 0.85,
      source: 'ctxh_activity:activity-1',
    };

    const mockAgentResponse: AgentResponse = {
      content: 'Có hoạt động Trồng cây xanh vào ngày 15/01/2025 tại Công viên Gia Định.',
      sources: [mockDocument],
      retrievalTime: 45,
    };

    it('should format response with markdown enhancements', async () => {
      const result = await service.formatResponse(mockAgentResponse, {
        enableMarkdown: true,
      });

      expect(result.content).toBeDefined();
      // Should enhance dates, locations, etc.
    });

    it('should include source information with links', async () => {
      const result = await service.formatResponse(mockAgentResponse, {
        includeSourceLinks: true,
      });

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].activityId).toBe('activity-1');
      expect(result.sources[0].link).toBe('/activities/activity-1');
      expect(result.sources[0].similarityScore).toBe(0.85);
    });

    it('should generate follow-up suggestions', async () => {
      const result = await service.formatResponse(mockAgentResponse, {
        addFollowUpSuggestions: true,
      });

      expect(result.followUpSuggestions).toBeDefined();
      expect(result.followUpSuggestions.length).toBeGreaterThan(0);
      expect(result.followUpSuggestions.length).toBeLessThanOrEqual(3);
    });

    it('should calculate confidence score from similarity', async () => {
      const result = await service.formatResponse(mockAgentResponse);

      expect(result.metadata.confidence).toBe(85); // 0.85 * 100
    });

    it('should determine response type correctly', async () => {
      const result = await service.formatResponse(mockAgentResponse);

      expect(result.metadata.responseType).toBe('single_activity');
    });
  });

  describe('enhanceMarkdownFormatting', () => {
    it('should highlight CTXH days with bold', async () => {
      const response: AgentResponse = {
        content: 'Hoạt động này tính 2 ngày CTXH',
        sources: [],
        retrievalTime: 0,
      };

      const result = await service.formatResponse(response, {
        enableMarkdown: true,
      });

      expect(result.content).toContain('**2 ngày CTXH**');
    });

    it('should add emoji for location', async () => {
      const response: AgentResponse = {
        content: 'Địa điểm: Công viên Gia Định',
        sources: [],
        retrievalTime: 0,
      };

      const result = await service.formatResponse(response, {
        enableMarkdown: true,
      });

      expect(result.content).toContain('📍');
    });

    it('should add emoji for time', async () => {
      const response: AgentResponse = {
        content: 'Thời gian: 15/01/2025',
        sources: [],
        retrievalTime: 0,
      };

      const result = await service.formatResponse(response, {
        enableMarkdown: true,
      });

      expect(result.content).toContain('⏰');
    });

    it('should add emoji for organization', async () => {
      const response: AgentResponse = {
        content: 'Tổ chức: Đoàn trường',
        sources: [],
        retrievalTime: 0,
      };

      const result = await service.formatResponse(response, {
        enableMarkdown: true,
      });

      expect(result.content).toContain('🏢');
    });
  });

  describe('generateFollowUpSuggestions', () => {
    it('should suggest activity registration for single activity', async () => {
      const response: AgentResponse = {
        content: 'Test response',
        sources: [{
          content: 'Activity content',
          metadata: {
            activityId: 'activity-1',
            activityName: 'Trồng cây xanh',
            organizationId: 'org-1',
            organizationName: 'Đoàn trường',
            categoryId: 'cat-1',
            categoryName: 'Môi trường',
            location: 'Test',
            startDate: new Date(),
            endDate: new Date(),
            totalDays: 2,
            status: ActivityStatus.ACTIVE,
          },
          similarityScore: 0.8,
          source: 'test',
        }],
        retrievalTime: 0,
      };

      const result = await service.formatResponse(response, {
        addFollowUpSuggestions: true,
      });

      const suggestions = result.followUpSuggestions.join(' ');
      expect(suggestions).toContain('đăng ký');
      expect(suggestions).toContain('Trồng cây xanh');
    });

    it('should suggest related activities from same organization', async () => {
      const response: AgentResponse = {
        content: 'Test',
        sources: [{
          content: 'Activity',
          metadata: {
            activityId: 'activity-1',
            activityName: 'Test Activity',
            organizationId: 'org-1',
            organizationName: 'Đoàn trường',
            categoryId: 'cat-1',
            categoryName: 'Test',
            location: 'Test',
            startDate: new Date(),
            endDate: new Date(),
            totalDays: 1,
            status: ActivityStatus.ACTIVE,
          },
          similarityScore: 0.8,
          source: 'test',
        }],
        retrievalTime: 0,
      };

      const result = await service.formatResponse(response, {
        addFollowUpSuggestions: true,
      });

      const suggestions = result.followUpSuggestions.join(' ');
      expect(suggestions).toContain('Đoàn trường');
    });

    it('should limit to 3 suggestions', async () => {
      const response: AgentResponse = {
        content: 'Test',
        sources: Array(5).fill({
          content: 'Test',
          metadata: {
            activityId: 'activity-1',
            activityName: 'Test',
            organizationId: 'org-1',
            organizationName: 'Test',
            categoryId: 'cat-1',
            categoryName: 'Test',
            location: 'Test',
            startDate: new Date(),
            endDate: new Date(),
            totalDays: 1,
            status: ActivityStatus.ACTIVE,
          },
          similarityScore: 0.8,
          source: 'test',
        }),
        retrievalTime: 0,
      };

      const result = await service.formatResponse(response, {
        addFollowUpSuggestions: true,
      });

      expect(result.followUpSuggestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('determineResponseType', () => {
    it('should identify no_results response', async () => {
      const response: AgentResponse = {
        content: 'Xin lỗi, tôi không tìm thấy thông tin về hoạt động này.',
        sources: [],
        retrievalTime: 0,
      };

      const result = await service.formatResponse(response);

      expect(result.metadata.responseType).toBe('no_results');
    });

    it('should identify single_activity response', async () => {
      const response: AgentResponse = {
        content: 'Có hoạt động...',
        sources: [{
          content: 'Test',
          metadata: {
            activityId: '1',
            activityName: 'Test',
            organizationId: 'org-1',
            organizationName: 'Test',
            categoryId: 'cat-1',
            categoryName: 'Test',
            location: 'Test',
            startDate: new Date(),
            endDate: new Date(),
            totalDays: 1,
            status: ActivityStatus.ACTIVE,
          },
          similarityScore: 0.8,
          source: 'test',
        }],
        retrievalTime: 0,
      };

      const result = await service.formatResponse(response);

      expect(result.metadata.responseType).toBe('single_activity');
    });

    it('should identify multiple_activities response', async () => {
      const response: AgentResponse = {
        content: 'Có nhiều hoạt động...',
        sources: Array(3).fill({
          content: 'Test',
          metadata: {
            activityId: '1',
            activityName: 'Test',
            organizationId: 'org-1',
            organizationName: 'Test',
            categoryId: 'cat-1',
            categoryName: 'Test',
            location: 'Test',
            startDate: new Date(),
            endDate: new Date(),
            totalDays: 1,
            status: ActivityStatus.ACTIVE,
          },
          similarityScore: 0.8,
          source: 'test',
        }),
        retrievalTime: 0,
      };

      const result = await service.formatResponse(response);

      expect(result.metadata.responseType).toBe('multiple_activities');
    });
  });

  describe('generateFallbackResponse', () => {
    it('should provide helpful fallback when no results', () => {
      const result = service.generateFallbackResponse('hoạt động không tồn tại');

      expect(result.content).toContain('Xin lỗi');
      expect(result.content).toContain('hoạt động không tồn tại');
      expect(result.sources).toHaveLength(0);
      expect(result.followUpSuggestions.length).toBeGreaterThan(0);
      expect(result.metadata.responseType).toBe('fallback');
      expect(result.metadata.confidence).toBe(0);
    });

    it('should include general helpful suggestions in fallback', () => {
      const result = service.generateFallbackResponse('test');

      const suggestions = result.followUpSuggestions.join(' ');
      expect(suggestions).toContain('CTXH');
    });
  });
});
