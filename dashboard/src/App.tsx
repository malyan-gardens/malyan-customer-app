import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Finance from './pages/Finance';
import Orders from './pages/Orders/index';
import Customers from './pages/Customers/index';
import Maintenance from './pages/Maintenance/index';
import Design from './pages/Design/index';
import Promotions from './pages/Promotions/index';
import Notifications from './pages/Notifications/index';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div style={{
        minHeight: '100vh',
        background: '#080e0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#4cdf80',
        fontFamily: 'Cairo, Tajawal, sans-serif',
        fontSize: '18px',
      }}>
        🌿 جاري التحميل...
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="finance" element={<Finance />} />
          <Route path="orders" element={<Orders />} />
          <Route path="customers" element={<Customers />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="design" element={<Design />} />
          <Route path="promotions" element={<Promotions />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}