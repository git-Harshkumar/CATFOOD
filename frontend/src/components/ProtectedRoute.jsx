import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center font-bold text-xl text-gray-500">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Handle both array of roles (if updated in future) or single role string
  const userRoles = Array.isArray(user?.role) ? user.role : [user?.role];
  const hasRequiredRole = allowedRoles.length === 0 || allowedRoles.some(role => userRoles.includes(role));

  if (!hasRequiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
