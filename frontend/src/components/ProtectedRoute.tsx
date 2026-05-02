import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute() {
  const location = useLocation();
  const isTokenValid = useAuthStore((state) => state.isTokenValid);
  const logout = useAuthStore((state) => state.logout);

  if (!isTokenValid()) {
    logout();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
