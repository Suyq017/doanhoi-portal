import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Building, X, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Organization as SharedOrganization } from '../../../shared/types/organization';

// Extended Organization type with level for role assignment components
interface Organization extends Omit<SharedOrganization, 'code'> {
    code: string; // Make code required
    level: number;
}

interface OrganizationManagerProps {
    selectedOrganizations: Organization[];
    availableOrganizations: Organization[];
    onOrganizationChange: (organizations: Organization[]) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}

const OrganizationManager: React.FC<OrganizationManagerProps> = ({
    selectedOrganizations,
    availableOrganizations,
    onOrganizationChange,
    disabled = false,
    placeholder,
    className = '',
}) => {
    const { t } = useTranslation(['users']);

    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isSelecting, setIsSelecting] = useState(false);

    const comboboxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Get organizations that are not yet selected
    const selectedIds = selectedOrganizations.map(org => org.id);
    const availableOptions = availableOrganizations.filter(org => !selectedIds.includes(org.id));

    // Filter organizations based on search term
    const filteredOrganizations = availableOptions.filter(org => {
        const searchLower = searchTerm.toLowerCase();
        return (
            org.name.toLowerCase().includes(searchLower) ||
            org.code.toLowerCase().includes(searchLower) ||
            (org.description && org.description.toLowerCase().includes(searchLower))
        );
    });

    // Handle scroll events to update dropdown position
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 200 });

    // Get dropdown position
    const getDropdownPosition = () => {
        if (!comboboxRef.current) return { top: 0, left: 0, width: 0, maxHeight: 200 };

        const rect = comboboxRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Determine if dropdown should appear above or below
        const showAbove = spaceBelow < 200 && spaceAbove > spaceBelow;

        // Use rect positions directly for fixed positioning - this works better in modals
        return {
            top: showAbove ? rect.top - 200 : rect.bottom + 2,
            left: rect.left,
            width: rect.width,
            maxHeight: showAbove ? Math.min(spaceAbove - 10, 200) : Math.min(spaceBelow - 10, 200),
        };
    };

    // Update dropdown position when opened or on scroll
    useEffect(() => {
        if (isOpen) {
            const updatePosition = () => {
                setDropdownPosition(getDropdownPosition());
            };

            // Update position immediately
            updatePosition();

            // Add comprehensive scroll and resize listeners
            const handleUpdate = () => {
                if (isOpen) {
                    updatePosition();
                }
            };

            // Listen to scroll events with capture to catch all scroll events
            window.addEventListener('scroll', handleUpdate, true);
            window.addEventListener('resize', handleUpdate);

            // Find and listen to modal containers and overflow containers
            const scrollableContainers = Array.from(document.querySelectorAll(
                '[class*="overflow-y-auto"], [class*="overflow-auto"], ' +
                '[style*="overflow-y: auto"], [style*="overflow: auto"], ' +
                '.modal, [role="dialog"], [class*="modal"]'
            ));

            scrollableContainers.forEach(container => {
                container.addEventListener('scroll', handleUpdate);
            });

            // Use ResizeObserver for layout changes
            const resizeObserver = new ResizeObserver(handleUpdate);
            if (comboboxRef.current) {
                resizeObserver.observe(comboboxRef.current);
            }
            resizeObserver.observe(document.body);

            return () => {
                window.removeEventListener('scroll', handleUpdate, true);
                window.removeEventListener('resize', handleUpdate);

                scrollableContainers.forEach(container => {
                    container.removeEventListener('scroll', handleUpdate);
                });

                resizeObserver.disconnect();
            };
        }
    }, [isOpen]);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            // Check if click is inside combobox or dropdown
            if (comboboxRef.current && !comboboxRef.current.contains(target)) {
                // Don't close if user is in the process of selecting
                if (!isSelecting) {
                    setIsOpen(false);
                    setSearchTerm('');
                    setHighlightedIndex(-1);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSelecting]);

    const handleOrganizationAdd = (organization: Organization) => {
        setIsSelecting(true);

        const newOrganizations = [...selectedOrganizations, organization];
        onOrganizationChange(newOrganizations);

        // Clear search and close dropdown
        setSearchTerm('');
        setIsOpen(false);

        // Reset selecting flag
        setTimeout(() => {
            setIsSelecting(false);
        }, 100);
    };

    const handleOrganizationRemove = (organizationId: string) => {
        const newOrganizations = selectedOrganizations.filter(org => org.id !== organizationId);
        onOrganizationChange(newOrganizations);
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

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

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
                if (isOpen && highlightedIndex >= 0 && filteredOrganizations[highlightedIndex]) {
                    handleOrganizationAdd(filteredOrganizations[highlightedIndex]);
                }
                break;

            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
                break;
        }
    };

    return (
        <div className={`relative ${className} flex flex-col h-full`} ref={comboboxRef}>
            {/* Selected Organizations Tags */}
            <div className="flex-1 mb-3 flex flex-col">
                {selectedOrganizations.length > 0 ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                                {t('users:labels.selectedOrganizations', { 
                                    count: selectedOrganizations.length, 
                                    defaultValue: `Tổ chức đã chọn (${selectedOrganizations.length})` 
                                })}
                            </span>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => onOrganizationChange([])}
                                    className="text-xs text-blue-500 hover:text-red-600 transition-colors"
                                    title={t('users:labels.removeAllOrganizations', { defaultValue: 'Xóa tất cả tổ chức' })}
                                >
                                    {t('users:labels.removeAll', { defaultValue: 'Xóa tất cả' })}
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 flex-1 content-start">
                            {selectedOrganizations.map((org) => (
                                <div
                                    key={org.id}
                                    className="group inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-blue-300 h-fit"
                                >
                                    <Building className="w-3.5 h-3.5 text-blue-100" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium leading-tight">{org.name}</span>
                                        <span className="text-xs text-blue-200 leading-tight">{org.code}</span>
                                    </div>
                                    {!disabled && (
                                        <button
                                            type="button"
                                            onClick={() => handleOrganizationRemove(org.id)}
                                            className="ml-1 p-0.5 text-blue-200 hover:text-white hover:bg-blue-700 rounded-full transition-all duration-150"
                                            title={t('users:labels.removeOrganization', { defaultValue: 'Xóa tổ chức' })}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <Building className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('users:labels.noOrganizationsAssigned', { defaultValue: 'Người dùng chưa thuộc tổ chức nào' })}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {t('users:labels.searchOrganizationsHelp', { defaultValue: 'Sử dụng ô tìm kiếm bên dưới để thêm tổ chức' })}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Input - Fixed at bottom */}
            <div className="relative flex-shrink-0">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || t('users:labels.searchAndAddOrganizations', { defaultValue: 'Tìm kiếm và thêm tổ chức...' })}
                    disabled={disabled}
                    className="block w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 placeholder-gray-400 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                    autoComplete="off"
                />

                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    {availableOptions.length > 0 ? (
                        <ChevronDown
                            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                    ) : (
                        <Plus className="w-4 h-4 text-gray-400" />
                    )}
                </div>
            </div>

            {/* Dropdown Portal */}
            {isOpen && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                        maxHeight: dropdownPosition.maxHeight,
                        zIndex: 10000,
                    }}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-auto pointer-events-auto"
                    onMouseDown={(e) => {
                        // Prevent outside click when clicking inside dropdown
                        e.stopPropagation();
                    }}
                >
                    {filteredOrganizations.length > 0 ? (
                        <ul ref={listRef} className="py-2">
                            {filteredOrganizations.map((org, index) => (
                                <li key={org.id}>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsSelecting(true);
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleOrganizationAdd(org);
                                        }}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index === highlightedIndex
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                : ''
                                            } border-l-4 border-transparent hover:border-blue-400`}
                                    >
                                        <div className="flex items-center">
                                            <Building className="w-4 h-4 mr-3 text-gray-400" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate text-gray-900 dark:text-white">
                                                    {org.name}
                                                </div>
                                                <div className="text-xs truncate text-gray-500 dark:text-gray-400">
                                                    {org.code}
                                                    {org.description && ` • ${org.description}`}
                                                </div>
                                            </div>
                                            <Plus className="w-4 h-4 text-blue-500 ml-2" />
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                            <Search className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">
                                {searchTerm
                                    ? t('users:labels.organizationNotFound', { 
                                        searchTerm, 
                                        defaultValue: `Không tìm thấy tổ chức "${searchTerm}"` 
                                    })
                                    : availableOptions.length === 0
                                        ? t('users:labels.allOrganizationsAdded', { defaultValue: 'Tất cả tổ chức đã được thêm' })
                                        : t('users:labels.noOrganizations', { defaultValue: 'Không có tổ chức nào' })
                                }
                            </p>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default OrganizationManager;
