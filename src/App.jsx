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
import { configMissing } from './config/firebase.config';

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
// Config Error - Shown when Firebase env vars are missing
// =============================================================================
function ConfigError() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '24px', background: '#f3f4f6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        maxWidth: '480px', background: 'white', borderRadius: '16px',
        padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: '#fef2f2', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
          fontSize: '28px',
        }}>!</div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          Firebase Not Configured
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6 }}>
          Create a <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>.env</code> file
          in the project root with your Firebase config:
        </p>
        <pre style={{
          textAlign: 'left', background: '#1f2937', color: '#e5e7eb',
          padding: '16px', borderRadius: '8px', fontSize: '12px',
          marginTop: '16px', overflow: 'auto', lineHeight: 1.6,
        }}>
{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}
        </pre>
        <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '12px' }}>
          Then rebuild: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>npm run build</code>
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// App - Root component with all providers
// =============================================================================
export default function App() {
  if (configMissing) {
    return <ConfigError />;
  }

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
