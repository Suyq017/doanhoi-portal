import { FieldType } from '@/shared/types/template.types';

export interface FieldTypeConfig {
  value: FieldType;
  label: string;
  description: string;
  category: 'basic' | 'advanced';
  needsOptions?: boolean; // Có cần cấu hình options không (radio)
  supportsValidation?: {
    required?: boolean;
    min?: boolean;
    max?: boolean;
    pattern?: boolean;
    minLength?: boolean;
    maxLength?: boolean;
  };
}

export const FIELD_TYPES: Record<FieldType, FieldTypeConfig> = {
  [FieldType.TEXT]: {
    value: FieldType.TEXT,
    label: 'Text',
    description: 'Văn bản ngắn (Dưới 255 ký tự)',
    category: 'basic',
    supportsValidation: {
      required: true,
      minLength: true,
      maxLength: true,
      pattern: true,
    },
  },
  [FieldType.TEXTAREA]: {
    value: FieldType.TEXTAREA,
    label: 'Textarea',
    description: 'Văn bản không giới hạn ký tự, nhiều dòng',
    category: 'basic',
    supportsValidation: {
      required: true,
      minLength: true,
      maxLength: true,
    },
  },
  [FieldType.NUMBER]: {
    value: FieldType.NUMBER,
    label: 'Number',
    description: 'Kiểu dữ liệu số',
    category: 'basic',
    supportsValidation: {
      required: true,
      min: true,
      max: true,
    },
  },
  [FieldType.EMAIL]: {
    value: FieldType.EMAIL,
    label: 'Email',
    description: 'Địa chỉ email',
    category: 'basic',
    supportsValidation: {
      required: true,
      pattern: true,
    },
  },
  [FieldType.PHONE]: {
    value: FieldType.PHONE,
    label: 'Phone Number',
    description: 'Số điện thoại (10 chữ số)',
    category: 'basic',
    supportsValidation: {
      required: true,
      pattern: true,
      minLength: true,
      maxLength: true,
    },
  },
  [FieldType.DATE]: {
    value: FieldType.DATE,
    label: 'Date',
    description: 'Ngày/tháng/năm (DD/MM/YYYY)',
    category: 'basic',
    supportsValidation: {
      required: true,
      min: true,
      max: true,
    },
  },
  [FieldType.TIME]: {
    value: FieldType.TIME,
    label: 'Time',
    description: 'Thời gian (HH:MM)',
    category: 'basic',
    supportsValidation: {
      required: true,
    },
  },
  [FieldType.DATETIME]: {
    value: FieldType.DATETIME,
    label: 'DateTime',
    description: 'Ngày và giờ (DD/MM/YYYYTHH:MM)',
    category: 'basic',
    supportsValidation: {
      required: true,
      min: true,
      max: true,
    },
  },
  [FieldType.RADIO]: {
    value: FieldType.RADIO,
    label: 'Radio',
    description: 'Chọn một trong nhiều lựa chọn (cần cấu hình options).\nVí dụ: \nGói dịch Vụ: ☒ Thấp ☐ Trung bình ☐ Cao',
    category: 'advanced',
    needsOptions: true,
    supportsValidation: {
      required: true,
    },
  },
  [FieldType.CHECKBOX]: {
    value: FieldType.CHECKBOX,
    label: 'Checkbox',
    description: 'Chọn nhiều lựa chọn (cần cấu hình options).\nVí dụ:\nDịch vụ bổ sung: ☒ Gửi email hàng loạt ☒ Thông báo SMS ☐ Hỗ trợ kỹ thuật',
    category: 'advanced',
    needsOptions: true,
    supportsValidation: {
      required: true,
    },
  },
  [FieldType.DAY]: {
    value: FieldType.DAY,
    label: 'Day',
    description: 'Ngày (DD)',
    category: 'basic',
    supportsValidation: {
      required: true,
      min: true,
      max: true,
    },
  },
  [FieldType.MONTH]: {
    value: FieldType.MONTH,
    label: 'Month',
    description: 'Tháng (MM)',
    category: 'basic',
    supportsValidation: {
      required: true,
      min: true,
      max: true,
    },
  },
  [FieldType.YEAR]: {
    value: FieldType.YEAR,
    label: 'Year',
    description: 'Năm (YYYY)',
    category: 'basic',
    supportsValidation: {
      required: true,
      min: true,
      max: true,
    },
  },
};

// Helper functions
export const getFieldTypesByCategory = (category: 'basic' | 'advanced' | 'special') => {
  return Object.values(FIELD_TYPES).filter((ft) => ft.category === category);
};

export const getFieldTypeConfig = (fieldType: FieldType): FieldTypeConfig | undefined => {
  return FIELD_TYPES[fieldType];
};

export const getAllFieldTypes = (): FieldTypeConfig[] => {
  return Object.values(FIELD_TYPES);
};

// Grouped field types for UI display
export const FIELD_TYPE_GROUPS = {
  basic: {
    label: 'Loại dữ liệu cơ bản',
    types: getFieldTypesByCategory('basic'),
  },
  advanced: {
    label: 'Loại dữ liệu nâng cao',
    types: getFieldTypesByCategory('advanced'),
  },
  special: {
    label: 'Loại dữ liệu đặc biệt',
    types: getFieldTypesByCategory('special'),
  },
};
