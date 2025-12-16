import { Injectable, Logger } from '@nestjs/common';
import {
  AgentResponse,
  FormattedResponse,
  FormattingOptions,
  SourceInfo,
  ProcessedDocument,
  ResponseType,
} from '../interfaces';

@Injectable()
export class ResponseFormatterService {
  private readonly logger = new Logger(ResponseFormatterService.name);

  /**
   * Format agent response with enhancements
   */
  async formatResponse(
    agentResponse: AgentResponse,
    options: FormattingOptions = {}
  ): Promise<FormattedResponse> {
    
    const {
      includeSourceLinks = true,
      enableMarkdown = true,
      addFollowUpSuggestions = true,
    } = options;

    let formattedContent = agentResponse.content;

    // Format markdown if enabled
    if (enableMarkdown) {
      formattedContent = this.enhanceMarkdownFormatting(formattedContent);
    }

    // Build sources information
    const sources = await this.buildSourcesInfo(
      agentResponse.sources,
      includeSourceLinks
    );

    // Generate follow-up suggestions
    const followUpSuggestions = addFollowUpSuggestions
      ? await this.generateFollowUpSuggestions(agentResponse)
      : [];

    return {
      content: formattedContent,
      sources,
      followUpSuggestions,
      metadata: {
        responseType: this.determineResponseType(agentResponse),
        confidence: this.calculateConfidenceScore(agentResponse),
        processingTime: agentResponse.retrievalTime,
      }
    };
  }

  /**
   * Enhance markdown formatting with Vietnamese-specific improvements
   */
  private enhanceMarkdownFormatting(content: string): string {
    return content
      // Highlight important information
      .replace(/(\d+\s+ngày\s+CTXH)/gi, '**$1**')
      .replace(/(Địa điểm:\s*[^\n]+)/gi, '📍 **$1**')  
      .replace(/(Thời gian:\s*[^\n]+)/gi, '⏰ **$1**')
      .replace(/(Tổ chức:\s*[^\n]+)/gi, '🏢 **$1**')
      // Format dates nicely
      .replace(/(\d{2}\/\d{2}\/\d{4})/g, '`$1`')
      // Add spacing for better readability
      .replace(/\n\n\n+/g, '\n\n');
  }

  /**
   * Build source information from documents
   */
  private async buildSourcesInfo(
    documents: ProcessedDocument[],
    includeLinks: boolean
  ): Promise<SourceInfo[]> {
    return documents.map(doc => ({
      activityId: doc.metadata.activityId,
      activityName: doc.metadata.activityName,
      organizationName: doc.metadata.organizationName,
      categoryName: doc.metadata.categoryName,
      similarityScore: Math.round(doc.similarityScore * 100) / 100,
      link: includeLinks 
        ? `/activities/${doc.metadata.activityId}` 
        : undefined,
    }));
  }

  /**
   * Generate contextual follow-up suggestions
   */
  private async generateFollowUpSuggestions(
    agentResponse: AgentResponse
  ): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Analyze response content for relevant follow-ups
    const sources = agentResponse.sources;
    
    if (sources.length > 0) {
      const mainActivity = sources[0];
      
      suggestions.push(
        `Làm thế nào để đăng ký tham gia hoạt động "${mainActivity.metadata.activityName}"?`,
        `Có những hoạt động CTXH nào khác của ${mainActivity.metadata.organizationName}?`,
      );
      
      // Category-based suggestion
      const category = mainActivity.metadata.categoryName;
      if (category) {
        suggestions.push(`Tìm thêm hoạt động CTXH thuộc danh mục "${category}"`);
      }
    }
    
    // Add general helpful suggestions
    suggestions.push(
      'Các hoạt động CTXH nào đang mở đăng ký?',
      'Quy trình tham gia hoạt động CTXH như thế nào?'
    );

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Determine response type based on content
   */
  private determineResponseType(response: AgentResponse): ResponseType {
    const content = response.content.toLowerCase();
    
    if (content.includes('không tìm thấy') || 
        content.includes('không có thông tin') ||
        response.sources.length === 0) {
      return 'no_results';
    }
    
    if (response.sources.length === 1) {
      return 'single_activity';
    }
    
    if (response.sources.length > 1) {
      return 'multiple_activities';
    }
    
    return 'general_info';
  }

  /**
   * Calculate confidence score based on source similarity
   */
  private calculateConfidenceScore(response: AgentResponse): number {
    if (response.sources.length === 0) return 0;
    
    const avgSimilarity = response.sources.reduce(
      (sum, doc) => sum + doc.similarityScore, 
      0
    ) / response.sources.length;
    
    // Normalize to 0-100 scale
    return Math.round(avgSimilarity * 100);
  }

  /**
   * Generate fallback response when no results found
   */
  generateFallbackResponse(query: string): FormattedResponse {
    const fallbackSuggestions = [
      'Các hoạt động CTXH nào đang được tổ chức?',
      'Tôi cần bao nhiêu ngày CTXH để tốt nghiệp?',
      'Làm thế nào để tìm hoạt động CTXH phù hợp?',
      'Quy trình đăng ký tham gia CTXH ra sao?',
    ];

    return {
      content: `
Xin lỗi, tôi không tìm thấy thông tin cụ thể về "${query}". 

Có thể bạn quan tâm đến các câu hỏi sau:
${fallbackSuggestions.map(q => `• ${q}`).join('\n')}

Hoặc bạn có thể liên hệ trực tiếp với phòng Công tác Sinh viên để được hỗ trợ tốt nhất.
      `,
      sources: [],
      followUpSuggestions: fallbackSuggestions,
      metadata: {
        responseType: 'fallback',
        confidence: 0,
        processingTime: 0,
      }
    };
  }
}
