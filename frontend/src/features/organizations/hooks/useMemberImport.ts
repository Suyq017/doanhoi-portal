import { useState, useCallback } from 'react';
import { organizationService } from '../../../shared/services/organizationService';
import { userService } from '../../../shared/services/userService';

export interface MemberImportData {
    row: number;
    studentCode: string;
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export interface MemberImportResult {
    success: number;
    failed: number;
    errors: Array<{ row: number; code: string; message: string }>;
}

interface UseMemberImportOptions {
    organizationId: string;
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

export const useMemberImport = ({
    organizationId,
    onSuccess,
    onError
}: UseMemberImportOptions) => {
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [previewData, setPreviewData] = useState<MemberImportData[]>([]);
    const [importResult, setImportResult] = useState<MemberImportResult | null>(null);
    const [showResults, setShowResults] = useState(false);

    /**
     * Validate user codes exist in the system
     */
    const validateUserCodes = useCallback(async (userCodes: string[]): Promise<MemberImportData[]> => {
        const validationResults: MemberImportData[] = [];

        for (let i = 0; i < userCodes.length; i++) {
            const code = userCodes[i];
            const row = i + 2; // Excel row (1 is header)
            const errors: string[] = [];
            const warnings: string[] = [];

            try {
                // Check if user exists
                const response = await userService.getUsers({
                    search: code,
                    limit: 1
                });

                const user = response.users.find(u => u.code === code);

                if (!user) {
                    errors.push(`Không tìm thấy người dùng với mã ${code}`);
                } else {
                    // Check if already a member (warning, not error)
                    try {
                        const members = await organizationService.getOrganizationMembers(
                            organizationId,
                            1,
                            1000
                        );

                        const isMember = members.members.some(m => m.user?.code === code);
                        if (isMember) {
                            warnings.push('Người dùng đã là thành viên của tổ chức');
                        }
                    } catch (err) {
                        // Ignore check membership errors
                    }
                }
            } catch (error) {
                errors.push('Lỗi khi kiểm tra người dùng');
            }

            validationResults.push({
                row,
                studentCode: code,
                isValid: errors.length === 0,
                errors,
                warnings
            });
        }

        return validationResults;
    }, [organizationId]);

    /**
     * Parse and validate Excel file
     */
    const parseAndValidate = useCallback(async (userCodes: string[]) => {
        setValidating(true);
        setPreviewData([]);

        try {
            const results = await validateUserCodes(userCodes);
            setPreviewData(results);
            return results;
        } catch (error: any) {
            if (onError) {
                onError(error.message || 'Lỗi khi validate dữ liệu');
            }
            throw error;
        } finally {
            setValidating(false);
        }
    }, [validateUserCodes, onError]);

    /**
     * Execute import with validated data
     */
    const executeImport = useCallback(async (validatedData: MemberImportData[]) => {
        setLoading(true);
        setImportResult(null);

        try {
            // Only import valid records
            const validCodes = validatedData
                .filter(d => d.isValid)
                .map(d => d.studentCode);

            if (validCodes.length === 0) {
                throw new Error('Không có dữ liệu hợp lệ để import');
            }

            // Call API to import members
            const response = await organizationService.bulkAddMembersByCode(
                organizationId,
                validCodes
            );

            const result: MemberImportResult = {
                success: response.success || 0,
                failed: response.failed || 0,
                errors: response.errors || []
            };

            setImportResult(result);
            setShowResults(true);

            // Show success message if at least one member was added
            if (result.success > 0) {
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                if (onError) {
                    onError('Import thất bại. Không có thành viên nào được thêm vào');
                }
            }

            return result;
        } catch (error: any) {
            console.error('Error importing members:', error);
            if (onError) {
                onError(error.message || 'Có lỗi xảy ra khi import thành viên');
            }
            throw error;
        } finally {
            setLoading(false);
        }
    }, [organizationId, onSuccess, onError]);

    /**
     * Reset all state
     */
    const reset = useCallback(() => {
        setPreviewData([]);
        setImportResult(null);
        setShowResults(false);
        setLoading(false);
        setValidating(false);
    }, []);

    return {
        loading,
        validating,
        previewData,
        importResult,
        showResults,
        parseAndValidate,
        executeImport,
        reset
    };
};
