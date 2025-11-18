import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedScreenProps {
    title?: string;
    message?: string;
    showBackButton?: boolean;
    onBackClick?: () => void;
    requiredPermissions?: string[];
}

/**
 * AccessDeniedScreen - Screen displayed when user lacks required permissions
 */
export const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({
    title,
    message,
    showBackButton = true,
    onBackClick,
    requiredPermissions = [],
}) => {
    const { t } = useTranslation(['auth', 'common']);
    const navigate = useNavigate();

    const handleBackClick = () => {
        if (onBackClick) {
            onBackClick();
        } else {
            navigate(-1);
        }
    };

    const getPermissionMessage = () => {
        if (requiredPermissions.length > 0) {
            return t('auth:errors.missingPermissions', {
                defaultValue: `Bạn cần quyền: ${requiredPermissions.join(', ')} để truy cập trang này.`,
                permissions: requiredPermissions.join(', ')
            });
        }
        return message || t('auth:errors.noPermissionToAccess', {
            defaultValue: 'Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.'
        });
    };

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md mx-auto px-4">
                <div className="mb-6">
                    <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {title || t('auth:errors.accessDenied', { defaultValue: 'Không có quyền truy cập' })}
                    </h3>          <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                        {getPermissionMessage()}
                    </p>
                </div>

                {showBackButton && (
                    <div className="space-y-3">
                        <button
                            onClick={handleBackClick}
                            className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {t('common:actions.goBack', { defaultValue: 'Quay lại' })}
                        </button>

                        <div>
                            <button
                                onClick={() => navigate('/portal')}
                                className="text-doan-600 hover:text-doan-700 dark:text-doan-400 dark:hover:text-doan-300 font-medium text-sm transition-colors"
                            >
                                {t('common:actions.goToHomepage', { defaultValue: 'Về trang chủ' })}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccessDeniedScreen;
