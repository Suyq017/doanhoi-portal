export interface ExportField {
  key: string;
  label: string;
  category: 'basic' | 'academic' | 'organization' | 'system';
  description?: string;
}

export interface ExportRequest {
  fields: string[];
  organizationId?: string;
  format?: 'xlsx' | 'csv';
}

export interface ExportResponse {
  success: boolean;
  fileName?: string;
  fileUrl?: string;
  error?: string;
}

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (fields: string[]) => Promise<void>;
  title?: string;
  description?: string;
  availableFields: ExportField[];
}

export interface ExportFieldSelectorProps {
  fields: ExportField[];
  selectedFields: string[];
  onFieldChange: (fieldKey: string, checked: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const USER_EXPORT_FIELDS: ExportField[] = [
  // Basic Information
  { key: 'code', label: 'Mã số', category: 'basic', description: 'Mã số sinh viên/cán bộ' },
  { key: 'familyName', label: 'Họ và tên lót', category: 'basic' },
  { key: 'givenName', label: 'Tên', category: 'basic' },
  { key: 'fullName', label: 'Họ và tên đầy đủ', category: 'basic' },
  { key: 'email', label: 'Email', category: 'basic' },
  { key: 'phone', label: 'Số điện thoại', category: 'basic' },
  
  // Academic Information
  { key: 'managementDepartment', label: 'Khoa quản lý', category: 'academic' },
  { key: 'trainingDepartment', label: 'Khoa đào tạo', category: 'academic' },
  { key: 'class', label: 'Lớp', category: 'academic' },
  
  // Organization Information
  { key: 'userType', label: 'Loại người dùng', category: 'organization' },
  { key: 'membershipStatus', label: 'Tình trạng thành viên', category: 'organization' },
  { key: 'role', label: 'Vai trò trong tổ chức', category: 'organization' },
  { key: 'isActive', label: 'Trạng thái hoạt động', category: 'organization' },
  
  // System Information
  { key: 'createdAt', label: 'Ngày tạo', category: 'system' },
  { key: 'updatedAt', label: 'Ngày cập nhật', category: 'system' },
  { key: 'joinedAt', label: 'Ngày tham gia', category: 'system' },
];
