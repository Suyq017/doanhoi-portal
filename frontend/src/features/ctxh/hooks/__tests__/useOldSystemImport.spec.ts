import { act, renderHook } from '@testing-library/react';
import { useOldSystemImport } from '../useOldSystemImport';

describe('useOldSystemImport', () => {
  it('opens the import modal, increments the modal key, and closes it', () => {
    const { result } = renderHook(() => useOldSystemImport());

    expect(result.current.isImportModalOpen).toBe(false);
    expect(result.current.modalKey).toBe(0);

    act(() => {
      result.current.openImportModal();
    });

    expect(result.current.isImportModalOpen).toBe(true);
    expect(result.current.modalKey).toBe(1);

    act(() => {
      result.current.closeImportModal();
    });

    expect(result.current.isImportModalOpen).toBe(false);
    expect(result.current.modalKey).toBe(1);
  });

  it('handles import callbacks without throwing', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => useOldSystemImport());

    act(() => {
      result.current.handleImportSuccess({ imported: 3 });
      result.current.handleImportError(new Error('Import failed'));
    });

    expect(consoleLogSpy).toHaveBeenCalledWith('Import completed:', { imported: 3 });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Import failed:', expect.any(Error));

    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
