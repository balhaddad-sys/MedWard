import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WardPage from './pages/WardPage';
import PatientDetailPage from './pages/PatientDetailPage';
import AIToolsPage from './pages/AIToolsPage';
import ReferencePage from './pages/ReferencePage';
import SettingsPage from './pages/SettingsPage';
import ClinicalModesPage from './pages/ClinicalModesPage';
import { ToastContainer } from './components/ui/Toast';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-trust-blue border-t-transparent rounded-full" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    const unsubscribe = init();
    return () => unsubscribe();
  }, [init]);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/ward/:wardId" element={<WardPage />} />
                  <Route path="/patient/:patientId" element={<PatientDetailPage />} />
                  <Route path="/ai" element={<AIToolsPage />} />
                  <Route path="/reference" element={<ReferencePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/clinical" element={<ClinicalModesPage />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
