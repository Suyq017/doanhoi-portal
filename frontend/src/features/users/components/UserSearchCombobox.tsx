import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface User {
    id: string;
    code: string;
    familyName: string;
    givenName: string;
    email: string;
    phone?: string;
}

interface UserSearchComboboxProps {
    users: User[];
    selectedUser: User | null;
    onUserSelect: (user: User | null) => void;
    loading?: boolean;
    disabled?: boolean;
    placeholder?: string;
    error?: string;
    className?: string;
}

const UserSearchCombobox: React.FC<UserSearchComboboxProps> = ({
    users,
    selectedUser,
    onUserSelect,
    loading = false,
    disabled = false,
    placeholder,
    error,
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

    // Filter users based on search term
    const filteredUsers = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
            user.familyName.toLowerCase().includes(searchLower) ||
            user.givenName.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower) ||
            user.code.toLowerCase().includes(searchLower) ||
            `${user.familyName} ${user.givenName}`.toLowerCase().includes(searchLower)
        );
    });    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            // Check if click is inside combobox or dropdown
            if (comboboxRef.current && !comboboxRef.current.contains(target)) {
                // Don't close if user is in the process of selecting
                if (!isSelecting) {
                    console.log('Outside click detected, closing dropdown');
                    setIsOpen(false);
                    setSearchTerm('');
                    setHighlightedIndex(-1);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSelecting]);

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
                        prev < filteredUsers.length - 1 ? prev + 1 : 0
                    );
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (isOpen) {
                    setHighlightedIndex(prev =>
                        prev > 0 ? prev - 1 : filteredUsers.length - 1
                    );
                }
                break;

            case 'Enter':
                e.preventDefault();
                if (isOpen && highlightedIndex >= 0 && filteredUsers[highlightedIndex]) {
                    handleUserSelect(filteredUsers[highlightedIndex]);
                }
                break;

            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
                break;
        }
    }; const handleUserSelect = (user: User) => {
        console.log('handleUserSelect called with:', user);
        console.log('onUserSelect function:', typeof onUserSelect);

        // Set selecting flag to prevent outside click
        setIsSelecting(true);

        // Call the parent callback immediately
        onUserSelect(user);

        // Close dropdown and reset state
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);

        // Reset selecting flag
        setTimeout(() => {
            setIsSelecting(false);

            // Focus back to input after selection
            if (inputRef.current) {
                inputRef.current.blur();
            }
        }, 100);
    };

    const handleClearSelection = () => {
        onUserSelect(null);
        setSearchTerm('');
        inputRef.current?.focus();
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

    const displayValue = selectedUser
        ? `${selectedUser.familyName} ${selectedUser.givenName} (${selectedUser.email})`
        : ''; return (
            <div className={`relative ${className}`} ref={comboboxRef}>
                {/* Input Field */}
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={isOpen ? searchTerm : displayValue}
                        onChange={handleInputChange}
                        onClick={handleInputClick}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder || t('users:grantPermissions.userSearch')}
                        disabled={disabled || loading}
                        className={`w-full px-4 py-2 pr-16 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-doan-500 focus:border-doan-500 transition-colors ${error
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-600'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        autoComplete="off"
                    />

                    {/* Right side icons */}
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">          {selectedUser && !disabled && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleClearSelection();
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            type="button"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                        <ChevronDown
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                                }`}
                        />
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {error}
                    </p>
                )}            {/* Dropdown Portal */}
                {isOpen && createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            top: position.top,
                            left: position.left,
                            width: position.width,
                            maxHeight: position.maxHeight,
                            zIndex: 10000,
                        }}
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg overflow-auto pointer-events-auto"
                        onMouseDown={(e) => {
                            // Prevent outside click when clicking inside dropdown
                            e.stopPropagation();
                        }}
                    >
                        {loading ? (
                            <div className="px-4 py-2 flex justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-doan-500"></div>
                            </div>) : filteredUsers.length > 0 ? (
                                <ul ref={listRef} className="py-1">
                                    {filteredUsers.map((user, index) => (<li key={user.id}>
                                        <button
                                            type="button"
                                            onMouseDown={(e) => {
                                                // Prevent default and set selecting flag
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsSelecting(true);
                                                console.log('Mouse down on user button');
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                console.log('User clicked:', user.familyName, user.givenName);
                                                handleUserSelect(user);
                                            }}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${index === highlightedIndex
                                                    ? 'bg-doan-50 dark:bg-doan-900/20 text-doan-700 dark:text-doan-300'
                                                    : 'text-gray-900 dark:text-white'
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                <User className="w-4 h-4 mr-3 text-gray-400" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">
                                                        {user.familyName} {user.givenName}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                        {user.email} • {user.code}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                    ))}
                                </ul>
                            ) : (
                            <div className="px-4 py-2 text-center text-gray-500 dark:text-gray-400">
                                <User className="w-4 h-4 mx-auto mb-2" />
                                {searchTerm
                                    ? `Không tìm thấy người dùng "${searchTerm}"`
                                    : 'Không có người dùng nào'
                                }
                            </div>
                        )}
                    </div>,
                    document.body
                )}
            </div>
        );
};

export default UserSearchCombobox;
