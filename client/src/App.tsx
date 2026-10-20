import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/auth/AuthPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ClientProjectPage } from './pages/ClientProjectPage';

const ProtectedDashboard = () => {
  const { user, loading, error } = useAuth();

  if (loading) {
    return <div className="route-status">Opening your studio…</div>;
  }

  if (error) {
    return (
      <div className="route-status" role="alert">
        {error} Refresh the page to try again.
      </div>
    );
  }

  return user ? <DashboardPage /> : <Navigate to="/login" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/signup" element={<AuthPage mode="signup" />} />
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/share/:token" element={<ClientProjectPage />} />
    <Route path="/dashboard/*" element={<ProtectedDashboard />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);
