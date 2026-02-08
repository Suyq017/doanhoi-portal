import { apiClient } from '@/shared/services/apiClient';
import {
  ImportOldSystemCtxhRequest,
  ImportOldSystemCtxhResult,
  ValidateOldSystemCtxhRequest,
  ValidateOldSystemCtxhResult,
} from '../types/import';

export const ctxhImportApi = {
  validateOldSystem: async (
    data: ValidateOldSystemCtxhRequest
  ): Promise<ValidateOldSystemCtxhResult> => {
    return apiClient.request<ValidateOldSystemCtxhResult>(
      '/ctxh/import/old-system/validate',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  importOldSystem: async (
    data: ImportOldSystemCtxhRequest
  ): Promise<ImportOldSystemCtxhResult> => {
    return apiClient.request<ImportOldSystemCtxhResult>(
      '/ctxh/import/old-system',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },
};
