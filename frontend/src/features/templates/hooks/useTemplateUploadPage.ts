import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { uploadTemplate, parseTemplateFile } from '@/shared/services/template.service';
import { useToast } from '@/shared/hooks/useToast';
import type { UseTemplateUploadPageReturn, UploadState } from '../types';

export function useTemplateUploadPage(): UseTemplateUploadPageReturn {
    const { t } = useTranslation(['templates', 'common']);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toasts, showError, hideToast } = useToast();

    // State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [step, setStep] = useState<'upload' | 'info'>('upload');
    const [detectedFields, setDetectedFields] = useState<string[]>([]);
    const [placeholderCounts, setPlaceholderCounts] = useState<Record<string, number>>({});
    const [isParsing, setIsParsing] = useState(false);

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: (data: { file: File; name: string; description?: string }) =>
            uploadTemplate(data.file, { name: data.name, description: data.description }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            queryClient.invalidateQueries({ queryKey: ['templates-active'] });
            navigate('/portal/admin/templates', {
                state: {
                    showSuccessToast: true,
                    message: t('templates:messages.uploadSuccess'),
                },
                replace: true,
            });
        },
        onError: (error: any) => {
            showError(error?.response?.data?.message || t('common:messages.error.upload'));
        },
    });

    const handleFileChange = (selectedFile: File) => {
        if (!selectedFile.name.endsWith('.docx')) {
            showError(t('templates:upload.onlyDocx'));
            return;
        }
        setFile(selectedFile);

        // Parse file to detect fields
        setIsParsing(true);
        parseTemplateFile(selectedFile)
            .then((result) => {
                setDetectedFields(result.placeholders || []);
                setPlaceholderCounts(result.placeholderCounts || {});
                setIsParsing(false);
                setStep('info');
            })
            .catch((error) => {
                console.error('Parse error:', error);
                setDetectedFields([]);
                setPlaceholderCounts({});
                setIsParsing(false);
                setStep('info');
            });
    };

    const handleCancelFile = () => {
        setFile(null);
        setName('');
        setDescription('');
        setDetectedFields([]);
        setPlaceholderCounts({});
        setStep('upload');
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            handleFileChange(files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!file) {
            showError(t('templates:upload.selectFile'));
            return;
        }

        if (!name.trim()) {
            showError(t('templates:upload.enterName'));
            return;
        }

        uploadMutation.mutate({
            file,
            name: name.trim(),
            description: description.trim() || undefined,
        });
    };

    const state: UploadState = {
        name,
        description,
        file,
        step,
        detectedFields,
        placeholderCounts,
        isParsing,
        dragActive,
    };

    return {
        state,
        setName,
        setDescription,
        handleFileChange,
        handleCancelFile,
        handleSubmit,
        handleDrag,
        handleDrop,
        isUploading: uploadMutation.isPending,
        toasts,
        hideToast,
    };
}
