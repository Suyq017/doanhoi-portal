import { FieldType } from '@/shared/types/template.types';

export interface FieldTypeConfig {
  value: FieldType;
  label: string;
  descriptionKey: string; // Translation key for description
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
    descriptionKey: 'templates:fieldTypeDescriptions.text',
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
    descriptionKey: 'templates:fieldTypeDescriptions.textarea',
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
    descriptionKey: 'templates:fieldTypeDescriptions.number',
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
    descriptionKey: 'templates:fieldTypeDescriptions.email',
    category: 'basic',
    supportsValidation: {
      required: true,
      pattern: true,
    },
  },
  [FieldType.PHONE]: {
    value: FieldType.PHONE,
    label: 'Phone Number',
    descriptionKey: 'templates:fieldTypeDescriptions.phone',
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
    descriptionKey: 'templates:fieldTypeDescriptions.date',
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
    descriptionKey: 'templates:fieldTypeDescriptions.time',
    category: 'basic',
    supportsValidation: {
      required: true,
    },
  },
  [FieldType.DATETIME]: {
    value: FieldType.DATETIME,
    label: 'DateTime',
    descriptionKey: 'templates:fieldTypeDescriptions.datetime',
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
    descriptionKey: 'templates:fieldTypeDescriptions.radio',
    category: 'advanced',
    needsOptions: true,
    supportsValidation: {
      required: true,
    },
  },
  [FieldType.CHECKBOX]: {
    value: FieldType.CHECKBOX,
    label: 'Checkbox',
    descriptionKey: 'templates:fieldTypeDescriptions.checkbox',
    category: 'advanced',
    needsOptions: true,
    supportsValidation: {
      required: true,
    },
  },
  [FieldType.DAY]: {
    value: FieldType.DAY,
    label: 'Day',
    descriptionKey: 'templates:fieldTypeDescriptions.day',
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
    descriptionKey: 'templates:fieldTypeDescriptions.month',
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
    descriptionKey: 'templates:fieldTypeDescriptions.year',
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

// Grouped field types for UI display - now with translation keys
export const FIELD_TYPE_GROUPS = {
  basic: {
    labelKey: 'templates:fieldTypeGroups.basic',
    types: getFieldTypesByCategory('basic'),
  },
  advanced: {
    labelKey: 'templates:fieldTypeGroups.advanced',
    types: getFieldTypesByCategory('advanced'),
  },
  special: {
    labelKey: 'templates:fieldTypeGroups.special',
    types: getFieldTypesByCategory('special'),
  },
};
