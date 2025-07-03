import { ImportModalConfig } from '../../../shared';
import { organizationService } from '../../../shared/services';
import { Organization } from '../../../shared/types/organization';

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

export const createOrganizationImportConfig = (level: 2 | 3): ImportModalConfig<any> => {
    return {
        templateUrl: organizationService.getTemplate(`${level}`),
        templateFileName: `organization_level${level}_template.xlsx`,
        acceptedFileTypes: ['.xlsx', '.xls'],
        maxFileSize: 5 * 1024 * 1024, // 5MB

        // Use server-side processing
        processingMode: 'server',
        uploadFile: async (file: File) => {
            const result = await organizationService.uploadImportFile(file, /* organizationId */ '', level);
            // Add missing properties to match ServerImportSession
            return {
                sessionId: result.sessionId,
                previewData: result.previewData,
                fileName: file.name,
                totalRows: result.previewData?.length ?? 0,
                message: '',
            };
        },

        // Columns khác nhau theo level
        columns: level === 2 ? [
            { key: 'studentCode', label: 'Mã số sinh viên', required: true, type: 'text' as const },
            { key: 'classOrUnitCode', label: 'Mã lớp/đơn vị', required: true, type: 'text' as const }
        ] : [
            { key: 'studentCode', label: 'Mã số sinh viên', required: true, type: 'text' as const }
        ],

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
