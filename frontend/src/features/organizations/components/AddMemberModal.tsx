import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { organizationService } from '../../../shared/services/organizationService';
import { userService } from '../../../shared/services/userService';
import { User as UserType } from '../../../shared/types/user';


interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    organizationCode: string;
    organizationType?: string;
    organizationName?: string;
    onSuccess: (userCode: string) => void;
    onError?: (error: string) => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
    isOpen,
    onClose,
    organizationCode,
    organizationName,
    onSuccess,
    onError
}) => {
    const { t } = useTranslation(['organizations', 'common', 'users']);
    const [userCode, setUserCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null); const [searchResults, setSearchResults] = useState<UserType[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);    // Update dropdown position when showing
    const updateDropdownPosition = useCallback(() => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, []);

    // Debounced search function
    const searchUsers = useCallback(async (searchTerm: string) => {
        if (searchTerm.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        setIsSearching(true);
        try {
            const response = await userService.getUsers({
                search: searchTerm,
                limit: 10
            });
            setSearchResults(response.users);
            updateDropdownPosition();
            setShowDropdown(true);
        } catch (err) {
            console.error('Error searching users:', err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [updateDropdownPosition]);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (userCode && !selectedUser) {
                searchUsers(userCode);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [userCode, selectedUser, searchUsers]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []); const validateForm = (): boolean => {
        if (!userCode.trim()) {
            const errorMsg = t('common:validation.required', { field: t('users:fields.code') });
            setError(errorMsg);
            if (onError) onError(errorMsg);
            return false;
        }
        return true;
    };

    const handleUserSelect = (user: UserType) => {
        setUserCode(user.code);
        setSelectedUser(user);
        setShowDropdown(false);
        setError(null);
    };

    const handleInputChange = (value: string) => {
        setUserCode(value);
        setSelectedUser(null);
        if (error) setError(null);

        if (value.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Gọi API để thêm thành viên vào tổ chức
            await organizationService.addMemberBySimpleCode(
                organizationCode,
                userCode
            );

            onSuccess(t('common:messages.success.add'));
            setUserCode('');
            onClose();
        } catch (err: any) {
            const status = err?.response?.status;
            const errorData = err?.response?.data;

            console.error('Error adding member:', { status, errorData, err });

            if (status === 400) {
                const errorMessage = errorData?.message || t('users:messages.userAlreadyExists');
                setError(errorMessage);
                if (onError) {
                    onError(errorMessage);
                }
            } else if (status === 404) {
                const errorMessage = errorData?.message || t('users:messages.noUsers');
                setError(errorMessage);
                if (onError) {
                    onError(errorMessage);
                }
            } else {
                // Handle other errors
                const errorMessage = errorData?.message || err?.message || t('common:messages.error.unknown');
                setError(errorMessage);
                if (onError) {
                    onError(errorMessage);
                }
            }
        } finally {
            setLoading(false);
        }
    }; const handleClose = () => {
        setUserCode('');
        setSelectedUser(null);
        setSearchResults([]);
        setShowDropdown(false);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] px-4"
            style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {t('organizations:tree.addMember')}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        disabled={loading}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Organization info */}
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('organizations:tree.addMemberTo')} :  {organizationName}
                        </p>

                    </div>                    {/* User Code with Autocomplete */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('users:fields.code')} *
                        </label>
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={userCode}
                                onChange={(e) => handleInputChange(e.target.value)} onFocus={() => {
                                    if (searchResults.length > 0) {
                                        updateDropdownPosition();
                                        setShowDropdown(true);
                                    }
                                }}
                                className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${error
                                    ? 'border-red-500 dark:border-red-500'
                                    : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                placeholder={t('users:placeholders.code')}
                                disabled={loading}
                                autoComplete="off"
                            />
                            {/* Loading indicator */}
                            {isSearching && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-doan-500"></div>
                                </div>
                            )}
                            {/* Selected user indicator */}
                            {selectedUser && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <Check className="w-4 h-4 text-green-500" />
                                </div>
                            )}
                        </div>                        {/* Dropdown with search results */}
                        {showDropdown && searchResults.length > 0 && createPortal(
                            <div
                                ref={dropdownRef}
                                className="fixed z-[10000] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
                                style={{
                                    top: dropdownPosition.top,
                                    left: dropdownPosition.left,
                                    width: dropdownPosition.width
                                }}
                            >
                                {searchResults.map((user) => (
                                    <div
                                        key={user.id}
                                        onClick={() => handleUserSelect(user)}
                                        className="px-3 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                                    >                                        <div className="flex items-start space-x-3">
                                            <User className="w-5 h-5 text-gray-400 mt-0.5" /><div className="flex-1">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {user.code} - {user.givenName} {user.familyName}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2 mt-1">
                                                    <span>{user.userType === 'student' ? 'Sinh viên' : 'Cán bộ'}</span>
                                                    <span>•</span>
                                                    <span>
                                                        {user.membershipStatus === 'doan_vien' && 'Đoàn viên'}
                                                        {user.membershipStatus === 'hoi_vien' && 'Hội viên'}
                                                        {user.membershipStatus === 'both' && 'Đoàn viên & Hội viên'}
                                                        {user.membershipStatus === 'none' && 'Chưa tham gia'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>,
                            document.body
                        )}{/* Selected user info */}
                        {selectedUser && (
                            <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                <div className="flex items-start space-x-2">
                                    <Check className="w-5 h-5 text-green-500 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-green-800 dark:text-green-200">
                                            {selectedUser.givenName} {selectedUser.familyName}
                                        </div>
                                        <div className="text-xs text-green-600 dark:text-green-300 mt-1 space-y-1">
                                            <div>Mã số: {selectedUser.code}</div>
                                            <div className="flex items-center space-x-2">
                                                <span>{selectedUser.userType === 'student' ? 'Sinh viên' : 'Cán bộ'}</span>
                                                <span>•</span>
                                                <span>
                                                    {selectedUser.membershipStatus === 'doan_vien' && 'Đoàn viên'}
                                                    {selectedUser.membershipStatus === 'hoi_vien' && 'Hội viên'}
                                                    {selectedUser.membershipStatus === 'both' && 'Đoàn viên & Hội viên'}
                                                    {selectedUser.membershipStatus === 'none' && 'Chưa tham gia'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                {error}
                            </p>
                        )}
                    </div>



                    {/* Buttons */}
                    <div className="flex items-center justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            disabled={loading}
                        >
                            {t('common:actions.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-doan-600 text-white rounded-md hover:bg-doan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                        >
                            {loading && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            )}
                            <span>{loading ? t('common:states.processing') : t('common:actions.add')}</span>
                        </button>
                    </div>
                </form>
            </div>

        </div>
    );

    return createPortal(modalContent, document.body);
};

export default AddMemberModal;