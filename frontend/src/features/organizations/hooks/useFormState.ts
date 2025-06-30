import { useState, useEffect } from 'react';

export function useFormState<T>(initialValues: T, currentValues?: T, resetOnValuesChange = true) {
    const [formData, setFormData] = useState<T>(currentValues || initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (currentValues && resetOnValuesChange) {
            setFormData(currentValues);
            setErrors({});
        }
    }, [currentValues, resetOnValuesChange]);

    const resetForm = () => {
        setFormData(initialValues);
        setErrors({});
    };

    const updateForm = (values: Partial<T>) => {
        setFormData(prev => ({ ...prev, ...values }));
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    return {
        formData,
        errors,
        setFormData,
        setErrors,
        resetForm,
        updateForm,
        handleInputChange
    };
}