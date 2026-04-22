/**
 * Centralized configuration for CTXH Categories.
 * This can later be loaded dynamically from the database.
 */

// Explicitly define the valid categories as a const array of string literals
export const VALID_CATEGORIES = [
  "Các danh hiệu tuyên dương khen thưởng sinh viên",
  "Hoạt động Công tác xã hội (tình nguyện) tại mái ấm, nhà mở, làng trẻ em, khu điều dưỡng cho người già…",
  "Hiến máu tình nguyện",
  "Ngày hội việc làm",
  "Các cuộc thi học thuật (môi trường xanh, cơn lốc hóa học,…)",
  "Chương trình Hội trại, ngày hội",
  "Hoạt động công tác xã hội (dọn kho, phòng thí nghiệm, môi trường….)",
] as const;

export const CATEGORY_MAPPINGS = [
  {
    category: VALID_CATEGORIES[0],
    keywords: ["tuyên dương", "khen thưởng"],
  },
  {
    category: VALID_CATEGORIES[1],
    keywords: ["mái ấm", "nhà mở", "làng trẻ em", "người già", "trẻ mồ côi"],
  },
  {
    category: VALID_CATEGORIES[2],
    keywords: ["hiến máu", "hiến tiểu cầu"],
  },
  {
    category: VALID_CATEGORIES[3],
    keywords: ["việc làm", "career", "tuyển dụng"],
  },
  {
    category: VALID_CATEGORIES[4],
    keywords: ["môi trường xanh", "cơn lốc hóa học", "thi học thuật", "cuộc thi học thuật"],
  },
  {
    category: VALID_CATEGORIES[5],
    keywords: ["hội trại", "xuân tình nguyện", "ngày hội"],
  },
  {
    category: VALID_CATEGORIES[6],
    keywords: ["dọn dẹp", "vệ sinh", "dọn kho", "phòng thí nghiệm", "môi trường"],
  },
];

// Helper to generate the numbered list for the prompt
export const getCategoryListString = (): string => {
  return VALID_CATEGORIES.map((cat, index) => `${index + 1}. "${cat}"`).join('\n');
};

// Helper to generate the mapping rules for the prompt
export const getCategoryKeywordMapString = (): string => {
  return CATEGORY_MAPPINGS.map(
    (m) => `• "${m.keywords.join(' / ')}" -> "${m.category}"`
  ).join('\n');
};
