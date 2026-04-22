export interface UserRoleAssignment {
  roleId: string;
  organizationId?: string;
  isActive?: boolean;
}

export interface CreateUserWithMultipleRolesRequest {
  // Basic user info
  code: string;
  familyName: string;
  givenName: string;
  email: string;
  phone: string;
  password?: string;
  googleId?: string;
  userType?: string;
  membershipStatus?: string;
  managementDepartmentId?: string;
  trainingDepartmentId?: string;
  classId?: string;

  // New: Multiple role-organization assignments
  roleAssignments?: UserRoleAssignment[];

  // Deprecated: Keep for backward compatibility
  roleId?: string;
  organizationId?: string;
  roles?: string[];
}
