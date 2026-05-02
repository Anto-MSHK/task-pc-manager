import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { OrdersPage } from './pages/OrdersPage';
import { PromoUsagesPage } from './pages/PromoUsagesPage';
import { PromocodesPage } from './pages/PromocodesPage';
import { RegisterPage } from './pages/RegisterPage';
import { UsersAnalyticsPage } from './pages/UsersAnalyticsPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/analytics/users" element={<UsersAnalyticsPage />} />
          <Route path="/analytics/promocodes" element={<PromocodesPage />} />
          <Route path="/analytics/promo-usages" element={<PromoUsagesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
