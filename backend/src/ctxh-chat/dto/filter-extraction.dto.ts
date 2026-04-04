import { z } from 'zod';

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
  category: z
    .array(z.string())
    .optional()
    .describe(
      'Danh mục hoạt động CTXH. Áp dụng bảng ánh xạ: ' +
      '"tuyên dương / khen thưởng" -> "Các danh hiệu tuyên dương khen thưởng sinh viên", ' +
      '"mái ấm / nhà mở / làng trẻ em / người già" -> "Hoạt động Công tác xã hội (tình nguyện) tại mái ấm, nhà mở, làng trẻ em, khu điều dưỡng cho người già…", ' +
      '"hiến máu" -> "Hiến máu tình nguyện", ' +
      '"việc làm / job fair" -> "Ngày hội việc làm", ' +
      '"môi trường xanh / cơn lốc hóa học / cuộc thi học thuật" -> "Các cuộc thi học thuật (môi trường xanh, cơn lốc hóa học,…)", ' +
      '"hội trại / ngày hội" -> "Chương trình Hội trại, ngày hội", ' +
      '"dọn dẹp / vệ sinh / dọn kho / phòng thí nghiệm / môi trường" -> "Hoạt động công tác xã hội (dọn kho, phòng thí nghiệm, môi trường….)". ' +
      'Trả về tên danh mục chính xác, không trả về từ khóa gốc.',
    ),

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
   * Normalized location strings.
   * "cơ sở 1 / CS1" → "Cơ sở 1"
   * "cơ sở 2 / CS2" → "Cơ sở 2"
   */
  location: z
    .array(z.string())
    .optional()
    .describe(
      'Địa điểm đã chuẩn hóa: ' +
      '"cơ sở 1 / CS1 / Lý Thường Kiệt" -> "Cơ sở 1", ' +
      '"cơ sở 2 / CS2 / Dĩ An / Thủ Đức" -> "Cơ sở 2". ' +
      'Trả về dạng chuẩn hóa, không trả về từ khóa gốc.',
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
