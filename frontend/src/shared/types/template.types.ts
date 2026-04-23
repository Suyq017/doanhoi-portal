// Template System Types

export enum TemplateStatus {
  PROCESSING = 'processing',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  EMAIL = 'email',
  PHONE = 'phone',
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
}

export enum SubmissionStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface TemplateField {
  id: string;
  templateId: string;
  fieldName: string;
  displayName: string;
  fieldType: FieldType;
  validationRules?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
  options?: Array<{ label: string; value: string }>;
  position: number;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  isVisible: boolean;
  datePartsMapping?: {
    dayField: string;
    monthField: string;
    yearField: string;
  };
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  originalFileUrl: string;
  originalFileName: string;
  fileSize: number;
  schema?: {
    fields: Array<{
      fieldName: string;
      position: number;
    }>;
    parsedAt: string;
  };
  status: TemplateStatus;
  errorMessage?: string;
  createdBy: string;
  organizationId: string;
  fields?: TemplateField[];
  fieldsCount?: number; // Count of fields (when not loading full fields relation)
  createdAt: string;
  updatedAt: string;
}

export interface TemplateSubmission {
  id: string;
  templateId: string;
  userId: string;
  formData: Record<string, any>;
  outputFileUrl?: string;
  outputFileName?: string;
  outputFileSize?: number;
  status: SubmissionStatus;
  errorMessage?: string;
  submittedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  template?: Template;
}

// DTOs
export interface CreateTemplateDto {
  name: string;
  description?: string;
  organizationId?: string;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  status?: TemplateStatus;
}

export interface ConfigureFieldDto {
  fieldName: string;
  displayName: string;
  fieldType: FieldType;
  position: number;
  validationRules?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
  options?: Array<{ label: string; value: string }>;
  datePartsMapping?: {
    dayField: string;
    monthField: string;
    yearField: string;
  };
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  isVisible?: boolean;
}

export interface ConfigureFieldsDto {
  fields: ConfigureFieldDto[];
}

export interface CreateSubmissionDto {
  templateId: string;
  formData: Record<string, any>;
}

export interface UpdateSubmissionDto {
  formData?: Record<string, any>;
}
