import { renderHook, waitFor, act } from '@testing-library/react';
import { useActivityDetail } from '../useActivityDetail';

const mocks = vi.hoisted(() => ({
  params: { id: 'activity-1' as string | undefined },
  navigate: vi.fn(),
  location: { state: null as any },
  toast: {
    toasts: [],
    hideToast: vi.fn(),
    showError: vi.fn(),
    showSuccess: vi.fn(),
  },
  permissions: {
    activities: { update: true, view: true },
  },
  activityService: {
    findOne: vi.fn(),
    getParticipants: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useParams: () => mocks.params,
  useNavigate: () => mocks.navigate,
  useLocation: () => mocks.location,
}));

vi.mock('../../../shared/hooks', () => ({
  useToast: () => mocks.toast,
}));

vi.mock('../useCtxhPermissions', () => ({
  useCtxhPermissions: () => mocks.permissions,
}));

vi.mock('../../services', () => ({
  activityService: mocks.activityService,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('useActivityDetail', () => {
  beforeEach(() => {
    mocks.params.id = 'activity-1';
    mocks.location.state = null;
    mocks.navigate.mockReset();
    mocks.toast.showError.mockReset();
    mocks.toast.showSuccess.mockReset();
    mocks.toast.hideToast.mockReset();
    mocks.activityService.findOne.mockReset();
    mocks.activityService.getParticipants.mockReset();
    mocks.activityService.update.mockReset();
    mocks.permissions.activities.update = true;
    mocks.permissions.activities.view = true;
  });

  it('loads activity and computes statistics from participants', async () => {
    mocks.activityService.findOne.mockResolvedValue({
      id: 'activity-1',
      name: 'Hiến máu',
      status: 'ACTIVE',
      category: { name: 'Tình nguyện' },
    });
    mocks.activityService.getParticipants.mockResolvedValue([
      { status: 'COMPLETED' },
      { status: 'REGISTERED' },
      { status: 'CANCELLED' },
    ]);

    const { result } = renderHook(() => useActivityDetail());

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.participantsLoading).toBe(false));

    expect(result.current.activity?.name).toBe('Hiến máu');
    expect(result.current.statistics).toEqual({
      total: 3,
      completed: 1,
      registered: 1,
      cancelled: 1,
    });
    expect(result.current.getStatusBadge('ACTIVE').label).toBe('activity.statusOptions.ACTIVE');
    expect(result.current.getCategoryName('cat-1')).toBe('Tình nguyện');
    expect(result.current.formatNumber(12)).toBe('12');
  });

  it('redirects to list when activity id is missing', async () => {
    mocks.params.id = undefined;

    renderHook(() => useActivityDetail());

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/portal/ctxh/activities');
    });
  });

  it('navigates back to category detail source when handleBack is called', async () => {
    mocks.location.state = { from: 'category-detail', category: { id: 'cat-1' } };
    mocks.activityService.findOne.mockResolvedValue({
      id: 'activity-1',
      name: 'Hiến máu',
      status: 'ACTIVE',
    });
    mocks.activityService.getParticipants.mockResolvedValue([]);

    const { result } = renderHook(() => useActivityDetail());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleBack();
    });

    expect(mocks.navigate).toHaveBeenCalledWith('/portal/ctxh/categories', {
      state: { openCategoryDetail: { id: 'cat-1' } },
    });
  });

  it('updates activity and closes edit form on save', async () => {
    mocks.activityService.findOne.mockResolvedValue({
      id: 'activity-1',
      name: 'Hiến máu',
      status: 'ACTIVE',
    });
    mocks.activityService.getParticipants.mockResolvedValue([]);
    mocks.activityService.update.mockResolvedValue({
      id: 'activity-1',
      name: 'Hiến máu cập nhật',
      status: 'ACTIVE',
    });

    const { result } = renderHook(() => useActivityDetail());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setShowEditForm(true);
    });

    await act(async () => {
      await result.current.handleActivityUpdate({ name: 'Hiến máu cập nhật' });
    });

    expect(mocks.activityService.update).toHaveBeenCalledWith('activity-1', { name: 'Hiến máu cập nhật' });
    expect(result.current.showEditForm).toBe(false);
    expect(result.current.activity?.name).toBe('Hiến máu cập nhật');
  });
});
