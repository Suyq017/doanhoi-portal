import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

// Mock useToast with a stable spy instance so assertions can observe the same spy
const showErrorSpy = vi.fn();
vi.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({ showError: showErrorSpy, toasts: [], hideToast: vi.fn() })
}));

import { useToast } from '@/shared/hooks/useToast';

// Minimal config for ImportModal
import ImportModal from '../ImportModal';
import type { ImportModalConfig } from '@/shared/types/import';

const makeConfig = (): ImportModalConfig => ({
  entityName: 'users',
  acceptedFileTypes: ['.xlsx'],
  maxFileSize: 10_000_000,
  batchSize: 200,
  useClientSideProcessing: true,
  parseFile: undefined as any,
  validateClientData: undefined as any,
  submitClientData: undefined as any,
  uploadFile: undefined as any,
  validateServerData: undefined as any,
  executeServerImport: undefined as any,
  onValidationComplete: undefined,
  onSuccess: undefined,
  onError: undefined
});

describe('ImportModal', () => {
  it('calls showError when invalid file type selected', () => {
    const config = makeConfig();
    const onClose = vi.fn();

    const { getByTestId } = render(<ImportModal isOpen={true} onClose={onClose} config={config} />);

    // find file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const invalidFile = new File(['a,b'], 'test.csv', { type: 'text/csv' });

    // fire change
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    // The mocked useToast.showError should have been called (mocked implementation returned vi.fn)
    expect(showErrorSpy).toHaveBeenCalled();
  });
});
