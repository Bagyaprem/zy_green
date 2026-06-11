import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Navbar } from './components/Navbar/Navbar';
import { Footer } from './components/Footer/Footer';
import { LandingPage } from './pages/LandingPage/LandingPage';
import { AuthPage } from './pages/AuthPage/AuthPage';
import { DashboardPage } from './pages/DashboardPage/DashboardPage';
import { HistoryPage } from './pages/HistoryPage/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage/AnalyticsPage';
import { ReportsPage } from './pages/ReportsPage/ReportsPage';
import { useAppStore } from './store/useAppStore';
import './App.css';

function App() {
  const { loadReadings, stopRealtime } = useAppStore();

  useEffect(() => {
    loadReadings();
    return () => stopRealtime();
  }, []);

  return (
    <BrowserRouter>
      <div className="app-root">
        {/* Navigation header */}
        <Navbar />

        {/* Console & Landing workspaces */}
        <div className="main-viewport">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />

            {/* Publicly accessible console pages */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/reports" element={<ReportsPage />} />

            {/* 404 Fallback redirection */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Global Footer */}
        <Footer />

        {/* System Alert Overlay Toasts */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(11, 17, 41, 0.9)',
              color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
              fontSize: '13px',
              borderRadius: '12px',
            },
            duration: 4000,
          }}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
