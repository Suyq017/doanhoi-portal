import React, { ReactNode } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  success?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  success,
  hint,
  className = '',
  children
}) => {
  const fieldId = React.useId();

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          id: fieldId,
          className: `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
              : success
              ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
          }`,
          'aria-invalid': !!error,
          'aria-describedby': error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
        })}
        
        {/* Success icon */}
        {success && !error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
        )}
        
        {/* Error icon */}
        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <p id={`${fieldId}-error`} className="text-sm text-red-600 flex items-center space-x-1">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
      
      {/* Success message */}
      {success && !error && (
        <p className="text-sm text-green-600 flex items-center space-x-1">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{success}</span>
        </p>
      )}
      
      {/* Hint */}
      {hint && !error && !success && (
        <p id={`${fieldId}-hint`} className="text-sm text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
};

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
  success?: string;
  hint?: string;
  containerClassName?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  required,
  error,
  success,
  hint,
  containerClassName,
  className,
  ...inputProps
}) => {
  return (
    <FormField
      label={label}
      required={required}
      error={error}
      success={success}
      hint={hint}
      className={containerClassName}
    >
      <input
        type="text"
        className={className}
        {...inputProps}
      />
    </FormField>
  );
};

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  required?: boolean;
  error?: string;
  success?: string;
  hint?: string;
  containerClassName?: string;
  onChange?: (value: number | null) => void;
  formatCurrency?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  required,
  error,
  success,
  hint,
  containerClassName,
  className,
  onChange,
  formatCurrency = false,
  value,
  ...inputProps
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/[^\d]/g, '');
    const numValue = inputValue ? parseInt(inputValue, 10) : null;
    
    if (onChange) {
      onChange(numValue);
    }
  };

  const formatDisplayValue = (val: string | number | readonly string[] | undefined): string => {
    if (val === undefined || val === null || val === '') return '';
    
    const numVal = typeof val === 'string' ? parseInt(val.replace(/[^\d]/g, ''), 10) : Number(val);
    
    if (isNaN(numVal)) return '';
    
    if (formatCurrency) {
      return new Intl.NumberFormat('vi-VN').format(numVal);
    }
    
    return numVal.toString();
  };

  return (
    <FormField
      label={label}
      required={required}
      error={error}
      success={success}
      hint={hint}
      className={containerClassName}
    >
      <div className="relative">
        <input
          type="text"
          className={`${formatCurrency ? 'pr-12' : ''} ${className}`}
          value={formatDisplayValue(value)}
          onChange={handleChange}
          {...inputProps}
        />
        {formatCurrency && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 text-sm">VNĐ</span>
          </div>
        )}
      </div>
    </FormField>
  );
};

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  error?: string;
  success?: string;
  hint?: string;
  containerClassName?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  required,
  error,
  success,
  hint,
  containerClassName,
  className,
  ...textareaProps
}) => {
  return (
    <FormField
      label={label}
      required={required}
      error={error}
      success={success}
      hint={hint}
      className={containerClassName}
    >
      <textarea
        className={`resize-none ${className}`}
        rows={3}
        {...textareaProps}
      />
    </FormField>
  );
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
  error?: string;
  success?: string;
  hint?: string;
  containerClassName?: string;
  options: Array<{ value: string | number; label: string; disabled?: boolean }>;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  required,
  error,
  success,
  hint,
  containerClassName,
  className,
  options,
  placeholder,
  ...selectProps
}) => {
  return (
    <FormField
      label={label}
      required={required}
      error={error}
      success={success}
      hint={hint}
      className={containerClassName}
    >
      <select className={className} {...selectProps}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
};

export interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
  success?: string;
  hint?: string;
  containerClassName?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  label,
  required,
  error,
  success,
  hint,
  containerClassName,
  className,
  ...inputProps
}) => {
  return (
    <FormField
      label={label}
      required={required}
      error={error}
      success={success}
      hint={hint}
      className={containerClassName}
    >
      <input
        type="date"
        className={className}
        {...inputProps}
      />
    </FormField>
  );
};

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  error,
  hint,
  containerClassName,
  className,
  children,
  ...inputProps
}) => {
  const fieldId = React.useId();

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      <div className="flex items-start space-x-3">
        <input
          id={fieldId}
          type="checkbox"
          className={`mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${className}`}
          {...inputProps}
        />
        {(label || children) && (
          <label htmlFor={fieldId} className="text-sm text-gray-700 cursor-pointer">
            {label || children}
          </label>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center space-x-1 ml-7">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
      
      {hint && !error && (
        <p className="text-sm text-gray-500 ml-7">
          {hint}
        </p>
      )}
    </div>
  );
};

export interface RadioGroupProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  containerClassName?: string;
  name: string;
  value?: string | number;
  onChange?: (value: string) => void;
  options: Array<{ value: string | number; label: string; disabled?: boolean; hint?: string }>;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  required,
  error,
  hint,
  containerClassName,
  name,
  value,
  onChange,
  options
}) => {
  return (
    <div className={`space-y-2 ${containerClassName}`}>
      {label && (
        <div className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </div>
      )}
      
      <div className="space-y-2">
        {options.map((option) => {
          const optionId = `${name}-${option.value}`;
          return (
            <div key={option.value} className="flex items-start space-x-3">
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={option.disabled}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="flex-1">
                <label htmlFor={optionId} className="text-sm text-gray-700 cursor-pointer">
                  {option.label}
                </label>
                {option.hint && (
                  <p className="text-xs text-gray-500 mt-1">{option.hint}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center space-x-1">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
      
      {hint && !error && (
        <p className="text-sm text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
};
