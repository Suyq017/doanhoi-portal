import { describe, expect, it, beforeEach, jest } from '@jest/globals';

import { CtxhImportController } from '../import.controller';

describe('CtxhImportController', () => {
  let importService: {
    validateOldSystemCtxh: jest.Mock;
    importOldSystemCtxh: jest.Mock;
  };
  let controller: CtxhImportController;

  beforeEach(() => {
    importService = {
      validateOldSystemCtxh: jest.fn(),
      importOldSystemCtxh: jest.fn(),
    };

    controller = new CtxhImportController(importService as any);
  });

  it('should validate and import old system records', async () => {
    importService.validateOldSystemCtxh.mockResolvedValue({ valid: 2, invalid: 1 });
    importService.importOldSystemCtxh.mockResolvedValue({ imported: 2 });

    await expect(controller.validateOldSystem({ records: [{}, {}] } as any)).resolves.toEqual({ valid: 2, invalid: 1 });
    await expect(controller.importOldSystem({ records: [{}, {}] } as any)).resolves.toEqual({ imported: 2 });
  });
});
