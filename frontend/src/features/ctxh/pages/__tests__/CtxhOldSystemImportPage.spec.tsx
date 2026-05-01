import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CtxhOldSystemImportPage } from '../CtxhOldSystemImportPage';

const mocks = vi.hoisted(() => ({
  openImportModal: vi.fn(),
  closeImportModal: vi.fn(),
  handleImportSuccess: vi.fn(),
  handleImportError: vi.fn(),
  state: {
    isImportModalOpen: false,
    modalKey: 0,
  },
}));

vi.mock('../../hooks', () => ({
  useOldSystemImport: () => ({
    ...mocks.state,
    openImportModal: mocks.openImportModal,
    closeImportModal: mocks.closeImportModal,
    handleImportSuccess: mocks.handleImportSuccess,
    handleImportError: mocks.handleImportError,
  }),
}));

vi.mock('@/shared/components', () => ({
  ImportModal: ({ isOpen, config }: any) => (
    <div
      data-testid="import-modal"
      data-open={String(isOpen)}
      data-has-success={String(typeof config?.onSuccess === 'function')}
      data-has-error={String(typeof config?.onError === 'function')}
    />
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('CtxhOldSystemImportPage', () => {
  beforeEach(() => {
    mocks.openImportModal.mockReset();
    mocks.closeImportModal.mockReset();
    mocks.handleImportSuccess.mockReset();
    mocks.handleImportError.mockReset();
    mocks.state.isImportModalOpen = false;
    mocks.state.modalKey = 0;
  });

  it('renders page text and import button', () => {
    render(<CtxhOldSystemImportPage />);

    expect(screen.getByRole('heading', { name: 'title' })).toBeTruthy();
    expect(screen.getByText('description')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'importButton' })).toBeTruthy();
  });

  it('opens the modal when import button is clicked', async () => {
    const user = userEvent.setup();
    render(<CtxhOldSystemImportPage />);

    await user.click(screen.getByRole('button', { name: 'importButton' }));
    expect(mocks.openImportModal).toHaveBeenCalledTimes(1);
  });

  it('passes callbacks and open state to ImportModal', () => {
    mocks.state.isImportModalOpen = true;
    mocks.state.modalKey = 7;

    render(<CtxhOldSystemImportPage />);

    expect(screen.getByTestId('import-modal').getAttribute('data-open')).toBe('true');
    expect(screen.getByTestId('import-modal').getAttribute('data-has-success')).toBe('true');
    expect(screen.getByTestId('import-modal').getAttribute('data-has-error')).toBe('true');
  });
});
