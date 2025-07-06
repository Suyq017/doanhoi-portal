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
  { key: 'departmentCode', label: t('classes:fields.departmentCode'), required: false, type: 'text' },
  { key: 'isActive', label: t('common:fields.status'), required: false, type: 'boolean' },
];

/**
 * Users columns configuration (most complex)
 * Can optionally take translation function for better i18n support
 */
export const userColumns = (t?: (key: string) => string): ImportColumn[] => [
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
  },
  { key: 'isActive', label: t?.('users:fields.isActive') || 'Is Active', required: false, type: 'boolean' }
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
        label: t?.('organizations:fields.studentCode') || 'Mã số sinh viên',
        required: true,
        type: 'text'
      },
      {
        key: 'classOrUnitCode',
        label: t?.('organizations:fields.classOrUnitCode') || 'Mã lớp/đơn vị',
        required: true,
        type: 'text'
      }
    ];
  } else {
    return [
      {
        key: 'studentCode',
        label: t?.('organizations:fields.studentCode') || 'Mã số sinh viên',
        required: true,
        type: 'text'
      }
    ];
  }
};
