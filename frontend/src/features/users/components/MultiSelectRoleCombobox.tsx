import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Shield, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Role {
    id: string;
    name: string;
    displayName: string;
    description?: string;
}

interface MultiSelectRoleComboboxProps {
    roles: Role[];
    selectedRoleIds: string[];
    onRoleSelect: (roleIds: string[]) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}

const MultiSelectRoleCombobox: React.FC<MultiSelectRoleComboboxProps> = ({
    roles,
    selectedRoleIds,
    onRoleSelect,
    disabled = false,
    placeholder,
    className = '',
}) => {
    const { t } = useTranslation(['users']); const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isSelecting, setIsSelecting] = useState(false);

    const comboboxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const selectedRoles = roles.filter(role => selectedRoleIds.includes(role.id));    // Filter roles based on search term
    const filteredRoles = roles.filter(role => {
        const searchLower = searchTerm.toLowerCase();
        return (
            role.name.toLowerCase().includes(searchLower) ||
            role.displayName.toLowerCase().includes(searchLower)
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
    };    // Update dropdown position when opened or on scroll
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
    }, [isSelecting]); const handleRoleToggle = (roleId: string) => {
        setIsSelecting(true);

        const isSelected = selectedRoleIds.includes(roleId);
        if (isSelected) {
            onRoleSelect(selectedRoleIds.filter(id => id !== roleId));
        } else {
            onRoleSelect([...selectedRoleIds, roleId]);
        }

        // Reset selecting flag
        setTimeout(() => {
            setIsSelecting(false);
        }, 100);
    };

    const handleRoleRemove = (roleId: string) => {
        onRoleSelect(selectedRoleIds.filter(id => id !== roleId));
    };

    const handleInputClick = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    }; const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                        prev < filteredRoles.length - 1 ? prev + 1 : 0
                    );
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (isOpen) {
                    setHighlightedIndex(prev =>
                        prev > 0 ? prev - 1 : filteredRoles.length - 1
                    );
                }
                break;

            case 'Enter':
                e.preventDefault();
                if (isOpen && highlightedIndex >= 0 && filteredRoles[highlightedIndex]) {
                    handleRoleToggle(filteredRoles[highlightedIndex].id);
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
            {/* Selected Roles Tags - Flexible height area */}
            <div className="flex-1 mb-3 flex flex-col">
                {selectedRoles.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Vai trò đã chọn ({selectedRoles.length})
                            </span>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => onRoleSelect([])}
                                    className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                                    title="Xóa tất cả vai trò"
                                >
                                    Xóa tất cả
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 flex-1 content-start">
                            {selectedRoles.map((role) => (
                                <div
                                    key={role.id}
                                    className="group inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-doan-500 to-doan-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-doan-300 h-fit"
                                >
                                    <Shield className="w-3.5 h-3.5 text-doan-100" />
                                    <span className="text-sm font-medium">{role.displayName}</span>
                                    {!disabled && (
                                        <button
                                            type="button"
                                            onClick={() => handleRoleRemove(role.id)}
                                            className="ml-1 p-0.5 text-doan-200 hover:text-white hover:bg-doan-700 rounded-full transition-all duration-150"
                                            title="Xóa vai trò"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Input - Fixed at bottom */}
            <div className="relative flex-shrink-0">                <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onClick={handleInputClick}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || t('users:grantRoles.selectRole')}
                disabled={disabled}
                className="block w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-doan-500 focus:border-transparent sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 placeholder-gray-400"
                autoComplete="off"
            />

                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                            }`}
                    />
                </div>
            </div>            {/* Dropdown Portal */}
            {isOpen && createPortal(<div
                style={{
                    position: 'fixed',
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                    maxHeight: dropdownPosition.maxHeight,
                    zIndex: 10000,
                }}
                className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-auto pointer-events-auto"
                onMouseDown={(e) => {
                    // Prevent outside click when clicking inside dropdown
                    e.stopPropagation();
                }}
            >
                {filteredRoles.length > 0 ? (
                    <ul ref={listRef} className="py-2">
                        {filteredRoles.map((role, index) => {
                            const isSelected = selectedRoleIds.includes(role.id);
                            return (
                                <li key={role.id}>
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
                                            handleRoleToggle(role.id);
                                        }}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${index === highlightedIndex
                                            ? 'bg-doan-50 text-doan-700'
                                            : ''
                                            } ${isSelected
                                                ? 'bg-doan-50 border-l-4 border-doan-500'
                                                : 'border-l-4 border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <Shield className={`w-4 h-4 mr-3 ${isSelected ? 'text-doan-600' : 'text-gray-400'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-medium truncate ${isSelected ? 'text-doan-900' : 'text-gray-900'}`}>
                                                        {role.displayName}
                                                    </div>
                                                    <div className={`text-xs truncate ${isSelected ? 'text-doan-600' : 'text-gray-500'}`}>
                                                        {role.name}
                                                    </div>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className="w-5 h-5 bg-doan-600 rounded-full flex items-center justify-center ml-2">
                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="px-4 py-6 text-center text-gray-500">
                        <Search className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">
                            {searchTerm
                                ? `Không tìm thấy vai trò "${searchTerm}"`
                                : 'Không có vai trò nào'
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

export default MultiSelectRoleCombobox;
