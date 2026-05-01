import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions } from '../../../shared';

const mockUseAuth = vi.fn();

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Permissions feature - shared permissions hook', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('maps class permissions from the current organization context', () => {
    mockUseAuth.mockReturnValue({
      auth: {
        user: { id: 'user-1' },
        userRoles: [],
        userPermissions: [],
        isAuthenticated: true,
        currentOrganizationId: 'org-1',
        permissionsLoading: false,
      },
      hasPermission: (permission: string, orgId?: string) =>
        permission === 'classes.create' && orgId === 'org-1',
      hasAnyPermission: vi.fn(),
    });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canCreateClass()).toBe(true);
    expect(result.current.canViewClassDetails()).toBe(false);
    expect(result.current.canUpdateClass()).toBe(false);
    expect(result.current.canDeleteClass()).toBe(false);
    expect(result.current.canExportClasses()).toBe(false);
    expect(result.current.canAccessClasses()).toBe(false);
  });

  it('detects system-wide permission and super admin role', () => {
    mockUseAuth.mockReturnValue({
      auth: {
        user: { id: 'user-2' },
        userRoles: [{ name: 'Super Admin' }],
        userPermissions: [],
        isAuthenticated: true,
        currentOrganizationId: undefined,
        permissionsLoading: false,
      },
      hasPermission: (permission: string, orgId?: string) =>
        permission === 'system.access_admin' || (permission === 'permissions.access' && orgId === undefined),
      hasAnyPermission: vi.fn(),
    });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isSuperAdmin()).toBe(true);
    expect(result.current.canAccessPermissions()).toBe(true);
    expect(result.current.canCreateRole()).toBe(false);
    expect(result.current.canAccessChildOrganizationsFlexible()).toBe(false);
  });
});
