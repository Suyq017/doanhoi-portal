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
import { ClassesPage } from './features/classes';
import './i18n';
import { OrganizationStatsProvider } from './features/organizations/context/OrganizationStatsContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <Router>
          <Layout>
            <OrganizationStatsProvider>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route path="/organizations/:type/:code" element={<OrganizationsDetailPage />} />
                <Route path="/organizations/:parentType/:parentCode/:type/:code" element={<OrganizationsSubDetailPage />} />
                <Route path="/departments" element={<DepartmentsPage />} />
                <Route path="/classes" element={<ClassesPage />} />
              </Routes>
            </OrganizationStatsProvider>
          </Layout>
        </Router>
      </Suspense>
    </QueryClientProvider>
  );
}

export default App;
