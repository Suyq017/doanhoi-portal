import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Suspense } from 'react';
import { Layout } from './shared';
import { DashboardPage } from './features/dashboard';
import { UsersPage } from './features/users';
import { OrganizationsPage } from './features/organizations';
import { DepartmentsPage } from './features/departments';
import { OrganizationsDetailPage } from './features/organizations';
import { OrganizationsSubDetailPage } from './features/organizations';
import { OrganizationMembersPage } from './features/organizations';
import { ClassesPage } from './features/classes';
import { AuthProvider, AuthCallback } from './features/auth';
import { PaymentCampaignsPage } from './pages/admin/PaymentCampaignsPage';
import CreatePaymentCampaignPage from './pages/admin/CreatePaymentCampaignPage';
import PaymentCampaignDetailPage from './pages/admin/PaymentCampaignDetailPage';
// Removed: PaymentHistoryPage import
import { PaymentResultPage } from './pages/member/PaymentResultPage';
import { MyCampaignsPage } from './pages/member/MyCampaignsPage';
import './i18n';
import { OrganizationStatsProvider } from './features/organizations/context/OrganizationStatsContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
          <Router>
            <Layout>
              <OrganizationStatsProvider>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/users" element={<UsersPage />} />                
                  <Route path="/organizations" element={<OrganizationsPage />} />
                  <Route path="/organizations/:type/:code" element={<OrganizationsDetailPage />} />
                  <Route path="/organizations/:type/:code/members" element={<OrganizationMembersPage />} />
                  <Route path="/organizations/:parentType/:parentCode/:type/:code" element={<OrganizationsSubDetailPage />} />
                  <Route path="/organizations/:parentType/:parentCode/:type/:code/members" element={<OrganizationMembersPage />} />
                  <Route path="/departments" element={<DepartmentsPage />} />
                  <Route path="/classes" element={<ClassesPage />} />
              
                  {/* Admin Payment Routes */}
                  <Route path="/admin/payment-campaigns" element={<PaymentCampaignsPage />} />
                  <Route path="/admin/payment-campaigns/create" element={<CreatePaymentCampaignPage />} />
                  <Route path="/admin/payment-campaigns/:id" element={<PaymentCampaignDetailPage />} />
                  
                  {/* Member Payment Routes */}
                  <Route path="/payment/my-campaigns" element={<MyCampaignsPage />} />
                  <Route path="/payment-result/:orderCode" element={<PaymentResultPage />} />

                  { /* Authentication Callback */}
                  <Route path="/auth/callback" element={<AuthCallback />} />
                </Routes>
              </OrganizationStatsProvider>
            </Layout>
          </Router>
        </Suspense>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
