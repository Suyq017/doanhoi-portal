import { ImportColumn } from '../types/import';

/**
 * Predefined column configurations for different entities
 * These can be imported and used directly with useImportConfig hook
 */

/**
 * Department columns configuration
 */
export const departmentColumns = (t: (key: string) => string): ImportColumn[] => [
  { key: 'name', label: t('departments:fields.name'), required: true, type: 'text' },
  { key: 'code', label: t('departments:fields.code'), required: false, type: 'text' },
  { key: 'description', label: t('departments:fields.description'), required: false, type: 'text' },
];

/**
 * Classes columns configuration
 */
export const classColumns = (t: (key: string) => string): ImportColumn[] => [
  { key: 'name', label: t('classes:fields.name'), required: true, type: 'text' },
  { key: 'code', label: t('classes:fields.code'), required: false, type: 'text' },
  { key: 'year', label: t('classes:fields.year'), required: false, type: 'number' },
  { key: 'departmentCode', label: t('classes:fields.departmentCode'), required: false, type: 'text' }
  // Đã bỏ cột isActive vì backend tự động set mặc định là true
];

/**
 * Users columns configuration (Enhanced version matching backend)
 * Matches the 18-column template from EnhancedImportService
 */
export const userColumns = (t?: (key: string) => string): ImportColumn[] => [
  // Required fields - chỉ có 3 trường bắt buộc
  { key: 'code', label: t?.('users:fields.code') || 'Mã số sinh viên/cán bộ | Student/Staff Code', required: true, type: 'text' },
  { key: 'email', label: t?.('users:fields.email') || 'Email | Email Address', required: false, type: 'email' }, // Có thể để trống hoặc dùng "*" để lưu null
  { key: 'identityCard', label: t?.('users:fields.identityCard') || 'CMND/CCCD | Identity Card', required: false, type: 'text' },
  { key: 'familyName', label: t?.('users:fields.familyName') || 'Họ và tên lót | Family Name', required: true, type: 'text' },
  { key: 'givenName', label: t?.('users:fields.givenName') || 'Tên | Given Name', required: true, type: 'text' },
  
  // Personal information
  { key: 'birthDate', label: t?.('users:fields.birthDate') || 'Ngày sinh | Date of Birth', required: false, type: 'date' },
  {
    key: 'gender',
    label: t?.('users:fields.gender') || 'Giới tính | Gender',
    required: false,
    type: 'select',
    selectOptions: [
      { value: 'NAM', label: t?.('users:gender.male') || 'Nam | Male' },
      { value: 'NU', label: t?.('users:gender.female') || 'Nữ | Female' }
    ]
  },
  { key: 'password', label: t?.('users:fields.password') || 'Mật khẩu | Password', required: false, type: 'text' },
  { key: 'phone', label: t?.('users:fields.phone') || 'Số điện thoại | Phone Number', required: false, type: 'text' },
  
  // Academic information
  { key: 'admissionYear', label: t?.('users:fields.admissionYear') || 'Năm nhập học | Admission Year', required: false, type: 'text' },
  { key: 'curriculumYear', label: t?.('users:fields.curriculumYear') || 'Năm chương trình đào tạo | Curriculum Year', required: false, type: 'text' },
  { key: 'className', label: t?.('users:fields.className') || 'Tên lớp | Class Name', required: false, type: 'text' },
  { key: 'facultyCode', label: t?.('users:fields.facultyCode') || 'Mã khoa | Faculty Code', required: false, type: 'text' },
  { key: 'managementDepartmentCode', label: t?.('users:fields.departmentCode') || 'Mã đơn vị quản lý | Management Dept Code', required: false, type: 'text' },
  
  // Training information
  {
    key: 'trainingSystem',
    label: t?.('users:fields.trainingSystem') || 'Hệ đào tạo | Training System',
    required: false,
    type: 'select',
    selectOptions: [
      { value: 'VLVH', label: t?.('users:trainingSystem.vlvh') || 'Vừa làm vừa học | Part-time' },
      { value: 'CQ', label: t?.('users:trainingSystem.cq') || 'Chính quy | Full-time' },
      { value: 'QT', label: t?.('users:trainingSystem.qt') || 'Quốc tế | International' },
      { value: 'DTTX', label: t?.('users:trainingSystem.dttx') || 'Đào tạo từ xa | Distance Learning' }
    ]
  },
  {
    key: 'trainingLevel',
    label: t?.('users:fields.trainingLevel') || 'Bậc đào tạo | Training Level',
    required: false,
    type: 'select',
    selectOptions: [
      { value: 'DH', label: t?.('users:trainingLevel.dh') || 'Đại học | University' }
    ]
  },
  
  // User classification
  {
    key: 'userType',
    label: t?.('users:fields.userType') || 'Loại người dùng | User Type',
    required: false,
    type: 'select',
    selectOptions: [
      { value: 'SINH_VIEN', label: t?.('users:userType.sinhVien') || 'Sinh viên | Student' },
      { value: 'CAN_BO', label: t?.('users:userType.canBo') || 'Cán bộ | Staff' }
    ]
  },
  {
    key: 'membershipStatus',
    label: t?.('users:fields.membershipStatus') || 'Tình trạng | Membership Status',
    required: false,
    type: 'select',
    selectOptions: [
      { value: 'ACTIVE', label: t?.('users:membershipStatus.active') || 'Hoạt động | Active' },
      { value: 'INACTIVE', label: t?.('users:membershipStatus.inactive') || 'Không hoạt động | Inactive' },
      { value: 'GRADUATED', label: t?.('users:membershipStatus.graduated') || 'Đã tốt nghiệp | Graduated' }
    ]
  }
];

/**
 * Legacy users columns configuration (for backward compatibility)
 * Use this if you need to support the old import format
 */
export const userColumnsLegacy = (t?: (key: string) => string): ImportColumn[] => [
  { key: 'familyName', label: t?.('users:fields.familyName') || 'Family Name', required: true, type: 'text' },
  { key: 'givenName', label: t?.('users:fields.givenName') || 'Given Name', required: true, type: 'text' },
  { key: 'email', label: t?.('users:fields.email') || 'Email', required: true, type: 'email' },
  { key: 'code', label: t?.('users:fields.code') || 'Code', required: true, type: 'text' },
  { key: 'password', label: t?.('users:fields.password') || 'Password', required: false, type: 'text' },
  { key: 'phone', label: t?.('users:fields.phone') || 'Phone', required: false, type: 'text' },
  { key: 'className', label: t?.('users:fields.className') || 'Class Name', required: false, type: 'text' },
  { key: 'managementDepartmentCode', label: t?.('users:fields.managementDepartmentCode') || 'Management Department Code', required: false, type: 'text' },
  { key: 'trainingDepartmentCode', label: t?.('users:fields.trainingDepartmentCode') || 'Training Department Code', required: false, type: 'text' },
  { key: 'organizationCodes', label: t?.('users:fields.organizationCodes') || 'Organization Codes', required: false, type: 'text' },
  {
    key: 'userType',
    label: t?.('users:fields.userType') || 'User Type',
    required: false,
    type: 'select',
    selectOptions: [
      { value: 'student', label: t?.('users:types.student') || 'Student' },
      { value: 'staff', label: t?.('users:types.staff') || 'Staff' }
    ]
  },
  {
    key: 'membershipStatus',
    label: t?.('users:fields.membershipStatus') || 'Membership Status',
    required: false,
    type: 'select',
    selectOptions: [
      { value: 'doan_vien', label: t?.('users:membershipStatus.doan_vien') || 'Đoàn viên' },
      { value: 'hoi_vien', label: t?.('users:membershipStatus.hoi_vien') || 'Hội viên' },
      { value: 'both', label: t?.('users:membershipStatus.both') || 'Cả hai' },
      { value: 'none', label: t?.('users:membershipStatus.none') || 'Không' }
    ]
  }
];

/**
 * Organization columns configuration (different for each level)
 * Can optionally take translation function for better i18n support
 */
export const organizationColumns = (level: 2 | 3, t?: (key: string) => string): ImportColumn[] => {
  if (level === 2) {
    return [
      {
        key: 'studentCode',
        label: t?.('organizations:fields.studentCode') || 'Mã số sinh viên | Student Code',
        required: true,
        type: 'text'
      },
      {
        key: 'classOrUnitCode',
        label: t?.('organizations:fields.classOrUnitCode') || 'Mã lớp/đơn vị | Class/Unit Code',
        required: true,
        type: 'text'
      }
    ];
  } else {
    return [
      {
        key: 'studentCode',
        label: t?.('organizations:fields.studentCode') || 'Mã số sinh viên | Student Code',
        required: true,
        type: 'text'
      }
    ];
  }
};
