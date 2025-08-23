import { useState, useCallback } from 'react';
import { ValidationErrors, ValidationRules, PaymentValidator, PaymentScenarioValidations } from '../utils/paymentValidation';

export interface UseFormValidationProps {
  validationRules?: ValidationRules;
  scenario?: keyof typeof PaymentScenarioValidations;
}

export interface UseFormValidationReturn {
  errors: ValidationErrors;
  validateField: (fieldName: string, value: any) => string | null;
  validateForm: (formData: Record<string, any>) => boolean;
  clearErrors: (fieldNames?: string[]) => void;
  clearAllErrors: () => void;
  hasErrors: boolean;
  hasFieldError: (fieldName: string) => boolean;
  getFieldError: (fieldName: string) => string | undefined;
  setFieldError: (fieldName: string, error: string | null) => void;
}

export function useFormValidation({
  validationRules,
  scenario
}: UseFormValidationProps = {}): UseFormValidationReturn {
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Get validation rules from scenario or use provided rules
  const getValidationRules = useCallback((): ValidationRules => {
    if (validationRules) return validationRules;
    if (scenario && PaymentScenarioValidations[scenario]) {
      return PaymentScenarioValidations[scenario];
    }
    return {};
  }, [validationRules, scenario]);

  // Validate a single field
  const validateField = useCallback((fieldName: string, value: any): string | null => {
    const rules = getValidationRules();
    const fieldRule = rules[fieldName];

    if (!fieldRule) return null;

    const error = PaymentValidator.validateField(value, fieldRule);

    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[fieldName] = error;
      } else {
        delete newErrors[fieldName];
      }
      return newErrors;
    });

    return error;
  }, [getValidationRules]);

  // Validate entire form
  const validateForm = useCallback((formData: Record<string, any>): boolean => {
    const rules = getValidationRules();
    const formErrors = PaymentValidator.validateForm(formData, rules);

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  }, [getValidationRules]);

  // Clear specific field errors
  const clearErrors = useCallback((fieldNames?: string[]) => {
    setErrors(prev => {
      if (!fieldNames) return {};

      const newErrors = { ...prev };
      fieldNames.forEach(fieldName => {
        delete newErrors[fieldName];
      });
      return newErrors;
    });
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Check if form has any errors
  const hasErrors = Object.keys(errors).length > 0;

  // Check if specific field has error
  const hasFieldError = useCallback((fieldName: string): boolean => {
    return fieldName in errors;
  }, [errors]);

  // Get error for specific field
  const getFieldError = useCallback((fieldName: string): string | undefined => {
    return errors[fieldName];
  }, [errors]);

  // Set error for specific field
  const setFieldError = useCallback((fieldName: string, error: string | null) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[fieldName] = error;
      } else {
        delete newErrors[fieldName];
      }
      return newErrors;
    });
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    clearErrors,
    clearAllErrors,
    hasErrors,
    hasFieldError,
    getFieldError,
    setFieldError
  };
}

// Hook for real-time field validation
export function useFieldValidation(
  fieldName: string,
  scenario?: keyof typeof PaymentScenarioValidations,
  validationRules?: ValidationRules
) {
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validate = useCallback((value: any): string | null => {
    let rules: ValidationRules = {};

    if (validationRules) {
      rules = validationRules;
    } else if (scenario && PaymentScenarioValidations[scenario]) {
      rules = PaymentScenarioValidations[scenario];
    }

    const fieldRule = rules[fieldName];
    if (!fieldRule) return null;

    const validationError = PaymentValidator.validateField(value, fieldRule);
    setError(validationError);
    return validationError;
  }, [fieldName, scenario, validationRules]);

  const onBlur = useCallback(() => {
    setTouched(true);
  }, []);

  const onChange = useCallback((value: any) => {
    if (touched) {
      validate(value);
    }
  }, [validate, touched]);

  const reset = useCallback(() => {
    setError(null);
    setTouched(false);
  }, []);

  return {
    error,
    touched,
    validate,
    onBlur,
    onChange,
    reset,
    hasError: !!error,
    isValid: !error
  };
}

// Hook for form submission with validation
export function useFormSubmission<T extends Record<string, any>>(
  onSubmit: (data: T) => Promise<void> | void,
  validationConfig?: UseFormValidationProps
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validation = useFormValidation(validationConfig);

  const handleSubmit = useCallback(async (formData: T, event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    setSubmitError(null);

    // Validate form
    const isValid = validation.validateForm(formData);
    if (!isValid) {
      return false;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      validation.clearAllErrors();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi';
      setSubmitError(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, validation]);

  return {
    ...validation,
    isSubmitting,
    submitError,
    handleSubmit,
    clearSubmitError: () => setSubmitError(null)
  };
}

// Hook for async field validation (e.g., checking if email exists)
export function useAsyncFieldValidation(
  _fieldName: string,
  asyncValidator: (value: any) => Promise<string | null>,
  debounceMs: number = 500
) {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationTimeoutId, setValidationTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const validate = useCallback(async (value: any): Promise<string | null> => {
    // Clear existing timeout
    if (validationTimeoutId) {
      clearTimeout(validationTimeoutId);
    }

    // Set new timeout for debounced validation
    const timeoutId = setTimeout(async () => {
      try {
        setIsValidating(true);
        const validationError = await asyncValidator(value);
        setError(validationError);
        return validationError;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Lỗi xác thực';
        setError(errorMessage);
        return errorMessage;
      } finally {
        setIsValidating(false);
      }
    }, debounceMs);

    setValidationTimeoutId(timeoutId);
    return null;
  }, [asyncValidator, debounceMs, validationTimeoutId]);

  const reset = useCallback(() => {
    if (validationTimeoutId) {
      clearTimeout(validationTimeoutId);
    }
    setError(null);
    setIsValidating(false);
  }, [validationTimeoutId]);

  return {
    error,
    isValidating,
    validate,
    reset,
    hasError: !!error,
    isValid: !error && !isValidating
  };
}
