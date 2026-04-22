import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getTemplateById, configureFields, updateTemplate } from '@/shared/services/template.service';
import { FieldType, TemplateStatus, type ConfigureFieldDto } from '@/shared/types/template.types';
import { useToast } from '@/shared/hooks/useToast';
import type { UseTemplateConfigPageReturn, DateMappingFields, StatusOption } from '../types';

export function useTemplateConfigPage(): UseTemplateConfigPageReturn {
    const { t } = useTranslation(['templates', 'common']);
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toasts, showSuccess, showError, hideToast } = useToast();

    // State
    const [fields, setFields] = useState<ConfigureFieldDto[]>([]);
    const [selectedFields, setSelectedFields] = useState<Set<number>>(new Set());
    const [showDateMappingDialog, setShowDateMappingDialog] = useState(false);
    const [dateMappingFields, setDateMappingFields] = useState<DateMappingFields>({
        dayFieldIndex: null,
        monthFieldIndex: null,
        yearFieldIndex: null,
    });
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');
    const [templateStatus, setTemplateStatus] = useState<TemplateStatus>(TemplateStatus.PROCESSING);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setStatusDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Query
    const { data: template, isLoading } = useQuery({
        queryKey: ['template', id],
        queryFn: () => getTemplateById(id!),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });

    // Initialize fields and template info when template loads
    useEffect(() => {
        if (template) {
            setTemplateName(template.name);
            setTemplateDescription(template.description || '');
            setTemplateStatus(template.status);

            if (template.fields) {
                setFields(
                    template.fields.map((f, index) => ({
                        fieldName: f.fieldName,
                        displayName: f.displayName,
                        fieldType: f.fieldType,
                        position: f.position || index,
                        validationRules: f.validationRules || {},
                        options: f.options || [],
                        placeholder: f.placeholder,
                        helpText: f.helpText,
                        defaultValue: f.defaultValue,
                        isVisible: f.isVisible,
                        datePartsMapping: f.datePartsMapping,
                    }))
                );
            }
        }
    }, [template]);

    // Status options
    const statusOptions: StatusOption[] = [
        { value: 'active', label: t('templates:status.active') },
        { value: 'inactive', label: t('templates:status.inactive') },
        { value: 'processing', label: t('templates:status.processing') },
        { value: 'error', label: t('templates:status.error') },
    ];

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async (data: { fields: ConfigureFieldDto[] }) => {
            if (!id) {
                throw new Error('Template ID is missing');
            }

            let finalStatus: TemplateStatus = templateStatus;
            if (!templateStatus || templateStatus === template?.status) {
                if (template?.status === TemplateStatus.PROCESSING) {
                    finalStatus = TemplateStatus.ACTIVE;
                } else {
                    finalStatus = template?.status || TemplateStatus.ACTIVE;
                }
            }

            await updateTemplate(id, {
                name: templateName,
                description: templateDescription,
                status: finalStatus,
            });
            return configureFields(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['template', id] });
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            queryClient.invalidateQueries({ queryKey: ['templates-active'] });
            navigate('/portal/admin/templates', {
                state: {
                    successMessage: t('templates:messages.configSaved'),
                },
            });
        },
        onError: (error: any) => {
            showError(error?.response?.data?.message || t('common:messages.error.save'));
        },
    });

    const updateField = (index: number, updates: Partial<ConfigureFieldDto>) => {
        setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
    };

    const isFieldMapped = (fieldName: string): boolean => {
        return fields.some(
            (f) =>
                f.fieldType === FieldType.DATE &&
                f.datePartsMapping &&
                (f.datePartsMapping.dayField === fieldName ||
                    f.datePartsMapping.monthField === fieldName ||
                    f.datePartsMapping.yearField === fieldName)
        );
    };

    const toggleFieldSelection = (index: number) => {
        if (isFieldMapped(fields[index].fieldName)) {
            return;
        }

        setSelectedFields((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const mergeFieldsToDate = () => {
        if (selectedFields.size < 2) {
            showError(t('templates:messages.selectAtLeastTwo'));
            return;
        }

        if (selectedFields.size === 3) {
            setShowDateMappingDialog(true);
        } else {
            performMerge(null);
        }
    };

    const performMerge = (mapping: { dayFieldIndex: number; monthFieldIndex: number; yearFieldIndex: number } | null) => {
        const selectedIndices = Array.from(selectedFields).sort((a, b) => a - b);
        const selectedFieldNames = selectedIndices.map((i) => fields[i].fieldName);

        const baseName =
            selectedFieldNames[0]
                .replace(/_?(day|month|year|ngay|thang|nam)$/i, '')
                .replace(/^(day|month|year|ngay|thang|nam)_?/i, '') || 'date';

        const newField: ConfigureFieldDto = {
            fieldName: baseName,
            displayName: `${baseName} (${t('templates:config.merged')})`,
            fieldType: FieldType.DATE,
            position: fields[selectedIndices[0]].position,
            validationRules: { required: true },
            options: [],
            isVisible: true,
            datePartsMapping: mapping
                ? {
                    dayField: fields[mapping.dayFieldIndex].fieldName,
                    monthField: fields[mapping.monthFieldIndex].fieldName,
                    yearField: fields[mapping.yearFieldIndex].fieldName,
                }
                : undefined,
        };

        const newFields = fields.filter((_, i) => !selectedFields.has(i));
        newFields.splice(selectedIndices[0], 0, newField);

        setFields(newFields);
        setSelectedFields(new Set());
        setShowDateMappingDialog(false);
        setDateMappingFields({ dayFieldIndex: null, monthFieldIndex: null, yearFieldIndex: null });
        showSuccess(t('templates:messages.fieldsMerged', { count: selectedFields.size }));
    };

    const unmergeField = (index: number) => {
        const field = fields[index];

        if (field.fieldType !== FieldType.DATE || !field.datePartsMapping) {
            showError(t('templates:messages.notMergedDate'));
            return;
        }

        const { dayField, monthField, yearField } = field.datePartsMapping;

        const newFields: ConfigureFieldDto[] = [
            {
                fieldName: dayField,
                displayName: `${dayField} (${t('templates:config.day')})`,
                fieldType: FieldType.TEXT,
                position: field.position,
                validationRules: { required: field.validationRules?.required || false },
                options: [],
                isVisible: true,
            },
            {
                fieldName: monthField,
                displayName: `${monthField} (${t('templates:config.month')})`,
                fieldType: FieldType.TEXT,
                position: field.position + 1,
                validationRules: { required: field.validationRules?.required || false },
                options: [],
                isVisible: true,
            },
            {
                fieldName: yearField,
                displayName: `${yearField} (${t('templates:config.year')})`,
                fieldType: FieldType.TEXT,
                position: field.position + 2,
                validationRules: { required: field.validationRules?.required || false },
                options: [],
                isVisible: true,
            },
        ];

        const updatedFields = [...fields];
        updatedFields.splice(index, 1, ...newFields);

        setFields(updatedFields);
        showSuccess(t('templates:messages.dateUnmerged'));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate({ fields });
    };

    return {
        // Data
        template,
        isLoading,

        // State
        state: {
            fields,
            selectedFields,
            showDateMappingDialog,
            dateMappingFields,
            templateName,
            templateDescription,
            templateStatus,
            statusDropdownOpen,
        },
        statusOptions,

        // Actions
        setTemplateName,
        setTemplateDescription,
        setTemplateStatus,
        setStatusDropdownOpen,
        updateField,
        toggleFieldSelection,
        mergeFieldsToDate,
        performMerge,
        unmergeField,
        setShowDateMappingDialog,
        setDateMappingFields,
        handleSubmit,

        // Mutation
        isSaving: saveMutation.isPending,

        // Helper
        isFieldMapped,

        // Toast
        toasts,
        hideToast,
    };
}
