export interface User {
    id: string;
    code: string;
    familyName: string;
    givenName: string;
    email: string;
    phone: string;
    password?: string;
    googleId?: string;
    userType: 'student' | 'staff';
    membershipStatus: 'doan_vien' | 'hoi_vien' | 'both' | 'none';
    createdAt: string;
    updatedAt: string;
    managementDepartment?: any;
    trainingDepartment?: any;
    class?: any;
}
export interface UserQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    userType?: 'student' | 'staff';
    membershipStatus?: 'doan_vien' | 'hoi_vien' | 'both' | 'none';
}


export interface CreateUserRequest {
    code: string;
    familyName: string;
    givenName: string;
    email: string;
    phone: string;
    password?: string;
    userType?: 'student' | 'staff';
    membershipStatus?: 'doan_vien' | 'hoi_vien' | 'both' | 'none';
    managementDepartmentId?: string;
    trainingDepartmentId?: string;
    classId?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> { }