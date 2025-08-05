import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Organization {
    id: string;
    name: string;
    code: string;
    parentId?: string;
    level: number;
}

interface OrganizationRoleComboboxProps {
    organizations: Organization[];
    selectedOrganizationId?: string;
    onOrganizationSelect: (organizationId?: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    allowEmpty?: boolean;
}

const OrganizationRoleCombobox: React.FC<OrganizationRoleComboboxProps> = ({
    organizations,
    selectedOrganizationId,
    onOrganizationSelect,
    disabled = false,
    placeholder,
    className = '',
    allowEmpty = true,
}) => {
    const { t } = useTranslation(['users']);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const comboboxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOrganization = organizations.find(org => org.id === selectedOrganizationId);

    // Filter organizations based on search term
    const filteredOrganizations = organizations.filter(org => {
        const searchLower = searchTerm.toLowerCase();
        return (
            org.name.toLowerCase().includes(searchLower) ||
            org.code.toLowerCase().includes(searchLower)
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
    }, []); const handleOrganizationSelect = (organizationId?: string) => {
        onOrganizationSelect(organizationId);
        setIsOpen(false);
        setSearchTerm('');
    }; const handleInputClick = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
    };    // Get dropdown position - no longer needed for absolute positioning
    // const getDropdownPosition = () => {
    //     if (!comboboxRef.current) return { top: 0, left: 0, width: 0 };

    //     const rect = comboboxRef.current.getBoundingClientRect();
    //     return {
    //         top: rect.bottom + window.scrollY + 2,
    //         left: rect.left + window.scrollX,
    //         width: rect.width,
    //         maxHeight: 200,
    //     };
    // };

    // const position = getDropdownPosition();
    const displayValue = selectedOrganization ? selectedOrganization.name : '';

    return (
        <div className={`relative ${className}`} ref={comboboxRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={isOpen ? searchTerm : displayValue}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    placeholder={placeholder || t('users:grantRoles.selectOrganization')}
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
            </div>            {/* Dropdown Portal */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg overflow-auto z-50 max-h-60">
                    {filteredOrganizations.length > 0 || allowEmpty ? (
                        <ul className="py-1">
                            {/* Empty option for global role */}
                            {allowEmpty && (
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleOrganizationSelect(undefined)}
                                        className={`w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors ${!selectedOrganizationId
                                            ? 'bg-doan-50 text-doan-700'
                                            : 'text-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-center">
                                            <Building className="w-4 h-4 mr-2 text-gray-400" />
                                            <span className="italic">{t('users:grantRoles.globalRole')}</span>
                                        </div>
                                    </button>
                                </li>
                            )}
                            {filteredOrganizations.map((org) => (
                                <li key={org.id}>
                                    <button
                                        type="button"
                                        onClick={() => handleOrganizationSelect(org.id)}
                                        className={`w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors ${org.id === selectedOrganizationId
                                            ? 'bg-doan-50 text-doan-700'
                                            : 'text-gray-900'
                                            }`}
                                    >
                                        <div className="flex items-center">
                                            <Building className="w-4 h-4 mr-2 text-gray-400" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{org.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{org.code}</div>
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-3 py-2 text-center text-gray-500">
                            <Search className="w-4 h-4 mx-auto mb-1" />
                            Không tìm thấy tổ chức
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OrganizationRoleCombobox;
