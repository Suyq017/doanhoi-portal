import { renderHook } from '@testing-library/react';
import { act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// Mocks
vi.mock('../../../../shared/hooks/queries', () => ({
  useStudentReport: vi.fn()
}));
vi.mock('../../../auth/context/AuthContext', () => ({
  useAuth: () => ({ auth: { user: { code: 'TEST123' } }, isLoading: false })
}));
vi.mock('../../../../shared/services/userService', () => ({
  userService: {
    getUsers: vi.fn()
  }
}));

import { useStudentReport } from '../../../../shared/hooks/queries';
import { userService } from '../../../../shared/services/userService';
import { useStudentReportsPage } from '../useStudentReportsPage';

describe('useStudentReportsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('formats days correctly and computes achievement flag', () => {
    // mock report with total_days_completed
    (useStudentReport as any).mockReturnValue({ data: { total_days_completed: 16, student_name: 'A', student_email: 'a@x' }, isLoading: false });

    const { result } = renderHook(() => useStudentReportsPage());

    expect(result.current.formatDays(3)).toBe('3');
    expect(result.current.formatDays(3.5)).toBe('3.5');
    expect(result.current.formatDays(null)).toBe('0');

    expect(result.current.isCtxhAchieved).toBe(true);
    expect(result.current.displayName).toContain('A');
    expect(result.current.displayEmail).toContain('a@x');
  });

  it('loads studentInfo from userService when report misses name/email', async () => {
    // report without name/email
    (useStudentReport as any).mockReturnValue({ data: { student_code: 'S001', total_days_completed: 5 }, isLoading: false });

    (userService.getUsers as any).mockResolvedValue({ users: [{ familyName: 'Nguyen', givenName: 'Van A', email: 'a@hcmut.edu' }] });

    const { result } = renderHook(() => useStudentReportsPage());

    // wait for effect to finish
    await waitFor(() => {
      expect(userService.getUsers).toHaveBeenCalledWith({ search: 'TEST123', limit: 1 });
    });

    expect(result.current.studentInfo.name).toBe('Nguyen Van A');
    expect(result.current.studentInfo.email).toBe('a@hcmut.edu');

    // display fallback uses studentInfo now
    expect(result.current.displayName).toContain('Nguyen Van A');
  });
});
