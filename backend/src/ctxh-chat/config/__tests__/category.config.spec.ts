import { CATEGORY_MAPPINGS, VALID_CATEGORIES, getCategoryKeywordMapString, getCategoryListString } from '../category.config';

describe('category.config', () => {
  it('should expose the expected category list', () => {
    expect(VALID_CATEGORIES).toHaveLength(7);
    expect(VALID_CATEGORIES[0]).toContain('tuyên dương');
    expect(VALID_CATEGORIES[2]).toBe('Hiến máu tình nguyện');
  });

  it('should expose category mappings for all categories', () => {
    expect(CATEGORY_MAPPINGS).toHaveLength(7);
    expect(CATEGORY_MAPPINGS.map((mapping) => mapping.category)).toEqual(VALID_CATEGORIES);
    expect(CATEGORY_MAPPINGS[2].keywords).toEqual(expect.arrayContaining(['hiến máu', 'hiến tiểu cầu']));
  });

  it('should format category list string', () => {
    const listString = getCategoryListString();

    expect(listString.split('\n')).toHaveLength(7);
    expect(listString).toContain('1. "Các danh hiệu tuyên dương khen thưởng sinh viên"');
    expect(listString).toContain('7. "Hoạt động công tác xã hội (dọn kho, phòng thí nghiệm, môi trường….)"');
  });

  it('should format category keyword map string', () => {
    const mapString = getCategoryKeywordMapString();

    expect(mapString.split('\n')).toHaveLength(7);
    expect(mapString).toContain('"hiến máu / hiến tiểu cầu" → "Hiến máu tình nguyện"');
    expect(mapString).toContain('"hội trại / xuân tình nguyện / ngày hội" → "Chương trình Hội trại, ngày hội"');
  });
});
