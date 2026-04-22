import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
  searchText?: string; // Optional text to search in (if different from label)
}

interface SearchableComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
}

const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = "Chọn...",
  disabled = false,
  className = "",
  loading = false,
  emptyMessage = "Không có dữ liệu"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);  // Filter options based on search term - with safety checks
  const filteredOptions = (options || []).filter(option =>
    option &&
    option.label &&
    typeof option.label === 'string' &&
    option.value !== undefined &&
    option.value !== null &&
    (option.searchText || option.label).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get display value - with safety checks
  const selectedOption = (options || []).find(option =>
    option && option.value === value
  );
  const displayValue = selectedOption && selectedOption.label ? selectedOption.label : '';

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
            onChange(filteredOptions[focusedIndex].value);
            setIsOpen(false);
            setSearchTerm('');
            setFocusedIndex(-1);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          setFocusedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, filteredOptions, onChange]);

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  const handleToggle = () => {
    if (disabled) return;

    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setFocusedIndex(-1);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Main Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-doan-500 focus:border-doan-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:disabled:bg-gray-600 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer'
          } ${isOpen ? 'ring-2 ring-doan-500 border-doan-500' : ''} transition-colors duration-200`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center justify-between">
          <span className={`block truncate ${!displayValue ? 'text-gray-500 dark:text-gray-400' : ''}`}>
            {displayValue || placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg dark:bg-gray-700 dark:border-gray-600">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-500 transform -translate-y-1/2 left-2 top-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Tìm kiếm..."
                className="w-full py-2 pl-8 pr-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-doan-500 focus:border-doan-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </div>

          {/* Options List */}
          <ul
            ref={listRef}
            className="py-1 overflow-auto max-h-60"
            role="listbox"
          >
            {loading ? (
              <li className="px-3 py-2 flex justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-doan-600"></div>
              </li>
            ) : filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Không tìm thấy kết quả' : emptyMessage}
              </li>
            ) : (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  className={`px-3 py-2 text-sm cursor-pointer transition-colors duration-150 flex items-center justify-between ${option.disabled
                    ? 'text-gray-400 cursor-not-allowed dark:text-gray-500'
                    : 'text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600'
                    } ${option.value === value
                      ? 'bg-doan-50 text-doan-600 dark:bg-doan-900/20 dark:text-doan-400'
                      : ''
                    } ${index === focusedIndex
                      ? 'bg-gray-100 dark:bg-gray-600'
                      : ''
                    }`}
                  role="option"
                  aria-selected={option.value === value}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <Check className="w-4 h-4 text-doan-600 dark:text-doan-400" />
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableCombobox;
