// Fee Collection Module Exports

// Admin Pages
export { default as PaymentCampaignsPage } from './page/admin/PaymentCampaignsPage';
export { default as PaymentCampaignDetailPage } from './page/admin/PaymentCampaignDetailPage';

// Member Pages
export { default as MyCampaignsPage } from './page/member/MyCampaignsPage';
export { default as PaymentResultPage } from './page/member/PaymentResultPage';

// Admin Components
export { default as PaymentCampaignList } from './components/admin/PaymentCampaignList';
export { default as PaymentCampaignForm } from './components/admin/PaymentCampaignForm';
export { default as FeeLevelManager } from './components/admin/FeeLevelManager';

// Shared Components
export * from './components/shared';

// Types
export type {
  PaymentCampaign,
  PaymentFeeLevel,
  PaymentAssignment,
  CreatePaymentCampaignDto,
  CreatePaymentFeeLevelDto,
  CreatePaymentAssignmentDto
} from './types';

// Hook Types
export type {
  UsePaymentCampaignsPageReturn,
  UsePaymentCampaignDetailReturn,
  UseMyCampaignsPageReturn,
  UsePaymentResultPageReturn,
  MyCampaignsFilters,
  MyCampaignsSummaryStats,
  CampaignStatusAction,
  DetailTab
} from './types';

// Data Hooks
export { usePaymentCampaigns, usePaymentCampaign, useCreatePaymentCampaign, useUpdatePaymentCampaign, useDeletePaymentCampaign } from './hooks/usePaymentCampaigns';
export { usePaymentAssignments } from './hooks/usePaymentAssignments';
export { useMyPaymentAssignments } from './hooks/useMyPaymentAssignments';

// Page Hooks
export { usePaymentCampaignsPage } from './hooks/usePaymentCampaignsPage';
export { usePaymentCampaignDetail } from './hooks/usePaymentCampaignDetail';
export { useMyCampaignsPage } from './hooks/useMyCampaignsPage';

