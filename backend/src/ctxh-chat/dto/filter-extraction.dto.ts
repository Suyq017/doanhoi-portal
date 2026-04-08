import { z } from 'zod';
import { VALID_CATEGORIES } from '../config/category.config';
/**
 * Zod schema describing the structured metadata filters
 * that an LLM extracts from a Vietnamese natural-language question.
 *
 * Every field is optional — the LLM only populates the ones
 * it can confidently extract from the user's question.
 */
export const MetadataFilterSchema = z.object({
  /**
   * Mapped activity statuses.
   * "đang mở / đang diễn ra" → "ongoing"
   * "sắp diễn ra / sắp tới" → "upcoming"
   * "đã kết thúc / đã qua" → "ended"
   */
  status: z
    .array(z.enum(['ongoing', 'upcoming', 'ended']))
    .optional()
    .describe(
      'Trạng thái hoạt động được suy ra từ câu hỏi. ' +
      '"đang diễn ra / hôm nay / đang mở" -> ongoing, ' +
      '"sắp tới / sắp diễn ra" -> upcoming, ' +
      '"đã kết thúc / đã qua" -> ended. ' +
      'Để trống nếu không có ý định lọc theo trạng thái.',
    ),

  /**
   * Exact category names after Vietnamese synonym mapping.
   * Examples: "Công tác xã hội", "Hiến máu tình nguyện"
   */
  // category: z
  //   .array(z.enum(VALID_CATEGORIES))
  //   .optional()
  //   .describe(
  //     'Danh mục hoạt động CTXH. Tính năng trích xuất danh mục. Trả về đúng tên danh mục đã định sẵn. ' +
  //     'Trả về tên danh mục chính xác, không trả về từ khóa gốc.',
  //   ),

  /**
   * Free-text keyword(s) to match against organizationName via ILIKE.
   * Example: user says "khoa Máy tính" → ["Máy tính"]
   */
  organizationKeywords: z
    .array(z.string())
    .optional()
    .describe(
      'Từ khóa tổ chức / đơn vị được trích xuất từ câu hỏi. ' +
      'Ví dụ: "khoa Máy tính" -> ["Máy tính"], ' +
      '"Đoàn trường" -> ["Đoàn trường"]. ' +
      'Dùng để tìm kiếm ILIKE trên organizationName.',
    ),

  /**
   * Organization hierarchy level.
   * "Hội sinh viên", "Đoàn trường" → "parent" (toàn trường)
   * "Liên chi đoàn / Chi hội Khoa X" → "child" (cấp khoa)
   */
  organizationLevel: z
    .enum(['parent', 'child'])
    .optional()
    .describe(
      'Cấp tổ chức: ' +
      '"parent" nếu hỏi về tổ chức cấp trường (Hội sinh viên, Đoàn trường), ' +
      '"child" nếu hỏi về cấp khoa (Liên chi đoàn, Liên chi hội Khoa X). ' +
      'Để trống nếu không xác định được.',
    ),

  /**
   * Raw location strings extracted directly from text.
   */
  locationRaw: z
    .array(z.string())
    .optional()
    .describe(
      'Trích xuất NGUYÊN VĂN cụm địa điểm từ câu hỏi, không diễn giải lại. ' +
      'Ví dụ: "ở ktx khu B" -> ["ktx khu B"], "tại cơ sở 1" -> ["cơ sở 1"]. ',
    ),

  /**
   * Date range filter derived from temporal expressions.
   */
  dateRange: z
    .object({
      /** "hôm nay" -> true */
      isToday: z.boolean().optional().describe('"hôm nay" -> true'),
      /** "tuần này" -> true */
      isThisWeek: z.boolean().optional().describe('"tuần này" -> true'),
      /** "tháng này" -> true */
      isThisMonth: z.boolean().optional().describe('"tháng này" -> true'),
      /** Explicit start bound (ISO YYYY-MM-DD) if user mentions a specific date */
      startDate: z.string().optional().describe('Ngày bắt đầu (YYYY-MM-DD) nếu user nêu cụ thể'),
      /** Explicit end bound (ISO YYYY-MM-DD) */
      endDate: z.string().optional().describe('Ngày kết thúc (YYYY-MM-DD) nếu user nêu cụ thể'),
    })
    .optional()
    .describe(
      'Khoảng thời gian được suy ra từ câu hỏi. ' +
      'Ưu tiên các flag: isToday, isThisWeek, isThisMonth. ' +
      'Nếu user nêu ngày cụ thể thì dùng startDate/endDate.',
    ),
});

/**
 * TypeScript type inferred from the Zod schema.
 */
export type MetadataFilters = z.infer<typeof MetadataFilterSchema>;
