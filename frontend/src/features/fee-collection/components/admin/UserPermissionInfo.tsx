import React from 'react';
import { Shield, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/shared/hooks/usePermissions';

const UserPermissionInfo: React.FC = () => {
    const { t } = useTranslation('userPermissions');
    const permissions = usePermissions();

    // Only show if user has limited access (not super admin) and has some payment permissions
    if (permissions.isSuperAdmin() || !permissions.canAccessPaymentCampaigns()) {
        return null;
    }

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                        {t('userPermissions')}
                    </h3>

                    <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                        <div>
                            <span className="font-medium">{t('title')}:</span>
                            <ul className="list-disc list-inside ml-4 mt-1">
                                {permissions.canCreatePaymentCampaign() && <li>{t('permissions.create')}</li>}
                                {permissions.canViewPaymentCampaignDetails() && <li>{t('permissions.viewDetails')}</li>}
                                {permissions.canUpdatePaymentCampaign() && <li>{t('permissions.update')}</li>}
                                {permissions.canDeletePaymentCampaign() && <li>{t('permissions.delete')}</li>}
                                {permissions.canViewPaymentReports() && <li>Xem báo cáo đóng phí</li>}
                                {permissions.canExportPaymentData() && <li>Xuất dữ liệu đóng phí</li>}
                            </ul>
                        </div>
                        <div>
                            <span className="font-medium">{t('organizationAccess')}</span>
                            <div className="mt-1">
                                <span className="text-blue-600 dark:text-blue-400">
                                    Được xác định dựa trên phân quyền của bạn
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-3">
                            <Shield className="w-3 h-3" />
                            <span>{t('restriction')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserPermissionInfo;
