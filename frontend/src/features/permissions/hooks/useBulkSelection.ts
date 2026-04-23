import { useState, useEffect, useCallback } from 'react';

export interface UseBulkSelectionReturn {
    selectedItems: Set<string>;
    isSelectAllChecked: boolean;
    handleSelectItem: (itemId: string, checked: boolean) => void;
    handleSelectAll: (checked: boolean, selectableItems: any[]) => void;
    clearSelection: () => void;
    getSelectedCount: () => number;
}

export const useBulkSelection = (
    items: any[],
    isItemSelectable?: (item: any) => boolean
): UseBulkSelectionReturn => {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isSelectAllChecked, setIsSelectAllChecked] = useState(false);

    // Reset selections when items change
    useEffect(() => {
        setSelectedItems(new Set());
        setIsSelectAllChecked(false);
    }, [items]);

    const handleSelectItem = useCallback((itemId: string, checked: boolean) => {
        const newSelected = new Set(selectedItems);
        if (checked) {
            newSelected.add(itemId);
        } else {
            newSelected.delete(itemId);
        }
        setSelectedItems(newSelected);

        // Update select all checkbox
        const selectableItems = isItemSelectable
            ? items.filter(isItemSelectable)
            : items;
        const allSelectableSelected = selectableItems.every(item => newSelected.has(item.id));
        setIsSelectAllChecked(allSelectableSelected && selectableItems.length > 0);
    }, [selectedItems, items, isItemSelectable]);

    const handleSelectAll = useCallback((checked: boolean, selectableItems: any[]) => {
        if (checked) {
            const newSelected = new Set(selectableItems.map(item => item.id));
            setSelectedItems(newSelected);
        } else {
            setSelectedItems(new Set());
        }
        setIsSelectAllChecked(checked);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedItems(new Set());
        setIsSelectAllChecked(false);
    }, []);

    const getSelectedCount = useCallback(() => {
        return selectedItems.size;
    }, [selectedItems]);

    return {
        selectedItems,
        isSelectAllChecked,
        handleSelectItem,
        handleSelectAll,
        clearSelection,
        getSelectedCount,
    };
};
