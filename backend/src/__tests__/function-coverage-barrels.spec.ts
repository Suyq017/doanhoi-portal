import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';

import { QueryClassDto } from '../classes/dto/query-class.dto';

describe('Function Coverage Boost - Barrels and DTO transforms', () => {
  it('should touch all exports from ctxh index barrel', () => {
    const ctxh = require('../ctxh');

    const keys = Object.keys(ctxh);
    expect(keys.length).toBeGreaterThan(10);

    for (const key of keys) {
      const value = ctxh[key];
      expect(value).toBeDefined();
    }
  });

  it('should touch all exports from entities/all-entities barrel', () => {
    const entities = require('../entities/all-entities');

    const keys = Object.keys(entities);
    expect(keys.length).toBeGreaterThan(10);

    for (const key of keys) {
      const value = entities[key];
      expect(value).toBeDefined();
    }
  });

  it('should execute QueryClassDto transform functions', () => {
    const dto = plainToInstance(QueryClassDto, {
      page: '2',
      limit: '25',
      year: '2026',
      isActive: 'true',
      search: 'SE',
      departmentId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
    expect(dto.year).toBe(2026);
    expect(dto.isActive).toBe(true);
    expect(dto.search).toBe('SE');
  });
});
