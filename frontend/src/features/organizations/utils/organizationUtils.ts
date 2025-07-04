import { ImportModalConfig, ImportModal } from '../../../shared';
import { organizationService } from '../../../shared/services';
import { Organization } from '../../../shared/types/organization';
import { useImportConfig } from "../../../shared";
import { organizationColumns } from "../../../shared/utils/importColumns";
import { useTranslation } from 'react-i18next';

interface UseOrganizationImportConfigOptions {
    level: 2 | 3;
    organizationId?: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const toggleExpanded = (id: string, orgs: Organization[]): Organization[] => {
    return orgs.map(org => {
        if (org.id === id) {
            return { ...org, isExpanded: !org.isExpanded };
        }
        if (org.children) {
            return { ...org, children: toggleExpanded(id, org.children) };
        }
        return org;
    });
};

export const createOrganizationPath = (type: string, code: string): string => {
    return `/organizations/${type}/${code}`;
};

export const createOrganizationSubPath = (
    type: string,
    code: string,
    childType: string,
    childCode: string
): string => {
    return `/organizations/${type}/${code}/${childType}/${childCode}`;
};

export const parseOrganizationPath = (path: string): {
    type?: string;
    code?: string;
    childType?: string;
    childCode?: string;
} => {
    const segments = path.split('/').filter(Boolean);

    if (segments.length < 3) return {};

    if (segments.length === 3) {
        return {
            type: segments[1],
            code: segments[2]
        };
    }

    if (segments.length === 5) {
        return {
            type: segments[1],
            code: segments[2],
            childType: segments[3],
            childCode: segments[4]
        };
    }

    return {};
};

export const getOrgTypeText = (type: string): string => {
    const typeMap: { [key: string]: string } = {
        'doan_truong': 'Đoàn Trường',
        'doan_co_so': 'Đoàn Cơ sở',
        'chi_doan': 'Chi Đoàn',
        'hoi_sinh_vien_truong': 'Hội SV Trường',
        'lien_chi_hoi': 'Liên Chi Hội',
        'chi_hoi': 'Chi Hội',
        'clb_truong': 'CLB Trường',
        'clb_khoa': 'CLB Khoa'
    };
    return typeMap[type] || type;
};

export const getOrgTypeColor = (type: string): string => {
    if (type.includes('doan')) {
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700';
    } else if (type.includes('hoi') || type.includes('clb')) {
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
};

export const createOrganizationImportConfig = (level: any, organizationId?: string): ImportModalConfig<any> => {
    return {
        templateUrl: organizationService.getTemplateByLevel(level),
        templateFileName: `organization_level${level}_template.xlsx`,
        acceptedFileTypes: ['.xlsx', '.xls'],
        maxFileSize: 5 * 1024 * 1024, // 5MB

        // Use server-side processing
        processingMode: 'server',
        uploadFile: async (file: File) => {
            const result = await organizationService.uploadImportFile(file, organizationId, level);
            // Add missing properties to match ServerImportSession
            return {
                sessionId: result.sessionId,
                previewData: result.previewData,
                fileName: file.name,
                totalRows: result.previewData?.length ?? 0,
                message: '',
            };

        },

        validateServerData: async (sessionId: string) => {
            try {
                const result = await organizationService.validateImportData(sessionId);

                let mappedPreviewData: any[] = [];

                if ((result as any).validationResults) {
                    // ...existing code for Users service...
                } else if (result.previewData) {

                    // Format từ Organizations service (direct preview data)
                    mappedPreviewData = result.previewData.map((item: any) => ({
                        ...item,
                        _rowIndex: item.row - 2, // Excel row to 0-based index
                        _hasError: item.hasErrors,
                        _hasWarning: item.hasWarnings,
                        _errors: item.errors || [],
                        _warnings: item.warnings || [],
                        // Thêm trường để hiển thị thông báo warning rõ ràng cho từng dòng
                        warningMessages: [...(item.warnings || []), ...(item.errors || [])].map((entry: any) => {
                            const msg = entry.message || entry;
                            // if (msg.includes('already a member')) {
                            //     return 'Người dùng đã tồn tại trong tổ chức';
                            // }
                            if (msg.includes('not found')) {
                                return 'Không tìm thấy người dùng';
                            }
                            return msg;
                        })
                    }));
                    console.log('Mapped preview data:', mappedPreviewData);
                }
                console.log('Validation result:', result);
                return {
                    sessionId: result.sessionId,
                    isValid: result.isValid,
                    summary: {
                        total: result.summary.total,
                        valid: result.summary.valid,
                        invalid: result.summary.invalid,
                        duplicates: result.summary.duplicates || 0,
                        conflicts: result.summary.conflicts || 0
                    },
                    errors: result.errors || [],
                    warnings: result.warnings || [],
                    previewData: mappedPreviewData
                };
            } catch (error) {
                throw error;
            }
        },
        executeServerImport: async (sessionId: string, importOptions?: any) => {
            try {
                const result = await organizationService.executeImport(sessionId, importOptions);
                // setIsImporting(false);

                return {
                    sessionId: result.sessionId,
                    success: result.success,
                    importedCount: result.importedCount,
                    skippedCount: result.skippedCount,
                    failedCount: result.failedCount,
                    errors: result.errors || [],
                    message: result.message
                };
            } catch (error) {
                // setIsImporting(false);
                throw error;
            }
        },

        getImportStatus: organizationService.getImportStatus.bind(organizationService),

        // Columns khác nhau theo level
        columns: organizationColumns(level),

        entityName: 'organizations',
        onSuccess: () => {
            // Có thể truyền callback từ ngoài vào nếu cần
            console.log('Import success');
        },
        onError: (error) => {
            console.error('Import error:', error);
        }
    };
};

// export const useOrganizationImportConfig = ({
//     level,
//     organizationId = '',
//     onSuccess,
//     onError
// }: UseOrganizationImportConfigOptions) => {
//     const { t } = useTranslation(['organizations', 'common']);

//     return useImportConfig({
//         entityName: 'organizations',
//         entityService: {
//             getTemplate: () => organizationService.getTemplateByLevel(level),
//             uploadImportFile: (file: File) => organizationService.uploadImportFile(file, organizationId, level),
//             validateImportData: organizationService.validateImportData.bind(organizationService),
//             executeImport: organizationService.executeImport.bind(organizationService),
//             getImportStatus: organizationService.getImportStatus.bind(organizationService),
//         },
//         columns: organizationColumns(level),
//         templateFileName: `organization_level${level}_template.xlsx`,
//         onSuccess: onSuccess || (() => {
//             console.log('Organization import success');
//         }),
//         onError: onError || ((error: Error) => {
//             console.error('Organization import error:', error);
//         })
//     });
// };