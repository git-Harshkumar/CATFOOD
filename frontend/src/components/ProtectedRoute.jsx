import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-black text-xl text-neo-ink">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin bypasses all role restrictions
  const isGlobalAdmin = !!user?.isGlobalAdmin || user?.role === 'ADMIN';

  const userRoles = Array.isArray(user?.role) ? user.role : [user?.role];
  const hasRequiredRole =
    allowedRoles.length === 0 ||
    isGlobalAdmin ||
    allowedRoles.some((role) => userRoles.includes(role));

  if (!hasRequiredRole) {
    return <Navigate to="/unauthorized" state={{ attemptedPath: location.pathname }} replace />;
  }

  return <Outlet />;
};
