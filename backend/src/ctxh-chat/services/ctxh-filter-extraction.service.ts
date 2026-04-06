import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainConfig } from '../config/langchain.config';
import { MetadataFilterSchema, MetadataFilters } from '../dto/filter-extraction.dto';
import { FILTER_EXTRACTION_PROMPT } from '../prompts/filter-extraction.prompt';
import { getCategoryListString, getCategoryKeywordMapString, VALID_CATEGORIES } from '../config/category.config';


/**
 * Service that uses an LLM with structured output to extract
 * metadata filters from Vietnamese natural-language questions.
 *
 * This runs as a **pre-retrieval step** — before the vector
 * similarity search — so the embedding search space is narrowed.
 */
@Injectable()
export class CtxhFilterExtractionService implements OnModuleInit {
  private readonly logger = new Logger(CtxhFilterExtractionService.name);

  /** Dedicated LLM instance for filter extraction (can be a faster/cheaper model). */
  private llm: BaseChatModel;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  /**
   * Initialize the LLM used for filter extraction.
   * Re-uses LangChainConfig so we respect USE_LOCAL_MODEL toggle.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.llm = LangChainConfig.getLLM(this.configService);
      this.initialized = true;

      const modelType = LangChainConfig.isUsingLocalModel(this.configService)
        ? 'Ollama'
        : 'Gemini';
      this.logger.log(`✅ Filter extraction service initialized (${modelType})`);
    } catch (error) {
      this.logger.error('Failed to initialize filter extraction service', error);
      throw error;
    }
  }

  /**
   * Extract structured metadata filters from a user question.
   *
   * @param question  Vietnamese free-text question from the student
   * @param currentDate  ISO date string YYYY-MM-DD (defaults to today)
   * @returns Parsed MetadataFilters (empty object if nothing extracted)
   */
  async extractFilters(
    question: string,
    currentDate?: string,
  ): Promise<MetadataFilters> {
    if (!this.initialized) {
      await this.initialize();
    }

    const dateStr =
      currentDate || new Date().toISOString().split('T')[0];

    try {
      // Create a structured-output chain:
      // prompt → LLM.withStructuredOutput(zodSchema)
      const structuredLlm = this.llm.withStructuredOutput(
        MetadataFilterSchema,
        { name: 'extract_metadata_filters' },
      );

      const chain = FILTER_EXTRACTION_PROMPT.pipe(structuredLlm);

      const result = await chain.invoke({
        question,
        current_date: dateStr,
        category_list: getCategoryListString(),
        category_keyword_map: getCategoryKeywordMapString(),
      }) as MetadataFilters;

      // Layer 3 Validation: Ensure all parsed categories match our explicit list
      if (result.category && result.category.length > 0) {
        result.category = result.category.filter(c => VALID_CATEGORIES.includes(c as any));
        if (result.category.length === 0) {
          delete result.category;
        }
      }

      this.logger.debug(
        `Extracted filters for "${question.slice(0, 60)}…": ${JSON.stringify(result)}`,
      );

      return result;

    } catch (error) {
      this.logger.warn(
        `Filter extraction failed, returning empty filters: ${error.message}`,
      );
      // Graceful degradation — return empty filters so the pipeline
      // falls back to un-filtered vector search.
      return {};
    }
  }

  /**
   * Resolve relative date expressions (isToday, isThisWeek, isThisMonth)
   * into concrete startDate / endDate bounds.
   *
   * @param filters  Raw filters from the LLM
   * @param currentDate  Reference date YYYY-MM-DD
   * @returns A copy of filters with dateRange.startDate / endDate filled in
   */
  resolveDateRange(
    filters: MetadataFilters,
    currentDate: string,
  ): MetadataFilters {
    if (!filters.dateRange) return filters;

    const resolved = { ...filters, dateRange: { ...filters.dateRange } };
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);

    if (resolved.dateRange.isToday) {
      resolved.dateRange.startDate = currentDate;
      resolved.dateRange.endDate = currentDate;
    } else if (resolved.dateRange.isThisWeek) {
      // Monday as start of week
      const dayOfWeek = today.getDay(); // 0 = Sun
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      resolved.dateRange.startDate = monday.toISOString().split('T')[0];
      resolved.dateRange.endDate = sunday.toISOString().split('T')[0];
    } else if (resolved.dateRange.isThisMonth) {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      resolved.dateRange.startDate = startOfMonth.toISOString().split('T')[0];
      resolved.dateRange.endDate = endOfMonth.toISOString().split('T')[0];
    }

    return resolved;
  }

  /**
   * Check whether the extracted filters are effectively empty
   * (i.e. the LLM could not extract any meaningful constraint).
   */
  isEmpty(filters: MetadataFilters): boolean {
    return (
      (!filters.status || filters.status.length === 0) &&
      (!filters.category || filters.category.length === 0) &&
      (!filters.organizationKeywords || filters.organizationKeywords.length === 0) &&
      !filters.organizationLevel &&
      (!filters.locationRaw || filters.locationRaw.length === 0) &&
      !filters.dateRange
    );
  }
}
