import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Trash2, Shield, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface Permission {
    id: string;
    name: string;
    description?: string;
    category?: string;
}

export interface Organization {
    id: string;
    name: string;
    code: string;
    parentId?: string;
    level?: number;
}

export interface PermissionAssignment {
    id: string;
    permissionId: string;
    organizationId?: string;
    isGlobal: boolean;
}

interface PermissionsOrganizationRowProps {
    assignment: PermissionAssignment;
    permissions: Permission[];
    organizations: Organization[];
    onUpdate: (updates: Partial<PermissionAssignment>) => void;
    onRemove: () => void;
    canRemove: boolean;
    disabled?: boolean;
    className?: string;
}

interface ComboboxProps {
    value: string;
    onChange: (value: string) => void;
    options: Array<{ id: string; name: string; description?: string }>;
    placeholder: string;
    disabled?: boolean;
    icon: React.ReactNode;
    allowEmpty?: boolean;
    emptyLabel?: string;
}

const Combobox: React.FC<ComboboxProps> = ({
    value,
    onChange,
    options,
    placeholder,
    disabled = false,
    icon,
    allowEmpty = false,
    emptyLabel = "Không chọn",
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const comboboxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.id === value);

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Add empty option if allowed
    const finalOptions = allowEmpty
        ? [{ id: '', name: emptyLabel }, ...filteredOptions]
        : filteredOptions;
    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
            }
        };

        // Use capture phase to ensure this runs before other event handlers
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else {
                    setHighlightedIndex(prev =>
                        prev < finalOptions.length - 1 ? prev + 1 : 0
                    );
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (isOpen) {
                    setHighlightedIndex(prev =>
                        prev > 0 ? prev - 1 : finalOptions.length - 1
                    );
                }
                break;

            case 'Enter':
                e.preventDefault();
                if (isOpen && highlightedIndex >= 0 && finalOptions[highlightedIndex]) {
                    handleOptionSelect(finalOptions[highlightedIndex].id);
                }
                break;

            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
                break;
        }
    }; const handleOptionSelect = (optionId: string) => {
        console.log('handleOptionSelect called with:', optionId);
        onChange(optionId);
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);

        // Focus back to input after selection
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.blur();
            }
        }, 0);
    };

    const handleInputClick = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
        setHighlightedIndex(-1);
    };

    const handleClear = () => {
        if (allowEmpty) {
            onChange('');
        }
    };
    // Get dropdown position
    const getDropdownPosition = () => {
        if (!comboboxRef.current) return { top: 0, left: 0, width: 0 };

        const rect = comboboxRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Determine if dropdown should appear above or below
        const showAbove = spaceBelow < 200 && spaceAbove > spaceBelow;

        return {
            top: showAbove ? rect.top + window.scrollY - 200 : rect.bottom + window.scrollY + 2,
            left: rect.left + window.scrollX,
            width: rect.width,
            maxHeight: showAbove ? Math.min(spaceAbove - 10, 200) : Math.min(spaceBelow - 10, 200),
        };
    };

    const position = getDropdownPosition();
    const displayValue = isOpen ? searchTerm : (selectedOption?.name || '');

    return (
        <div className="relative flex-1" ref={comboboxRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={displayValue}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full px-3 py-2 pl-10 pr-8 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-doan-500 focus:border-doan-500 transition-colors border-gray-300 dark:border-gray-600 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                    autoComplete="off"
                />

                {/* Left icon */}
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    {icon}
                </div>

                {/* Right side icons */}
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">          {value && allowEmpty && !disabled && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleClear();
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        type="button"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
                    <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                            }`}
                    />
                </div>
            </div>

            {/* Dropdown Portal */}
            {isOpen && createPortal(
                <div style={{
                    position: 'fixed',
                    top: position.top,
                    left: position.left,
                    width: position.width,
                    maxHeight: position.maxHeight,
                    zIndex: 10000,
                }}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg overflow-auto pointer-events-auto"
                >
                    {finalOptions.length > 0 ? (
                        <ul className="py-1">
                            {finalOptions.map((option, index) => (
                                <li key={option.id || 'empty'}>                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('Option clicked:', option.id, option.name);
                                        handleOptionSelect(option.id);
                                    }}
                                    className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${index === highlightedIndex
                                            ? 'bg-doan-50 dark:bg-doan-900/20 text-doan-700 dark:text-doan-300'
                                            : 'text-gray-900 dark:text-white'
                                        } ${option.id === '' ? 'italic text-gray-500 dark:text-gray-400' : ''}`}
                                >
                                    <div className="flex items-center">
                                        <div className="w-4 h-4 mr-2">{icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">
                                                {option.name}
                                            </div>
                                            {option.description && (
                                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                    {option.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">
                            Không tìm thấy kết quả
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

const PermissionsOrganizationRow: React.FC<PermissionsOrganizationRowProps> = ({
    assignment,
    permissions,
    organizations,
    onUpdate,
    onRemove,
    canRemove,
    disabled = false,
    className = '',
}) => {
    const { t } = useTranslation(['users']);

    const handlePermissionChange = (permissionId: string) => {
        onUpdate({ permissionId });
    };

    const handleOrganizationChange = (organizationId: string) => {
        onUpdate({
            organizationId: organizationId || undefined,
            isGlobal: !organizationId
        });
    };

    return (
        <div className={`flex items-center space-x-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50 ${className}`}>
            {/* Permission Combobox */}
            <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('users:grantPermissions.permissions')} *
                </label>
                <Combobox
                    value={assignment.permissionId}
                    onChange={handlePermissionChange}
                    options={permissions.map(p => ({
                        id: p.id,
                        name: p.name,
                        description: p.description
                    }))}
                    placeholder={t('users:grantPermissions.selectPermission')}
                    disabled={disabled}
                    icon={<Shield className="w-4 h-4 text-gray-400" />}
                />
            </div>

            {/* Organization Combobox */}
            <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('users:grantPermissions.organizations')}
                </label>
                <Combobox
                    value={assignment.organizationId || ''}
                    onChange={handleOrganizationChange}
                    options={organizations.map(o => ({
                        id: o.id,
                        name: o.name,
                        description: o.code
                    }))}
                    placeholder={t('users:grantPermissions.selectOrganization')}
                    disabled={disabled}
                    icon={<Building className="w-4 h-4 text-gray-400" />}
                    allowEmpty
                    emptyLabel={t('users:grantPermissions.globalPermission')}
                />
            </div>

            {/* Remove Button */}
            <div className="flex-shrink-0 pt-6">
                {canRemove && (
                    <button
                        onClick={onRemove}
                        disabled={disabled}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('users:grantPermissions.removeRow')}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default PermissionsOrganizationRow;
