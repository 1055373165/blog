import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    // 保存用户试图访问的页面，登录后重定向
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !user?.is_admin) {
    // 非管理员用户访问管理员页面
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}