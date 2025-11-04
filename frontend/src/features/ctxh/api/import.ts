import { apiClient } from '@/shared/services/apiClient';
import {
  ImportOldSystemCtxhRequest,
  ImportOldSystemCtxhResult,
} from '../types/import';

export const ctxhImportApi = {
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
