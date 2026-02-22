import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { onAuthChange, getOrCreateProfile, handleRedirectResult } from '@/services/firebase/auth'
import { firebaseReady } from '@/config/firebase'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { ThemeSetting } from '@/stores/settingsStore'
import { ModeProvider } from '@/context/ModeContext'
import ClinicalLayout from '@/components/layout/ClinicalLayout'
import { Spinner } from '@/components/ui'

// Pages
import Login from '@/pages/Login'
import ModeSelectionPage from '@/pages/ModeSelectionPage'
import PatientListPage from '@/pages/PatientListPage'
import PatientDetailPage from '@/pages/PatientDetailPage'
import TasksPage from '@/pages/TasksPage'
import HandoverPage from '@/pages/HandoverPage'
import LabAnalysisPage from '@/pages/LabAnalysisPage'
import AIAssistantPage from '@/pages/AIAssistantPage'
import OnCallPage from '@/pages/OnCallPage'
import ClerkingPage from '@/pages/ClerkingPage'
import SettingsPage from '@/pages/SettingsPage'
import PrivacyPage from '@/pages/PrivacyPage'
import TermsPage from '@/pages/TermsPage'
import NotFoundPage from '@/pages/NotFoundPage'

// ---------------------------------------------------------------------------
// Theme effect — manages the .dark class on <html> based on user preference
// ---------------------------------------------------------------------------

function applyThemeClass(theme: ThemeSetting) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
}

function useThemeEffect() {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    applyThemeClass(theme)

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyThemeClass('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ward-bg">
        <Spinner size="lg" label="Loading..." />
      </div>
    )
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />

      {/* Mode selection */}
      <Route
        path="/mode"
        element={
          <AuthGate>
            <ModeSelectionPage />
          </AuthGate>
        }
      />

      {/* Authenticated routes with clinical layout */}
      <Route
        element={
          <AuthGate>
            <ClinicalLayout />
          </AuthGate>
        }
      >
        <Route index element={<PatientListPage />} />
        <Route path="patients" element={<Navigate to="/" replace />} />
        <Route path="patients/:id" element={<PatientDetailPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="handover" element={<HandoverPage />} />
        <Route path="labs" element={<LabAnalysisPage />} />
        <Route path="ai" element={<AIAssistantPage />} />
        <Route path="drugs" element={<Navigate to="/ai" replace />} />
        <Route path="on-call" element={<OnCallPage />} />
        <Route path="shift" element={<Navigate to="/on-call" replace />} />
        <Route path="clerking" element={<ClerkingPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  useThemeEffect()
  const { setFirebaseUser, setUser, setLoading } = useAuthStore()
  const [firebaseOk, setFirebaseOk] = useState(false)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const init = async () => {
      const ready = await firebaseReady
      setFirebaseOk(ready)

      if (!ready) {
        setLoading(false)
        return
      }

      // Handle redirect result for Google auth
      await handleRedirectResult()

      unsubscribe = onAuthChange(async (fbUser) => {
        setFirebaseUser(fbUser)

        if (fbUser) {
          try {
            const profile = await getOrCreateProfile(fbUser)
            setUser(profile)
            useSettingsStore.getState().hydrateFromPreferences(profile.preferences)
          } catch {
            setUser(null)
          }
        } else {
          setUser(null)
        }

        setLoading(false)

        // Remove splash screen
        const splash = document.getElementById('splash-screen')
        if (splash) {
          splash.classList.add('hidden')
          setTimeout(() => splash.remove(), 500)
        }
      })
    }

    init()
    return () => unsubscribe?.()
  }, [setFirebaseUser, setUser, setLoading])

  if (!firebaseOk && !useAuthStore.getState().loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ward-bg">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-ward-text mb-2">Configuration Error</h1>
          <p className="text-slate-500 dark:text-slate-400">Firebase is not configured. Check your environment variables.</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <ModeProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '10px',
              background: '#fff',
              color: '#0f172a',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
              padding: '12px 16px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#dc2626', secondary: '#fff' },
            },
          }}
        />
      </ModeProvider>
    </BrowserRouter>
  )
}
