import React, { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

interface TagOption {
    id: string;
    label: string;
    description?: string;
}

interface TagInputProps {
    options: TagOption[];
    selectedTags: TagOption[];
    onTagsChange: (tags: TagOption[]) => void;
    placeholder?: string;
    loading?: boolean;
    disabled?: boolean;
    maxTags?: number;
    className?: string;
}

/**
 * TagInput Component - Allows users to select multiple items as tags
 */
export const TagInput: React.FC<TagInputProps> = ({
    options,
    selectedTags,
    onTagsChange,
    placeholder = "Chọn các mục...",
    loading = false,
    disabled = false,
    maxTags = 10,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter options based on search term and exclude already selected
    const filteredOptions = options.filter(option => {
        const isNotSelected = !selectedTags.some(tag => tag.id === option.id);
        const matchesSearch = option.label.toLowerCase().includes(searchTerm.toLowerCase());
        return isNotSelected && matchesSearch;
    });

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
                setFocusedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex(prev => Math.max(prev - 1, -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
                    handleAddTag(filteredOptions[focusedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSearchTerm('');
                setFocusedIndex(-1);
                inputRef.current?.blur();
                break;
        }
    };
    const handleAddTag = (option: TagOption) => {
        if (selectedTags.length >= maxTags) return;        // Check if tag already exists to prevent duplicates
        if (selectedTags.some(tag => tag.id === option.id)) {
            return;
        }

        const newTags = [...selectedTags, option];
        onTagsChange(newTags);
        setSearchTerm('');
        setFocusedIndex(-1);
        inputRef.current?.focus();
    }; const handleRemoveTag = (tagId: string) => {
        const newTags = selectedTags.filter(tag => tag.id !== tagId);
        onTagsChange(newTags);
    };

    const handleInputFocus = () => {
        if (!disabled) {
            setIsOpen(true);
        }
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Tags Container */}
            <div className={`
        min-h-[42px] w-full px-3 py-2 border rounded-md 
        focus-within:ring-2 focus-within:ring-doan-500 focus-within:border-transparent
        dark:bg-gray-700 dark:text-white
        ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white cursor-text'}
        ${isOpen ? 'border-doan-500' : 'border-gray-300 dark:border-gray-600'}
        transition-colors
      `}>        <div className="flex flex-wrap gap-2 items-center">
                    {/* Selected Tags */}                    {selectedTags.map((tag, index) => {
                        return (
                            <div
                                key={`${tag.id}-${index}`} // Add index to ensure uniqueness
                                className="inline-flex items-center gap-1 px-2 py-1 bg-doan-100 dark:bg-doan-800 text-doan-800 dark:text-doan-200 text-sm rounded-md"
                            >
                                <span className="truncate max-w-[150px]" title={tag.label}>
                                    {tag.label}
                                </span>
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTag(tag.id)}
                                        className="hover:bg-doan-200 dark:hover:bg-doan-700 rounded-sm p-0.5 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {/* Input */}
                    {selectedTags.length < maxTags && (
                        <div className="flex-1 min-w-[120px]">
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onFocus={handleInputFocus}
                                onKeyDown={handleKeyDown}
                                placeholder={selectedTags.length === 0 ? placeholder : ""}
                                disabled={disabled || loading}
                                className="w-full bg-transparent border-none outline-none text-sm placeholder-gray-400"
                            />
                        </div>
                    )}

                    {/* Add Button */}
                    {!disabled && selectedTags.length < maxTags && (
                        <button
                            type="button"
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                            <Plus className="w-4 h-4 text-gray-500" />
                        </button>
                    )}
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                    {loading ? (
                        <div className="p-3 text-center text-gray-500">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-doan-500 mx-auto mb-2"></div>
                            Đang tải...
                        </div>
                    ) : filteredOptions.length === 0 ? (
                        <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                            {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Không có mục nào khả dụng'}
                        </div>
                    ) : (
                        filteredOptions.map((option, index) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => handleAddTag(option)}
                                className={`
                  w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                  ${index === focusedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''}
                `}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {option.label}
                                        </div>
                                        {option.description && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {option.description}
                                            </div>
                                        )}
                                    </div>
                                    <Plus className="w-4 h-4 text-gray-400" />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* Helper text */}
            {selectedTags.length >= maxTags && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Đã đạt giới hạn tối đa {maxTags} mục
                </p>
            )}
        </div>
    );
};

export default TagInput;
