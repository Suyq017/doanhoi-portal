import React from 'react';
import PaymentCampaignForm from '../../components/admin/PaymentCampaignForm';

const CreatePaymentCampaignPage: React.FC = () => {
  return (
    <div className="container px-4 py-6 mx-auto">
      <PaymentCampaignForm 
        mode="create"
      />
    </div>
  );
};

export default CreatePaymentCampaignPage;
