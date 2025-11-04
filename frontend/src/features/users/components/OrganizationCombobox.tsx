import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../../shared/types/organization';

// Performance optimization constants
const DEBOUNCE_DELAY = 300; // ms
const MAX_RESULTS = 20; // Reduced from 50 to 20 for faster initial render

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
    const { t } = useTranslation(['users', 'common']);

    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const comboboxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Debounce search term to avoid filtering on every keystroke
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, DEBOUNCE_DELAY);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Find selected organization
    const selectedOrganization = organizations.find(org => org.id === selectedId);

    // Advanced filtering with useMemo: Score-based filtering to show most relevant results
    // OPTIMIZATION: Only filter when dropdown is open to avoid expensive computation on mount
    const { filteredOrganizations, hiddenResultsCount } = useMemo(() => {
        // Skip filtering if dropdown is not open - improves initial modal open performance
        if (!isOpen) {
            return { filteredOrganizations: [], hiddenResultsCount: 0 };
        }

        if (!debouncedSearchTerm.trim()) {
            const limited = organizations.slice(0, MAX_RESULTS);
            return {
                filteredOrganizations: limited,
                hiddenResultsCount: Math.max(0, organizations.length - MAX_RESULTS)
            };
        }

        const searchLower = debouncedSearchTerm.toLowerCase().trim();
        const searchWords = searchLower.split(/\s+/); // Split search into words

        // Calculate relevance score for each organization
        const scoredOrgs = organizations.map(org => {
            const nameLower = org.name.toLowerCase();
            const parentName = org.parent?.name?.toLowerCase() || '';
            let score = 0;

            // Exact match gets highest score
            if (nameLower === searchLower) {
                score += 1000;
            }

            // Starts with search term gets high score
            if (nameLower.startsWith(searchLower)) {
                score += 500;
            }

            // Count how many search words match in name or parent
            const matchedWords = searchWords.filter(word =>
                nameLower.includes(word) || parentName.includes(word)
            );
            const wordMatchRatio = matchedWords.length / searchWords.length;

            // Only show organizations that match at least 60% of search words
            if (wordMatchRatio < 0.6) {
                return { org, score: -1 }; // Mark as irrelevant
            }

            // Add score based on word match ratio
            score += wordMatchRatio * 100;

            // Bonus points for matching all words in sequence
            if (searchWords.every(word => nameLower.includes(word) || parentName.includes(word))) {
                score += 50;
            }

            // Bonus for word order match in organization name
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

        // Filter out irrelevant results, sort by score, and limit results
        const filtered = scoredOrgs
            .filter(item => item.score > 0) // Only show relevant results
            .sort((a, b) => b.score - a.score) // Sort by relevance
            .map(item => item.org);

        const limited = filtered.slice(0, MAX_RESULTS);
        return {
            filteredOrganizations: limited,
            hiddenResultsCount: Math.max(0, filtered.length - MAX_RESULTS)
        };
    }, [organizations, debouncedSearchTerm, isOpen]); // Add isOpen dependency

    // Calculate dropdown position - optimized with requestAnimationFrame to avoid forced reflow
    const calculateDropdownPosition = () => {
        if (!comboboxRef.current) return;

        // Use requestAnimationFrame to defer position calculation and avoid forced reflow
        requestAnimationFrame(() => {
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
        });
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
            const parts = [selectedOrganization.name];
            if (selectedOrganization.code) {
                parts.push(`[${selectedOrganization.code}]`);
            }
            if (selectedOrganization.parent) {
                parts.push(`(${selectedOrganization.parent.name})`);
            }
            return parts.join(' ');
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
                    {filteredOrganizations.length > 0 ? (filteredOrganizations.map((org, index) => {
                        const isSelected = selectedId === org.id;
                        const isHighlighted = highlightedIndex === index;

                        return (
                            <div
                                key={org.id}
                                className={`px-3 py-3 cursor-pointer transition-colors border-l-4 ${isHighlighted
                                    ? 'bg-doan-50 dark:bg-doan-900/20 text-doan-700 dark:text-doan-300 border-doan-400'
                                    : isSelected
                                        ? 'bg-doan-100 dark:bg-doan-900/30 text-doan-800 dark:text-doan-200 border-doan-500'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-transparent'
                                    }`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelect(org.id);
                                }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center flex-1 min-w-0">
                                        <Building className={`w-4 h-4 mr-3 flex-shrink-0 ${isSelected ? 'text-doan-600' : 'text-gray-400'
                                            }`} />
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-medium truncate ${isSelected ? 'text-doan-900 dark:text-doan-100' : 'text-gray-900 dark:text-white'
                                                }`}>
                                                {org.name}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs truncate">
                                                <span className={`${isSelected ? 'text-doan-600 dark:text-doan-400' : 'text-gray-500 dark:text-gray-400'
                                                    }`}>
                                                    {org.code || org.id}
                                                </span>
                                                {org.parent && (
                                                    <>
                                                        <span className="text-gray-400">•</span>
                                                        <span className={`truncate ${isSelected ? 'text-doan-600 dark:text-doan-400' : 'text-gray-500 dark:text-gray-400'
                                                            }`}>
                                                            {org.parent.name}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div className="w-5 h-5 bg-doan-600 rounded-full flex items-center justify-center ml-2 flex-shrink-0">
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })) : debouncedSearchTerm ? (
                        <div className="px-4 py-6 text-center text-gray-500">
                            <Search className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('common:messages.empty.noResults')}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('users:messages.organizationNotFound', {
                                    searchTerm: debouncedSearchTerm,
                                    defaultValue: `Không tìm thấy tổ chức phù hợp với "${debouncedSearchTerm}"`
                                })}
                            </p>
                        </div>
                    ) : null}

                    {/* More results hint */}
                    {hiddenResultsCount > 0 && (
                        <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            {t('users:messages.moreResults', {
                                count: hiddenResultsCount,
                                defaultValue: `+ ${hiddenResultsCount} tổ chức khác. Hãy tìm kiếm cụ thể hơn...`
                            })}
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default OrganizationCombobox;
