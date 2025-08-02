import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PaymentCampaignList from "./components/admin/PaymentCampaignList";
import { Organization } from "./types";

export const PaymentCampaignsPage = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    // Load organizations if needed
    // For now, using empty array
    setOrganizations([]);
  }, []);

  return (
    <div className="space-y-6 ">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Quản Lý Thu Phí
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Quản lý các đợt thu phí của hội
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/admin/payment-campaigns/create"
            className="flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-md bg-doan-500 hover:bg-doan-600"
          >
            <Plus className="w-4 h-4" />
            Tạo Đợt Mới
          </Link>
        </div>
      </div>

      {/* Payment Campaign List Component */}
      <PaymentCampaignList organizations={organizations} />
    </div>
  );
};

export default PaymentCampaignsPage;
