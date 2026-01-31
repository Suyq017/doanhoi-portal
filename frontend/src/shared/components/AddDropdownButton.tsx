import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

export interface DropdownOption {
  key: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  onClick: () => void;
}

interface AddDropdownButtonProps {
  label: string;
  options: DropdownOption[];
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
}

const AddDropdownButton: React.FC<AddDropdownButtonProps> = ({
  label,
  options,
  loading = false,
  disabled = false,
  className = '',
  buttonClassName = '',
  dropdownClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMainButtonClick = () => {
    if (loading || disabled) return;
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option: DropdownOption) => {
    if (loading || disabled) return;

    setIsOpen(false);
    option.onClick();
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Main Button */}
      <button
        onClick={handleMainButtonClick}
        disabled={loading || disabled}
        className={`inline-flex items-center px-4 py-2 bg-doan-500 text-white rounded-md hover:bg-doan-600 focus:outline-none focus:ring-2 focus:ring-doan-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isOpen ? 'bg-doan-600' : ''
          } ${buttonClassName}`}
      >
        <Plus className="w-5 h-5 mr-2" />
        <span className="font-medium">
          {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-200/30 border-t-white inline-block"></div> : label}
        </span>
        <ChevronDown
          className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 transform transition-all duration-200 origin-top-right ${dropdownClassName}`}>
          <div className="py-1">
            {options.map((option, index) => (
              <React.Fragment key={option.key}>
                {index > 0 && <hr className="border-gray-200 dark:border-gray-600" />}
                <button
                  onClick={() => handleOptionClick(option)}
                  disabled={loading || disabled}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {option.icon && (
                    <div className="w-4 h-4 mr-3 text-gray-400">
                      {option.icon}
                    </div>
                  )}
                  <div className="text-left">
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {option.description}
                      </div>
                    )}
                  </div>
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddDropdownButton;
