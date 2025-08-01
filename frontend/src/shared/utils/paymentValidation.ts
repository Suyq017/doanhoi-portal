export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

export class PaymentValidator {
  static validateField(value: any, rules: ValidationRule): string | null {
    // Required validation
    if (rules.required && (value === null || value === undefined || value === '')) {
      return 'Trường này là bắt buộc';
    }

    // Skip other validations if field is empty and not required
    if (!rules.required && (value === null || value === undefined || value === '')) {
      return null;
    }

    // String validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        return `Độ dài tối thiểu là ${rules.minLength} ký tự`;
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        return `Độ dài tối đa là ${rules.maxLength} ký tự`;
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        return 'Định dạng không hợp lệ';
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        return `Giá trị tối thiểu là ${rules.min}`;
      }
      
      if (rules.max !== undefined && value > rules.max) {
        return `Giá trị tối đa là ${rules.max}`;
      }
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        return customError;
      }
    }

    return null;
  }

  static validateForm(formData: Record<string, any>, validationRules: ValidationRules): ValidationErrors {
    const errors: ValidationErrors = {};

    Object.keys(validationRules).forEach(fieldName => {
      const value = formData[fieldName];
      const rules = validationRules[fieldName];
      const error = this.validateField(value, rules);
      
      if (error) {
        errors[fieldName] = error;
      }
    });

    return errors;
  }

  static isFormValid(formData: Record<string, any>, validationRules: ValidationRules): boolean {
    const errors = this.validateForm(formData, validationRules);
    return Object.keys(errors).length === 0;
  }
}

// Predefined validation rules for payment forms
export const PaymentValidationRules = {
  // Campaign creation/edit
  campaignName: {
    required: true,
    minLength: 3,
    maxLength: 100
  },
  campaignDescription: {
    maxLength: 500
  },
  dueDate: {
    required: true,
    custom: (value: string) => {
      if (!value) return null;
      const date = new Date(value);
      const now = new Date();
      if (date < now) {
        return 'Hạn thanh toán phải là ngày trong tương lai';
      }
      return null;
    }
  },

  // Fee level
  levelName: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  amount: {
    required: true,
    min: 1000,
    max: 100000000,
    custom: (value: number) => {
      if (value % 1000 !== 0) {
        return 'Số tiền phải là bội số của 1,000 VNĐ';
      }
      return null;
    }
  },
  levelDescription: {
    maxLength: 200
  },

  // Assignment
  assignmentNote: {
    maxLength: 300
  },
  customAmount: {
    min: 1000,
    max: 100000000,
    custom: (value: number) => {
      if (value && value % 1000 !== 0) {
        return 'Số tiền phải là bội số của 1,000 VNĐ';
      }
      return null;
    }
  },

  // User information
  fullName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÁÁỂẾỀỀỂếểỄỆệỀệểỄỀệỂỄẾỆỂỀếỀỀỂếểỄỆệỀệểỄỆỂễỀệỂỄẾỆỂỀỂỄẾỆỂỀỀỂếểỄỆệỀệểỄỀỆỂễỀệỂỄẾỆỂỀỀỂếểỄỆệỀệểỄỀỆỂễỀệỂỄẾỆỂỀỀỂếểỄỆệỀệểỄỀỆỂễỀệỂỄẾỆỂỀỀỂếểỄỆệỀệểỄỀỆỂễỀỂộỐỒỒỔỔỘỘỔỔỒỒỐỘỔỔỒỒỐỘỔỔỒỒỐỘỔổỒỒỐỘỔỔỒỒỐỘỔổỒỒỐỘỔỔỒỒỐỘỔổỒỒỐỘỔỔỒỒỐỘỔổỒỒỐỘỔỔỒỒỐỘỔổỒỒỐỘỔỔỒỒỐỘỔổỒỒỐỘỔỔỒỒỐỘỔổỒỒỐỘỔỔỒỒỐỘỔổỒỒỐỘỔỔỒỒỐỘỔổỒỒỐỘỔỔỒỒỐỘỔổỒỒỘỔỔỒỒỘỔổỒỒỘỔỔỒỒỘỔổỒỒỘỔỔỒỒỘỔổỒỒỘỔỔỒỒỘỔổỒỒỘỔỔỒỒỘỔổỒỒỘỔỔỒỒỘỔổỒỒỘỔỔỒỒỘỔổỒỒỘỔỔỒỒỘỔổỒỒỘỔỔỒỒỘỔổỒỒỘỔỔỒỒỘỔổỒỒỘỔỔỒỒỘỔổỒỒ\s]+$/
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value: string) => {
      if (!value) return null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Địa chỉ email không hợp lệ';
      }
      return null;
    }
  },
  phone: {
    pattern: /^(\+84|84|0)[1-9][0-9]{8}$/,
    custom: (value: string) => {
      if (!value) return null;
      if (!/^(\+84|84|0)[1-9][0-9]{8}$/.test(value)) {
        return 'Số điện thoại không hợp lệ (VD: 0901234567)';
      }
      return null;
    }
  },

  // Search and filter
  searchTerm: {
    maxLength: 100
  },
  
  // Bulk operations
  bulkNote: {
    maxLength: 500
  }
};

// Specific validation for different payment scenarios
export const PaymentScenarioValidations = {
  // Create new campaign
  createCampaign: {
    name: PaymentValidationRules.campaignName,
    description: PaymentValidationRules.campaignDescription,
    dueDate: PaymentValidationRules.dueDate
  },

  // Create fee level
  createFeeLevel: {
    levelName: PaymentValidationRules.levelName,
    amount: PaymentValidationRules.amount,
    description: PaymentValidationRules.levelDescription
  },

  // Create assignment
  createAssignment: {
    customAmount: PaymentValidationRules.customAmount,
    note: PaymentValidationRules.assignmentNote,
    dueDate: {
      custom: (value: string) => {
        if (!value) return null;
        const date = new Date(value);
        const now = new Date();
        if (date < now) {
          return 'Hạn thanh toán phải là ngày trong tương lai';
        }
        return null;
      }
    }
  },

  // Bulk create assignments
  bulkCreateAssignments: {
    note: PaymentValidationRules.bulkNote,
    dueDate: PaymentValidationRules.dueDate
  },

  // User profile update
  updateProfile: {
    fullName: PaymentValidationRules.fullName,
    email: PaymentValidationRules.email,
    phone: PaymentValidationRules.phone
  },

  // Payment processing
  processPayment: {
    amount: {
      required: true,
      min: 1000,
      max: 100000000,
      custom: (value: number) => {
        if (value % 1000 !== 0) {
          return 'Số tiền phải là bội số của 1,000 VNĐ';
        }
        return null;
      }
    },
    description: {
      required: true,
      minLength: 5,
      maxLength: 200
    }
  }
};

// Helper function to get validation rules for a specific scenario
export function getValidationRules(scenario: keyof typeof PaymentScenarioValidations): ValidationRules {
  return PaymentScenarioValidations[scenario] || {};
}

// Helper function to validate specific payment scenarios
export function validatePaymentScenario(
  scenario: keyof typeof PaymentScenarioValidations,
  formData: Record<string, any>
): ValidationErrors {
  const rules = getValidationRules(scenario);
  return PaymentValidator.validateForm(formData, rules);
}

// Real-time validation helper
export function validateFieldRealTime(
  fieldName: string,
  value: any,
  scenario: keyof typeof PaymentScenarioValidations
): string | null {
  const rules = getValidationRules(scenario);
  const fieldRule = rules[fieldName];
  
  if (!fieldRule) return null;
  
  return PaymentValidator.validateField(value, fieldRule);
}
