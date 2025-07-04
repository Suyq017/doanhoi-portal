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