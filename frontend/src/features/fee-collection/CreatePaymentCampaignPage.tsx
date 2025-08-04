import React, { useState, useEffect } from 'react';
import PaymentCampaignForm from './components/admin/PaymentCampaignForm';
import { Organization } from './types';

// Temporary service to get organizations - this would use the existing organizations service
const getOrganizations = async (): Promise<Organization[]> => {
  const response = await fetch('/api/organizations');
  if (!response.ok) {
    throw new Error('Failed to fetch organizations');
  }
  const result = await response.json();
  return result || [];
};

const CreatePaymentCampaignPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await getOrganizations();
      setOrganizations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-32 h-32 border-b-2 border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 text-red-700 border border-red-200 rounded bg-red-50 dark:bg-red-900 dark:border-red-800 dark:text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 mx-auto">
      <PaymentCampaignForm 
        organizations={organizations} 
        mode="create"
      />
    </div>
  );
};

export default CreatePaymentCampaignPage;
