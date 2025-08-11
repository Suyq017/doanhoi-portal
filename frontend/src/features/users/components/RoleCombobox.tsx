import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Role {
    id: string;
    name: string;
    displayName: string;
    description?: string;
}

interface RoleComboboxProps {
    roles: Role[];
    selectedRoleId: string;
    onRoleSelect: (roleId: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}

const RoleCombobox: React.FC<RoleComboboxProps> = ({
    roles,
    selectedRoleId,
    onRoleSelect,
    disabled = false,
    placeholder,
    className = '',
}) => {
    const { t } = useTranslation(['users']);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const comboboxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedRole = roles.find(role => role.id === selectedRoleId);

    // Filter roles based on search term
    const filteredRoles = roles.filter(role => {
        const searchLower = searchTerm.toLowerCase();
        return (
            role.displayName.toLowerCase().includes(searchLower) ||
            role.name.toLowerCase().includes(searchLower)
        );
    });

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRoleSelect = (roleId: string) => {
        onRoleSelect(roleId);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleInputClick = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
    };

    // Get dropdown position
    const getDropdownPosition = () => {
        if (!comboboxRef.current) return { top: 0, left: 0, width: 0 };

        const rect = comboboxRef.current.getBoundingClientRect();
        return {
            top: rect.bottom + window.scrollY + 2,
            left: rect.left + window.scrollX,
            width: rect.width,
            maxHeight: 200,
        };
    };

    const position = getDropdownPosition();
    const displayValue = selectedRole ? selectedRole.displayName : '';

    return (
        <div className={`relative ${className}`} ref={comboboxRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={isOpen ? searchTerm : displayValue}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    placeholder={placeholder || t('users:grantRoles.selectRole')}
                    disabled={disabled}
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-doan-500 focus:border-doan-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    autoComplete="off"
                />

                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                            }`}
                    />
                </div>
            </div>

            {/* Dropdown Portal */}
            {isOpen && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: position.top,
                        left: position.left,
                        width: position.width,
                        maxHeight: position.maxHeight,
                        zIndex: 10000,
                    }}
                    className="bg-white border border-gray-300 rounded-md shadow-lg overflow-auto"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {filteredRoles.length > 0 ? (
                        <ul className="py-1">
                            {/* Empty option */}
                            <li>
                                <button
                                    type="button"
                                    onClick={() => handleRoleSelect('')}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors text-gray-500"
                                >
                                    {placeholder || t('users:grantRoles.selectRole')}
                                </button>
                            </li>
                            {filteredRoles.map((role) => (
                                <li key={role.id}>
                                    <button
                                        type="button"
                                        onClick={() => handleRoleSelect(role.id)}
                                        className={`w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors ${role.id === selectedRoleId
                                                ? 'bg-doan-50 text-doan-700'
                                                : 'text-gray-900'
                                            }`}
                                    >
                                        <div className="font-medium">{role.displayName}</div>
                                        {role.description && (
                                            <div className="text-xs text-gray-500">{role.description}</div>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-3 py-2 text-center text-gray-500">
                            <Search className="w-4 h-4 mx-auto mb-1" />
                            {t('users:labels.noRolesFound', { defaultValue: 'Không tìm thấy vai trò' })}
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default RoleCombobox;
