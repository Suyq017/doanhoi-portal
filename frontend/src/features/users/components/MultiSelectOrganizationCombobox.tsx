import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Building, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Organization {
    id: string;
    name: string;
    code: string;
    parentId?: string;
    level: number;
}

interface MultiSelectOrganizationComboboxProps {
    organizations: Organization[];
    selectedOrganizationIds: string[];
    onOrganizationSelect: (organizationIds: string[]) => void;
    userOrganizations?: Organization[];
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    allowEmpty?: boolean;
}

const MultiSelectOrganizationCombobox: React.FC<MultiSelectOrganizationComboboxProps> = ({
    organizations,
    selectedOrganizationIds,
    onOrganizationSelect,
    userOrganizations = [],
    disabled = false,
    placeholder,
    className = '',
    allowEmpty = true,
}) => {
    const { t } = useTranslation(['users']); const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isSelecting, setIsSelecting] = useState(false);

    const comboboxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const selectedOrganizations = organizations.filter(org => selectedOrganizationIds.includes(org.id));    // Advanced filtering: Score-based filtering to show most relevant results
    const filteredOrganizations = (() => {
        if (!searchTerm.trim()) {
            return organizations; // Show all if no search term
        }

        const searchLower = searchTerm.toLowerCase().trim();
        const searchWords = searchLower.split(/\s+/); // Split search into words

        // Calculate relevance score for each organization
        const scoredOrgs = organizations.map(org => {
            const nameLower = org.name.toLowerCase();
            const codeLower = org.code.toLowerCase();
            let score = 0;

            // Exact match gets highest score
            if (nameLower === searchLower || codeLower === searchLower) {
                score += 1000;
            }

            // Starts with search term gets high score
            if (nameLower.startsWith(searchLower) || codeLower.startsWith(searchLower)) {
                score += 500;
            }

            // Count how many search words match
            const matchedWords = searchWords.filter(word =>
                nameLower.includes(word) || codeLower.includes(word)
            );
            const wordMatchRatio = matchedWords.length / searchWords.length;

            // Only show organizations that match at least 60% of search words
            if (wordMatchRatio < 0.6) {
                return { org, score: -1 }; // Mark as irrelevant
            }

            // Add score based on word match ratio
            score += wordMatchRatio * 100;

            // Bonus points for matching all words in sequence
            if (searchWords.every(word => nameLower.includes(word) || codeLower.includes(word))) {
                score += 50;
            }

            // Bonus for word order match
            let lastIndex = -1;
            let sequenceMatch = true;
            for (const word of searchWords) {
                const index = nameLower.indexOf(word, lastIndex + 1);
                if (index === -1 || index <= lastIndex) {
                    sequenceMatch = false;
                    break;
                }
                lastIndex = index;
            }
            if (sequenceMatch) {
                score += 200;
            }

            // Penalty for length difference (prefer shorter, more specific matches)
            const lengthDiff = Math.abs(nameLower.length - searchLower.length);
            score -= lengthDiff * 0.5;

            return { org, score };
        });

        // Filter out irrelevant results and sort by score
        return scoredOrgs
            .filter(item => item.score > 0) // Only show relevant results
            .sort((a, b) => b.score - a.score) // Sort by relevance
            .map(item => item.org);
    })();

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
    }, [isSelecting]); const handleOrganizationToggle = (organizationId: string) => {
        setIsSelecting(true);

        const isSelected = selectedOrganizationIds.includes(organizationId);
        if (isSelected) {
            onOrganizationSelect(selectedOrganizationIds.filter(id => id !== organizationId));
        } else {
            onOrganizationSelect([...selectedOrganizationIds, organizationId]);
        }

        // Reset selecting flag
        setTimeout(() => {
            setIsSelecting(false);
        }, 100);
    };

    const handleOrganizationRemove = (organizationId: string) => {
        onOrganizationSelect(selectedOrganizationIds.filter(id => id !== organizationId));
    }; const handleUserOrganizationsSelect = () => {
        setIsSelecting(true);
        const userOrgIds = userOrganizations.map(org => org.id);
        onOrganizationSelect(userOrgIds);

        // Reset selecting flag
        setTimeout(() => {
            setIsSelecting(false);
        }, 100);
    };

    const handleGlobalSelect = () => {
        setIsSelecting(true);
        onOrganizationSelect([]); // Empty array means global

        // Reset selecting flag
        setTimeout(() => {
            setIsSelecting(false);
        }, 100);
    };

    const handleInputClick = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    }; const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
        setHighlightedIndex(-1);
    };    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        // All items includes: global option (if allowEmpty) + user organizations option (if userOrganizations exist) + filtered organizations
        const allItems = [];
        if (allowEmpty) allItems.push('global');
        if (userOrganizations.length > 0) allItems.push('user-orgs');
        allItems.push(...filteredOrganizations.map(org => org.id));

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else {
                    setHighlightedIndex(prev =>
                        prev < allItems.length - 1 ? prev + 1 : 0
                    );
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (isOpen) {
                    setHighlightedIndex(prev =>
                        prev > 0 ? prev - 1 : allItems.length - 1
                    );
                }
                break;

            case 'Enter':
                e.preventDefault();
                if (isOpen && highlightedIndex >= 0) {
                    let currentIndex = 0;

                    // Check global option
                    if (allowEmpty && highlightedIndex === currentIndex) {
                        handleGlobalSelect();
                        return;
                    }
                    if (allowEmpty) currentIndex++;

                    // Check user organizations option
                    if (userOrganizations.length > 0 && highlightedIndex === currentIndex) {
                        handleUserOrganizationsSelect();
                        return;
                    }
                    if (userOrganizations.length > 0) currentIndex++;

                    // Check individual organizations
                    const orgIndex = highlightedIndex - currentIndex;
                    if (filteredOrganizations[orgIndex]) {
                        handleOrganizationToggle(filteredOrganizations[orgIndex].id);
                    }
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

    const isGlobalRole = selectedOrganizationIds.length === 0;
    return (
        <div className={`relative ${className} flex flex-col h-full`} ref={comboboxRef}>
            {/* Selected Organizations Tags or Global Role Tag - Flexible height area */}
            <div className="flex-1 mb-3 flex flex-col">
                {isGlobalRole ? (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3 flex-1 flex items-center">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-gray-200 rounded-full">
                                    <Building className="w-4 h-4 text-gray-600" />
                                </div>
                                <div>
                                    <span className="text-sm font-semibold text-gray-700">
                                        {t('users:grantRoles.globalRole')}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {t('users:labels.globalRoleDescription', { defaultValue: 'Áp dụng cho toàn hệ thống' })}
                                    </p>
                                </div>
                            </div>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(true)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150"
                                    title={t('users:labels.selectSpecificOrganization', { defaultValue: 'Chọn tổ chức cụ thể' })}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ) : selectedOrganizations.length > 0 ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                {t('users:labels.selectedOrganizations', {
                                    count: selectedOrganizations.length,
                                    defaultValue: `Tổ chức đã chọn (${selectedOrganizations.length})`
                                })}
                            </span>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => onOrganizationSelect([])}
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
                ) : null}
            </div>

            {/* Input - Fixed at bottom */}
            <div className="relative flex-shrink-0">                <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onClick={handleInputClick}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || t('users:grantRoles.selectOrganization')}
                disabled={disabled}
                className="block w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 placeholder-gray-400"
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
            >                    {filteredOrganizations.length > 0 || allowEmpty || userOrganizations.length > 0 ? (
                <ul ref={listRef} className="py-2">
                    {/* Empty option for global role */}
                    {allowEmpty && (
                        <li>
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
                                    handleGlobalSelect();
                                }}
                                onMouseEnter={() => setHighlightedIndex(0)}
                                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${highlightedIndex === 0
                                    ? 'bg-gray-100 text-gray-700'
                                    : ''
                                    } ${isGlobalRole
                                        ? 'bg-gray-50 border-l-4 border-gray-500'
                                        : 'border-l-4 border-transparent'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <Building className={`w-4 h-4 mr-3 ${isGlobalRole ? 'text-gray-600' : 'text-gray-400'}`} />
                                        <span className={`italic ${isGlobalRole ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                            {t('users:grantRoles.globalRole')}
                                        </span>
                                    </div>
                                    {isGlobalRole && (
                                        <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center ml-2">
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </button>
                        </li>
                    )}

                    {/* Option to select user's organizations */}
                    {userOrganizations.length > 0 && (
                        <li>
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
                                    handleUserOrganizationsSelect();
                                }}
                                onMouseEnter={() => {
                                    const index = allowEmpty ? 1 : 0;
                                    setHighlightedIndex(index);
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-green-50 transition-colors ${(() => {
                                    const index = allowEmpty ? 1 : 0;
                                    return highlightedIndex === index ? 'bg-green-100 text-green-700' : '';
                                })()
                                    } border-l-4 border-green-400`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <Building className="w-4 h-4 mr-3 text-green-600" />
                                        <div>
                                            <span className="font-medium text-green-900">
                                                {t('users:labels.selectUserOrganizations', { defaultValue: 'Chọn tổ chức của người dùng' })}
                                            </span>
                                            <div className="text-xs text-green-600 mt-0.5">
                                                {t('users:labels.userOrganizationsList', {
                                                    count: userOrganizations.length,
                                                    organizations: userOrganizations.map(org => org.name).join(', '),
                                                    defaultValue: `${userOrganizations.length} tổ chức: ${userOrganizations.map(org => org.name).join(', ')}`
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center ml-2">
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </button>
                        </li>
                    )}

                    {filteredOrganizations.map((org, index) => {
                        const isSelected = selectedOrganizationIds.includes(org.id);
                        let actualIndex = index;
                        if (allowEmpty) actualIndex++;
                        if (userOrganizations.length > 0) actualIndex++;

                        return (
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
                                        handleOrganizationToggle(org.id);
                                    }}
                                    onMouseEnter={() => setHighlightedIndex(actualIndex)}
                                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${actualIndex === highlightedIndex
                                        ? 'bg-blue-50 text-blue-700'
                                        : ''
                                        } ${isSelected
                                            ? 'bg-blue-50 border-l-4 border-blue-500'
                                            : 'border-l-4 border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <Building className={`w-4 h-4 mr-3 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                                    {org.name}
                                                </div>
                                                <div className={`text-xs truncate ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                                                    {org.code}
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center ml-2">
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
                            ? t('users:labels.organizationNotFound', {
                                searchTerm,
                                defaultValue: `Không tìm thấy tổ chức "${searchTerm}"`
                            })
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

export default MultiSelectOrganizationCombobox;
