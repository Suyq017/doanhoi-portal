import React from 'react';
import PaymentFeeLevelForm from './components/admin/PaymentFeeLevelForm';

const EditPaymentFeeLevelPage: React.FC = () => {
  return (
    <div className="container px-4 py-6 mx-auto">
      <PaymentFeeLevelForm mode="edit" />
    </div>
  );
};

export default EditPaymentFeeLevelPage;
