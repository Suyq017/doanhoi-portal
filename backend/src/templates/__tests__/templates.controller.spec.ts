import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

import { TemplatesController } from '../templates.controller';

describe('TemplatesController', () => {
  let templatesService: any;
  let controller: TemplatesController;

  beforeEach(() => {
    templatesService = {
      uploadTemplate: jest.fn(),
      parseTemplate: jest.fn(),
      configureFields: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    controller = new TemplatesController(templatesService as any);
  });

  it('should upload, parse and manage templates', async () => {
    templatesService.uploadTemplate.mockResolvedValue({ id: 'template-1' });
    templatesService.parseTemplate.mockResolvedValue({ placeholders: ['name'] });
    templatesService.configureFields.mockResolvedValue({ id: 'template-1', configured: true });
    templatesService.findAll.mockResolvedValue({ data: [], total: 0 });
    templatesService.findOne.mockResolvedValue({ id: 'template-1' });
    templatesService.update.mockResolvedValue({ id: 'template-1', updated: true });
    templatesService.delete.mockResolvedValue(undefined);

    await expect(
      controller.uploadTemplate(
        { buffer: Buffer.from('docx') } as any,
        { name: 'Template' } as any,
        { user: { id: 'user-1' } } as any,
      ),
    ).resolves.toEqual({ id: 'template-1' });

    await expect(controller.parseTemplate({ originalname: 'file.docx', buffer: Buffer.from('docx') } as any)).resolves.toEqual({ placeholders: ['name'] });
    await expect(controller.configureFields('template-1', { fields: [] } as any)).resolves.toEqual({ id: 'template-1', configured: true });
    await expect(controller.findAll('active', 'search', 2, 25)).resolves.toEqual({ data: [], total: 0 });
    await expect(controller.findOne('template-1')).resolves.toEqual({ id: 'template-1' });
    await expect(controller.update('template-1', { name: 'New name' } as any)).resolves.toEqual({ id: 'template-1', updated: true });
    await expect(controller.delete('template-1')).resolves.toEqual({ message: 'TEMPLATE_DELETED' });
  });

  it('should reject missing or invalid files', async () => {
    await expect(controller.uploadTemplate(undefined as any, {} as any, { user: { id: 'user-1' } } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.parseTemplate(undefined as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.parseTemplate({ originalname: 'file.txt', buffer: Buffer.from('txt') } as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
