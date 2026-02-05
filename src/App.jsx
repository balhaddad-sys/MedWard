/**
 * MedWard Pro - Main Application Component
 * v9.0.0
 * 
 * Root component with routing, auth protection, and providers
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuthContext, RequireAuth } from './context/AuthContext';
import { ToastProvider } from './hooks/useToast';
import { ThemeProvider } from './hooks/useTheme';
import { AppHeader, BottomNav, PageContainer } from './components/layout';
import Spinner, { LoadingOverlay } from './components/ui/Spinner';

// Lazy-loaded pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Patients = lazy(() => import('./pages/Patients'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));

// =============================================================================
// App Layout - Authenticated shell with header + bottom nav
// =============================================================================
function AppLayout() {
  const location = useLocation();
  
  // Determine active tab from path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/patients')) return 'patients';
    if (path.startsWith('/ai')) return 'ai';
    if (path.startsWith('/settings')) return 'settings';
    return 'dashboard';
  };

  return (
    <div className="app-shell" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '100dvh',
    }}>
      <AppHeader />
      
      <main 
        id="main-content"
        style={{
          flex: 1,
          overflow: 'auto',
          paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Suspense fallback={<LoadingOverlay />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:patientId" element={<Patients />} />
            <Route path="/ai" element={<AIAssistant />} />
            <Route path="/ai/:tool" element={<AIAssistant />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      <BottomNav activeTab={getActiveTab()} />
    </div>
  );
}

// =============================================================================
// Auth Router - Switches between login and authenticated app
// =============================================================================
function AuthRouter() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" replace /> : (
          <Suspense fallback={<LoadingOverlay />}>
            <Login />
          </Suspense>
        )} 
      />
      <Route 
        path="/*" 
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        } 
      />
    </Routes>
  );
}

// =============================================================================
// App - Root component with all providers
// =============================================================================
export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AuthRouter />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
