jest.mock('../category.service', () => ({
  CategoryService: class {
    create = jest.fn();
    findAll = jest.fn();
    findOneWithUserType = jest.fn();
    update = jest.fn();
    softDelete = jest.fn();
    restore = jest.fn();
  },
}));

jest.mock('../../../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class {},
}));

jest.mock('../../../auth/guards/permission.guard', () => ({
  PermissionGuard: class {},
}));

jest.mock('../../../auth/decorators/permissions.decorator', () => ({
  RequirePermissions: () => () => undefined,
}));

import { describe, it, expect, beforeEach } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CategoryController } from '../category.controller';

describe('CategoryController', () => {
  let categoryService: any;
  let controller: CategoryController;

  beforeEach(() => {
    categoryService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOneWithUserType: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
    };

    controller = new CategoryController(categoryService);
  });

  it('should create a category', async () => {
    categoryService.create.mockResolvedValue({ id: 'cat-1', name: 'Category 1' });

    const result = await controller.create(
      { name: 'Category 1', organization_id: 'org-1' } as any,
      { user: { id: 'user-1' } } as any,
    );

    expect(result).toEqual({ id: 'cat-1', name: 'Category 1' });
    expect(categoryService.create).toHaveBeenCalled();
  });

  it('should find all categories', async () => {
    categoryService.findAll.mockResolvedValue({
      data: [
        { id: 'cat-1', name: 'Category 1' },
        { id: 'cat-2', name: 'Category 2' },
      ],
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });

    const result = await controller.findAll(
      { user: { id: 'user-1', userType: 'student' } } as any,
      'volunteer',
      2,
      10,
    );

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBe(2);
    expect(categoryService.findAll).toHaveBeenCalledWith({
      search: 'volunteer',
      page: 2,
      limit: 10,
      user_type: 'student',
    });
  });

  it('should find one category by id', async () => {
    categoryService.findOneWithUserType.mockResolvedValue({ id: 'cat-1', name: 'Category 1' });

    const result = await controller.findOne('cat-1', { user: { id: 'user-1', userType: 'student' } } as any);

    expect(result.id).toBe('cat-1');
    expect(categoryService.findOneWithUserType).toHaveBeenCalledWith('cat-1', 'student');
  });

  it('should update a category', async () => {
    categoryService.update.mockResolvedValue({ id: 'cat-1', name: 'Updated' });

    const result = await controller.update(
      'cat-1',
      { name: 'Updated' } as any,
      { user: { id: 'user-1' } } as any,
    );

    expect(result.name).toBe('Updated');
    expect(categoryService.update).toHaveBeenCalled();
  });

  it('should remove a category', async () => {
    categoryService.softDelete.mockResolvedValue(undefined);

    const result = await controller.remove('cat-1', { user: { id: 'user-1' } } as any);

    expect(result).toEqual({ message: 'Xóa danh mục thành công' });
    expect(categoryService.softDelete).toHaveBeenCalledWith('cat-1', 'user-1');
  });

  it('should handle errors in create', async () => {
    categoryService.create.mockRejectedValue(new BadRequestException('Invalid data'));

    await expect(
      controller.create({ name: '' } as any, { user: { id: 'user-1' } } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should handle not found errors', async () => {
    categoryService.findOneWithUserType.mockRejectedValue(new NotFoundException('Not found'));

    await expect(
      controller.findOne('invalid-id', { user: { id: 'user-1', userType: 'student' } } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('should restore a category', async () => {
    categoryService.restore.mockResolvedValue({ id: 'cat-1', name: 'Category 1', is_deleted: false });

    const result = await controller.restore('cat-1');

    expect(result).toMatchObject({ id: 'cat-1', name: 'Category 1' });
    expect(categoryService.restore).toHaveBeenCalledWith('cat-1');
  });
});
