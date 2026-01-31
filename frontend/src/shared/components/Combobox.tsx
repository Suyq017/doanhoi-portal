import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

interface ComboboxOption {
    id: string;
    label: string;
    description?: string;
}

interface ComboboxProps {
    options: ComboboxOption[];
    value?: string;
    placeholder?: string;
    loading?: boolean;
    disabled?: boolean;
    searchPlaceholder?: string;
    onSelect: (value: string) => void;
    onClear?: () => void;
    className?: string;
    error?: boolean;
    allowInput?: boolean; // Allow typing in the input field
    dropdownPortal?: boolean; // Portal dropdown outside modal
}

const Combobox: React.FC<ComboboxProps> = ({
    options,
    value,
    placeholder = "Select an option...",
    loading = false,
    disabled = false,
    searchPlaceholder = "Search...",
    onSelect,
    onClear,
    className = "",
    error = false,
    allowInput = true,
    dropdownPortal = false,
}) => {
    const [isOpen, setIsOpen] = useState(false); const [searchTerm, setSearchTerm] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 }); const selectedOption = options.find(option => option.id === value);

    // Update input value when selected option changes
    useEffect(() => {
        if (selectedOption && !isTyping) {
            setInputValue(selectedOption.label);
        } else if (!selectedOption && !isTyping) {
            setInputValue('');
        }
    }, [selectedOption, isTyping]);

    // Sync input value with external value changes
    useEffect(() => {
        if (!isTyping) {
            const currentSelectedOption = options.find(option => option.id === value);
            if (currentSelectedOption) {
                setInputValue(currentSelectedOption.label);
            } else if (!value) {
                setInputValue('');
            }
        }
    }, [value, options, isTyping]);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes((allowInput ? inputValue : searchTerm).toLowerCase()) ||
        (option.description && option.description.toLowerCase().includes((allowInput ? inputValue : searchTerm).toLowerCase()))
    );    // Throttled update function to avoid too many position calculations
    const throttledUpdatePosition = useCallback(
        (() => {
            let timeoutId: NodeJS.Timeout | null = null;
            return () => {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    if (isOpen && dropdownPortal) {
                        updateDropdownPosition();
                    }
                }, 16); // ~60fps
            };
        })(),
        [isOpen, dropdownPortal]
    );    // Calculate dropdown position for portal
    const updateDropdownPosition = () => {
        if (containerRef.current && dropdownPortal) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const dropdownHeight = 240; // max-h-60 in pixels

            // Position dropdown below input by default, or above if not enough space
            const shouldShowAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

            // Use viewport coordinates directly (getBoundingClientRect already accounts for all scrolling)
            setDropdownPosition({
                top: shouldShowAbove
                    ? rect.top - dropdownHeight - 4
                    : rect.bottom + 4,
                left: rect.left,
                width: rect.width
            });
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickInsideContainer = containerRef.current && containerRef.current.contains(target);

            // For portal dropdown, also check if click is inside the portal dropdown
            let clickInsidePortalDropdown = false;
            if (dropdownPortal && isOpen) {
                const portalDropdowns = document.querySelectorAll('[data-testid="combobox-dropdown"]');
                clickInsidePortalDropdown = Array.from(portalDropdowns).some(dropdown =>
                    dropdown.contains(target)
                );
            } if (!clickInsideContainer && !clickInsidePortalDropdown) {
                setIsOpen(false);
                setSearchTerm('');
                setIsTyping(false);

                // Reset input to selected option label if no typing
                if (selectedOption) {
                    setInputValue(selectedOption.label);
                } else if (allowInput) {
                    setInputValue('');
                }
            } else {
                // Click is inside - keep dropdown open
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        // For portal dropdown, use IntersectionObserver + targeted scroll listeners
        if (isOpen && dropdownPortal && containerRef.current) {
            // Use IntersectionObserver to detect when input position changes
            const intersectionObserver = new IntersectionObserver(
                () => {
                    updateDropdownPosition();
                },
                { threshold: [0, 0.1, 0.5, 0.9, 1] }
            );
            intersectionObserver.observe(containerRef.current);

            // Listen specifically for modal and document scroll events
            const handleScrollEvent = () => updateDropdownPosition();

            // Listen to common scroll containers
            window.addEventListener('scroll', handleScrollEvent, true);
            document.addEventListener('scroll', handleScrollEvent, true);

            // Find modal containers and overflow containers
            const scrollableContainers = Array.from(document.querySelectorAll(
                '[class*="overflow-y-auto"], [class*="overflow-auto"], ' +
                '[style*="overflow-y: auto"], [style*="overflow: auto"], ' +
                '.modal, [role="dialog"], [class*="modal"]'
            ));

            scrollableContainers.forEach(container => {
                container.addEventListener('scroll', handleScrollEvent);
            });

            // Also use ResizeObserver for layout changes
            const resizeObserver = new ResizeObserver(handleScrollEvent);
            resizeObserver.observe(containerRef.current);
            resizeObserver.observe(document.body);

            window.addEventListener('resize', handleScrollEvent);

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);

                intersectionObserver.disconnect();
                resizeObserver.disconnect();

                window.removeEventListener('scroll', handleScrollEvent, true);
                document.removeEventListener('scroll', handleScrollEvent, true);
                window.removeEventListener('resize', handleScrollEvent);

                scrollableContainers.forEach(container => {
                    container.removeEventListener('scroll', handleScrollEvent);
                });
            };
        } else {
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [selectedOption, allowInput, isOpen, dropdownPortal, throttledUpdatePosition]);

    useEffect(() => {
        if (isOpen) {
            if (allowInput && inputRef.current) {
                inputRef.current.focus();
            }
            if (dropdownPortal) {
                updateDropdownPosition();
            }
        }
    }, [isOpen, allowInput, dropdownPortal]); const handleToggle = () => {
        if (!disabled && !loading) {
            setIsOpen(!isOpen);
            setSearchTerm('');
            if (!allowInput) {
                setIsTyping(false);
            }
        }
    };

    const handleSelect = (optionId: string) => {
        // Find the selected option and update input value immediately
        const selectedOpt = options.find(option => option.id === optionId);
        if (selectedOpt) {
            setInputValue(selectedOpt.label);
        } setIsTyping(false);
        onSelect(optionId);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setInputValue('');
        setSearchTerm('');
        setIsTyping(false);
        if (onClear) {
            onClear();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setIsTyping(true);
        setIsOpen(true);

        // Check if input matches any option exactly
        const exactMatch = options.find(option =>
            option.label.toLowerCase() === newValue.toLowerCase()
        );

        if (exactMatch && exactMatch.id !== value) {
            // Auto-select exact match
            setTimeout(() => {
                setIsTyping(false);
                onSelect(exactMatch.id);
            }, 0);
        } else if (!exactMatch && value && newValue.trim() === '') {
            // Clear selection if input is empty
            if (onClear) {
                onClear();
            }
        }
    };

    const handleInputFocus = () => {
        setIsOpen(true);
        if (dropdownPortal) {
            updateDropdownPosition();
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`} data-testid="combobox-container">
            {/* Input Field or Button */}
            {allowInput ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    disabled={disabled || loading}
                    placeholder={placeholder}
                    data-testid="combobox-input"
                    className={`
            w-full px-3 py-2 pr-10 text-left border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent 
            dark:bg-gray-700 dark:text-white transition-colors
            ${error
                            ? 'border-red-500 dark:border-red-500'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        }
            ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
          `}
                />
            ) : (
                <button
                    type="button"
                    onClick={handleToggle}
                    disabled={disabled || loading}
                    className={`
            w-full px-3 py-2 text-left border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent 
            dark:bg-gray-700 dark:text-white transition-colors
            ${error
                            ? 'border-red-500 dark:border-red-500'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        }
            ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
                >
                    <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </button>
            )}

            {/* Action Icons */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                {(selectedOption || inputValue) && onClear && (
                    <X
                        className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                        onClick={handleClear}
                    />
                )}
                {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-200 dark:border-gray-600 border-t-doan-500 dark:border-t-doan-400"></div>
                ) : (
                    <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform cursor-pointer ${isOpen ? 'rotate-180' : ''}`}
                        onClick={handleToggle}
                    />
                )}
            </div>

            {/* Dropdown */}
            {renderDropdown()}

            {/* Selected Option Preview */}
            {selectedOption && selectedOption.description && !isOpen && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Selected:</strong> {selectedOption.label}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {selectedOption.description}
                    </p>
                </div>
            )}
        </div>
    );

    function renderDropdown() {
        if (!isOpen) return null;

        const dropdownContent = (
            <div className={`
        bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden
        ${dropdownPortal ? 'fixed z-[99999]' : 'absolute z-50 w-full mt-1'}
      `}
                style={dropdownPortal ? {
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                    // Ensure dropdown is always visible and above modal content
                    zIndex: 99999,
                    boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                } : {}}
                data-testid="combobox-dropdown"
            >
                {/* Search Input (only if not allowInput) */}
                {!allowInput && (
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>
                )}

                {/* Options List */}                <div className="max-h-48 overflow-y-auto">                    {filteredOptions.length > 0 ? (filteredOptions.map((option) => {
                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSelect(option.id);
                            }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                            }}
                            className={`
                      w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none
                      ${option.id === value ? 'bg-doan-50 dark:bg-doan-900/20 text-doan-700 dark:text-doan-300' : 'text-gray-900 dark:text-white'}
                    `}
                        >
                            <div className="font-medium">{option.label}</div>
                            {option.description && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {option.description}
                                </div>
                            )}
                        </button>
                    );
                })
                ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        {allowInput ? 'Không tìm thấy kết quả' : 'No options found'}
                    </div>
                )}
                </div>
            </div>
        );

        return dropdownPortal ? createPortal(dropdownContent, document.body) : dropdownContent;
    }
};

export default Combobox;
