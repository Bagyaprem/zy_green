import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import styles from './ProtectedRoute.module.scss';
import './ProtectedRoute.css';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { session, profile } = useAppStore();

  if (!session) {
    // If not logged in, redirect to auth page
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // If logged in but role not allowed, redirect to home page
    return <Navigate to="/" replace />;
  }

  return children;
};
