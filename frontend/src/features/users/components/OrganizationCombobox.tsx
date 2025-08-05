import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../../shared/types/organization';

interface OrganizationComboboxProps {
    organizations: Organization[];
    selectedId: string;
    onSelect: (organizationId: string) => void;
    loading?: boolean;
    disabled?: boolean;
    error?: string;
    placeholder?: string;
}

const OrganizationCombobox: React.FC<OrganizationComboboxProps> = ({
    organizations,
    selectedId,
    onSelect,
    loading = false,
    disabled = false,
    error,
    placeholder,
}) => {
    const { t } = useTranslation(['users', 'common']); const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const comboboxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    // Find selected organization
    const selectedOrganization = organizations.find(org => org.id === selectedId);

    // Filter organizations based on search term
    const filteredOrganizations = organizations.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (org.parent?.name && org.parent.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    // Calculate dropdown position
    const calculateDropdownPosition = () => {
        if (comboboxRef.current) {
            const rect = comboboxRef.current.getBoundingClientRect();
            const dropdownHeight = 240; // max-h-60 = 240px
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            let top = rect.bottom + window.scrollY;

            // If not enough space below and more space above, show dropdown above
            if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                top = rect.top + window.scrollY - dropdownHeight;
            }

            setDropdownPosition({
                top,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    };  // Handle click outside to close dropdown and scroll/resize events
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            // Check if click is inside combobox or dropdown
            const isInsideCombobox = comboboxRef.current && comboboxRef.current.contains(target);
            const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);

            if (!isInsideCombobox && !isInsideDropdown) {
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
            }
        };

        const handleResize = () => {
            if (isOpen) {
                calculateDropdownPosition();
            }
        };

        const handleScroll = () => {
            if (isOpen) {
                calculateDropdownPosition();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        if (isOpen) {
            window.addEventListener('resize', handleResize);
            window.addEventListener('scroll', handleScroll, true);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled || loading) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else {
                    setHighlightedIndex(prev =>
                        prev < filteredOrganizations.length - 1 ? prev + 1 : 0
                    );
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (isOpen) {
                    setHighlightedIndex(prev =>
                        prev > 0 ? prev - 1 : filteredOrganizations.length - 1
                    );
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (isOpen && highlightedIndex >= 0) {
                    handleSelect(filteredOrganizations[highlightedIndex].id);
                } else if (!isOpen) {
                    setIsOpen(true);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
                break;
            case 'Tab':
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
                break;
        }
    }; const handleSelect = (organizationId: string) => {
        onSelect(organizationId);
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect('');
        setIsOpen(false);
        setSearchTerm('');
    };
    const handleInputClick = () => {
        if (!disabled && !loading) {
            if (!isOpen) {
                calculateDropdownPosition();
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 0);
            } else {
                setIsOpen(false);
            }
        }
    };
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setHighlightedIndex(-1);
        if (!isOpen) {
            calculateDropdownPosition();
            setIsOpen(true);
        }
    };

    const getDisplayText = () => {
        if (selectedOrganization) {
            return selectedOrganization.name + (selectedOrganization.parent ? ` (${selectedOrganization.parent.name})` : '');
        }
        return '';
    };

    return (
        <div className="relative" ref={comboboxRef}>
            {/* Input Field */}
            <div
                className={`relative w-full px-3 py-2 border rounded-md cursor-pointer transition-colors ${disabled || loading
                        ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    } ${error
                        ? 'border-red-500 dark:border-red-500'
                        : isOpen
                            ? 'border-doan-500 ring-2 ring-doan-500 ring-opacity-20'
                            : 'border-gray-300 dark:border-gray-600'
                    }`}
                onClick={handleInputClick}
            >
                <div className="flex items-center justify-between">
                    {/* Display/Search Input */}
                    {isOpen ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={t('common:actions.search')}
                            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
                            disabled={disabled || loading}
                        />
                    ) : (
                        <span className={`flex-1 truncate ${selectedOrganization
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-400 dark:text-gray-500'
                            }`}>
                            {selectedOrganization ? getDisplayText() : (placeholder || t('users:placeholders.selectOrganization'))}
                        </span>
                    )}

                    {/* Icons */}
                    <div className="flex items-center space-x-1">
                        {selectedOrganization && !disabled && !loading && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}

                        {loading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-doan-500"></div>
                        ) : (
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''
                                }`} />
                        )}
                    </div>
                </div>      </div>
            {/* Dropdown - rendered as portal */}
            {isOpen && !disabled && !loading && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed z-[10000] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
                    style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                    }}
                >
                    {/* Search hint when no search term */}
                    {!searchTerm && (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 flex items-center">
                            <Search className="w-4 h-4 mr-2" />
                            {t('common:actions.search')}...
                        </div>
                    )}          {/* Empty option */}
                    <div
                        className={`px-3 py-2 cursor-pointer transition-colors ${highlightedIndex === -1
                                ? 'bg-doan-50 dark:bg-doan-900/20 text-doan-700 dark:text-doan-300'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSelect('');
                        }}
                        onMouseEnter={() => setHighlightedIndex(-1)}
                    >
                        <span className="text-gray-500 dark:text-gray-400 italic">
                            {t('common:labels.none')}
                        </span>
                    </div>

                    {/* Organization options */}
                    {filteredOrganizations.length > 0 ? (filteredOrganizations.map((org, index) => (
                        <div
                            key={org.id}
                            className={`px-3 py-2 cursor-pointer transition-colors ${highlightedIndex === index
                                    ? 'bg-doan-50 dark:bg-doan-900/20 text-doan-700 dark:text-doan-300'
                                    : selectedId === org.id
                                        ? 'bg-doan-100 dark:bg-doan-900/30 text-doan-800 dark:text-doan-200'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSelect(org.id);
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {org.name}
                                </span>
                                {selectedId === org.id && (
                                    <div className="w-2 h-2 bg-doan-500 rounded-full"></div>
                                )}
                            </div>
                            {org.parent && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {org.parent.name}
                                </span>
                            )}
                        </div>
                    ))) : searchTerm ? (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                            {t('common:messages.noResults')}
                        </div>
                    ) : null}
                </div>,
                document.body
            )}
        </div>
    );
};

export default OrganizationCombobox;
