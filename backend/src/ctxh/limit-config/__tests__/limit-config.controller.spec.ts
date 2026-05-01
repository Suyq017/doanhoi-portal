import { describe, expect, it, beforeEach, jest } from '@jest/globals';

import { LimitConfigController } from '../limit-config.controller';

describe('LimitConfigController', () => {
  let limitConfigService: any;
  let controller: LimitConfigController;

  beforeEach(() => {
    limitConfigService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      restore: jest.fn(),
    };

    controller = new LimitConfigController(limitConfigService as any);
  });

  it('should create, query and manage limit configs', async () => {
    limitConfigService.create.mockResolvedValue({ id: 'config-1' });
    limitConfigService.findAll.mockResolvedValue({ data: [{ id: 'config-1' }] });
    limitConfigService.findOne.mockResolvedValue({ id: 'config-1' });
    limitConfigService.update.mockResolvedValue({ id: 'config-1', updated: true });
    limitConfigService.remove.mockResolvedValue({ id: 'config-1', removed: true });
    limitConfigService.restore.mockResolvedValue({ id: 'config-1', restored: true });

    await expect(controller.create({ name: 'Limit' } as any, { user: { id: 'user-1' } } as any)).resolves.toEqual({ id: 'config-1' });
    await expect(controller.findAll(2, 25, 'org-1', 'ACTIVE', 'Khoa CNTT')).resolves.toEqual({ data: [{ id: 'config-1' }] });
    await expect(controller.getOrganizationActiveLimit('org-1')).resolves.toEqual({ limitConfig: { id: 'config-1' } });
    await expect(controller.findOne('config-1')).resolves.toEqual({ id: 'config-1' });
    await expect(controller.update('config-1', { days: 10 } as any, { user: { id: 'user-1' } } as any)).resolves.toEqual({ id: 'config-1', updated: true });
    await expect(controller.remove('config-1', { user: { id: 'user-1' } } as any)).resolves.toEqual({ id: 'config-1', removed: true });
    await expect(controller.restore('config-1', { user: { id: 'user-1' } } as any)).resolves.toEqual({ id: 'config-1', restored: true });
  });

  it('should return null when no active config exists', async () => {
    limitConfigService.findAll.mockResolvedValue({ data: [] });

    await expect(controller.getOrganizationActiveLimit('org-2')).resolves.toEqual({ limitConfig: null });
  });
});
