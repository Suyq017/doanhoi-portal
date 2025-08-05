import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Suspense } from 'react';
import { Layout } from './shared';
import { AppLoadingScreen } from './shared/components/AppLoadingScreen';
import { DashboardPage } from './features/dashboard';
import { UsersPage } from './features/users';
import { OrganizationsPage } from './features/organizations';
import { DepartmentsPage } from './features/departments';
import { OrganizationsDetailPage } from './features/organizations';
import { OrganizationsSubDetailPage } from './features/organizations';
import { OrganizationMembersPage } from './features/organizations';
import { ClassesPage } from './features/classes';
import { PermissionsPage } from './features/permissions';
import { AuthProvider, AuthCallback, LoginPage, ProtectedRoute, EnhancedProtectedRoute, AuthGuard } from './features/auth';
import './i18n';
import { OrganizationStatsProvider } from './features/organizations/context/OrganizationStatsContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>        <Suspense fallback={<AppLoadingScreen />}>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Protected Routes wrapped in AuthGuard */}
            <Route
              path="/*"
              element={
                <AuthGuard>
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <OrganizationStatsProvider>
                              <DashboardPage />
                            </OrganizationStatsProvider>
                          </Layout>
                        </ProtectedRoute>
                      }
                    />                <Route
                      path="/users"
                      element={
                        <EnhancedProtectedRoute requiredPermissions={['users.access']}>
                          <Layout>
                            <OrganizationStatsProvider>
                              <UsersPage />
                            </OrganizationStatsProvider>
                          </Layout>
                        </EnhancedProtectedRoute>
                      }
                    />                <Route
                      path="/organizations"
                      element={
                        <EnhancedProtectedRoute requiredPermissions={['organizations.access']}>
                          <Layout>
                            <OrganizationStatsProvider>
                              <OrganizationsPage />
                            </OrganizationStatsProvider>
                          </Layout>
                        </EnhancedProtectedRoute>
                      }
                    />                <Route
                      path="/organizations/:type/:code"
                      element={
                        <EnhancedProtectedRoute requiredPermissions={['organizations.access']}>
                          <Layout>
                            <OrganizationStatsProvider>
                              <OrganizationsDetailPage />
                            </OrganizationStatsProvider>
                          </Layout>
                        </EnhancedProtectedRoute>
                      }
                    />                <Route
                      path="/organizations/:type/:code/members"
                      element={
                        <EnhancedProtectedRoute requiredPermissions={['organizations.access']}>
                          <Layout>
                            <OrganizationStatsProvider>
                              <OrganizationMembersPage />
                            </OrganizationStatsProvider>
                          </Layout>
                        </EnhancedProtectedRoute>
                      }
                    />                <Route
                      path="/organizations/:parentType/:parentCode/:type/:code"
                      element={
                        <EnhancedProtectedRoute requiredPermissions={['organizations.access']}>
                          <Layout>
                            <OrganizationStatsProvider>
                              <OrganizationsSubDetailPage />
                            </OrganizationStatsProvider>
                          </Layout>
                        </EnhancedProtectedRoute>
                      }
                    />                <Route
                      path="/organizations/:parentType/:parentCode/:type/:code/members"
                      element={
                        <EnhancedProtectedRoute requiredPermissions={['organizations.access']}>
                          <Layout>
                            <OrganizationStatsProvider>
                              <OrganizationMembersPage />
                            </OrganizationStatsProvider>
                          </Layout>
                        </EnhancedProtectedRoute>
                      }
                    />                <Route
                      path="/departments"
                      element={
                        <EnhancedProtectedRoute requiredPermissions={['departments.access']}>
                          <Layout>
                            <OrganizationStatsProvider>
                              <DepartmentsPage />
                            </OrganizationStatsProvider>
                          </Layout>
                        </EnhancedProtectedRoute>
                      }
                    />                <Route
                      path="/classes"
                      element={
                        <EnhancedProtectedRoute requiredPermissions={['classes.access']}>
                          <Layout>
                            <OrganizationStatsProvider>
                              <ClassesPage />
                            </OrganizationStatsProvider>
                          </Layout>
                        </EnhancedProtectedRoute>
                      }
                    />                <Route
                      path="/permissions"
                      element={
                        <EnhancedProtectedRoute requiredPermissions={['permissions.access']}>
                          <Layout>
                            <OrganizationStatsProvider>
                              <PermissionsPage />
                            </OrganizationStatsProvider>
                          </Layout>
                        </EnhancedProtectedRoute>
                      }
                    />
                  </Routes>
                </AuthGuard>
              }
            />
          </Routes>
        </Router>
      </Suspense>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
