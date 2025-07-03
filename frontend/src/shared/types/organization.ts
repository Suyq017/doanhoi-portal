export type OrganizationType =
    // Đoàn
    | 'doan_truong'
    | 'doan_co_so'
    | 'chi_doan'
    // Hội
    | 'hoi_sinh_vien_truong'
    | 'lien_chi_hoi'
    | 'chi_hoi'
    // CLB
    | 'clb_truong'
    | 'clb_khoa';

// Hoặc nếu bạn muốn sử dụng enum
export enum OrganizationTypeEnum {
    // Đoàn
    DOAN_TRUONG = 'doan_truong',
    DOAN_CO_SO = 'doan_co_so',
    CHI_DOAN = 'chi_doan',
    // Hội
    HOI_SINH_VIEN_TRUONG = 'hoi_sinh_vien_truong',
    LIEN_CHI_HOI = 'lien_chi_hoi',
    CHI_HOI = 'chi_hoi',
    // CLB
    CLB_TRUONG = 'clb_truong',
    CLB_KHOA = 'clb_khoa'
}

// Tổ chức theo nhóm
export const OrganizationGroups = {
    DOAN: ['doan_truong', 'doan_co_so', 'chi_doan'],
    HOI: ['hoi_sinh_vien_truong', 'lien_chi_hoi', 'chi_hoi'],
    CLB: ['clb_truong', 'clb_khoa']
} as const;

export interface Organization {
    id: string;
    name: string;
    type: string;
    description?: string;
    memberCount?: number;
    parentId?: string;
    isExpanded?: boolean;
    code?: string;
    parent?: {
        name: string;
        id: string;
    };
    children?: Organization[];


    createdAt: string;
    updatedAt: string;
}

export interface CreateOrganizationRequest {
    name: string;
    type: string;
    description?: string;
    parentId?: string;
    code?: string;
}

export interface UpdateOrganizationRequest extends Partial<CreateOrganizationRequest> {
    id?: string;
}

export interface UserOrganization {
    id: string;
    userId: string;
    organizationId: string;
    role: string;
    isActive: boolean;
    joinedAt: string;
    user?: any;
    organization?: Organization;
}


export interface OrganizationStats {
    doanStats: {
        total: number;
        doanTruong: number;
        doanCoSo: number;
        chiDoan: number;
        members: {
            total: number;
            doanTruong: number;
            doanCoSo: number;
            chiDoan: number;
        }
    };
    hoiStats: {
        total: number;
        hoiSinhVienTruong: number;
        lienChiHoi: number;
        chiHoi: number;
        members: {
            total: number;
            hoiSinhVienTruong: number;
            lienChiHoi: number;
            chiHoi: number;
        }
    };
    clbStats: {
        total: number;
        clbTruong: number;
        clbKhoa: number;
        members: {
            total: number;
            clbTruong: number;
            clbKhoa: number;
        }
    };
    totalMembers: number;
}