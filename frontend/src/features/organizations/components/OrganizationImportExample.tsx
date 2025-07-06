// Example usage of useOrganizationImport hook

import React from 'react';
import { useOrganizationImport } from '../hooks/useOrganizationImport';
import { ImportModal } from '../../../shared';

interface OrganizationImportExampleProps {
    organizationId: string;
    level: 2 | 3;
    onImportSuccess?: () => void;
}

export const OrganizationImportExample: React.FC<OrganizationImportExampleProps> = ({
    organizationId,
    level,
    onImportSuccess
}) => {
    const {
        importConfig,
        isImporting,
        isImportModalOpen,
        openImportModal,
        closeImportModal
    } = useOrganizationImport({
        level,
        organizationId,
        onSuccess: () => {
            console.log('Import successful!');
            onImportSuccess?.();
        },
        onError: (error) => {
            console.error('Import failed:', error.message);
        }
    });

    return (
        <div>
            <button
                onClick={openImportModal}
                disabled={isImporting}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
                {isImporting ? 'Importing...' : 'Import Members'}
            </button>

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={closeImportModal}
                config={importConfig}
            />
        </div>
    );
};
