import { describe, it, expect } from '@jest/globals';
import { CreateCategoryDto } from '../../category/dto/create-category.dto';
import { UpdateCategoryDto } from '../../category/dto/update-category.dto';

describe('CTXH Category DTOs', () => {
  it('should allow creating CreateCategoryDto with required fields', () => {
    const dto: CreateCategoryDto = {
      name: 'Test Category',
      description: 'Test description',
      organization_id: 'org-1',
    };

    expect(dto.name).toBe('Test Category');
    expect(dto.description).toBe('Test description');
    expect(dto.organization_id).toBe('org-1');
  });

  it('should allow UpdateCategoryDto with partial fields', () => {
    const dto: UpdateCategoryDto = {
      name: 'Updated',
    };

    expect(dto.name).toBe('Updated');
    expect(dto.description).toBeUndefined();
  });

  it('should handle CreateCategoryDto with optional fields', () => {
    const dto: CreateCategoryDto = {
      name: 'Category',
      organization_id: 'org-1',
    };

    expect(dto.name).toBeDefined();
    expect(dto.organization_id).toBeDefined();
  });

  it('should allow empty UpdateCategoryDto', () => {
    const dto: UpdateCategoryDto = {};
    expect(Object.keys(dto).length).toBe(0);
  });
});
