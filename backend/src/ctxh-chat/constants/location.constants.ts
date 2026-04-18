export const LOCATION_ALIASES: Array<{
  canonical: string;
  aliases: string[];
}> = [
  {
    canonical: 'CS1',
    aliases: ['cơ sở 1', 'cs1', 'cs 1', 'lý thường kiệt', 'ltk', 'quận 10', 'diêm hồng', 'bách khoa cs 1'],
  },
  {
    canonical: 'CS2',
    aliases: ['cơ sở 2', 'cs2', 'cs 2', 'dĩ an', 'thủ đức', 'bình dương'],
  },
  {
    canonical: 'KTX Khu A',
    aliases: ['ktx khu a', 'ký túc xá khu a'],
  },
  {
    canonical: 'KTX Khu B',
    aliases: ['ktx khu b', 'ký túc xá khu b'],
  },
  // thêm địa điểm mới vào đây mà không cần đụng prompt
];

export function normalizeLocation(raw: string | null): string | null {
  if (!raw) return null;

  const normalized = raw.toLowerCase().trim();

  for (const entry of LOCATION_ALIASES) {
    if (entry.aliases.some(alias => normalized.includes(alias))) {
      return entry.canonical;
    }
  }

  // Không match alias nào -> giữ nguyên để ILIKE search
  // VD: "hội trường A4" không có trong alias list nhưng vẫn dùng được
  return raw.trim();
}

export function getSearchTermsForLocation(raw: string | null): string[] {
  if (!raw) return [];

  const normalized = raw.toLowerCase().trim();

  for (const entry of LOCATION_ALIASES) {
    if (entry.aliases.some(alias => normalized.includes(alias))) {
      return Array.from(new Set([entry.canonical, ...entry.aliases]));
    }
  }

  return [raw.trim()];
}
