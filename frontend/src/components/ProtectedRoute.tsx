import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute() {
  const location = useLocation();
  const hasSession = useAuthStore((state) => state.hasSession);
  const logout = useAuthStore((state) => state.logout);

  if (!hasSession()) {
    logout();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
