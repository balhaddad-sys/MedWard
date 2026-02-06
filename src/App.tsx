import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Component, useEffect, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { PatientDetailPage } from '@/pages/PatientDetailPage'
import { TasksPage } from '@/pages/TasksPage'
import { HandoverPage } from '@/pages/HandoverPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { useAuthStore } from '@/stores/authStore'
import { onAuthChange, getUserProfile } from '@/services/firebase/auth'
import { initRemoteConfig } from '@/config/remoteConfig'
import { MaintenanceBanner } from '@/components/ui/SafetyBanner'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[MedWard Error]', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
            <h1 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-600 mb-4">{this.state.error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
              Reload App
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const loading = useAuthStore((s) => s.loading)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ward-bg">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-3 border-primary-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-ward-muted mt-4">Loading MedWard Pro...</p>
        </div>
      </div>
    )
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  const setFirebaseUser = useAuthStore((s) => s.setFirebaseUser)
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)
  const [_configReady, setConfigReady] = useState(false)

  useEffect(() => {
    initRemoteConfig()
      .then(() => setConfigReady(true))
      .catch(() => setConfigReady(true))
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid)
          if (profile) {
            setUser(profile)
          } else {
            setUser({
              id: firebaseUser.uid,
              displayName: firebaseUser.displayName ?? 'User',
              email: firebaseUser.email ?? '',
              role: 'physician',
              department: '',
              wardIds: [],
              preferences: {
                defaultWard: '',
                defaultMode: 'clinical',
                notificationSettings: { criticalLabs: true, taskReminders: true, handoverAlerts: true },
                displaySettings: { compactView: false, showAISuggestions: true, labTrendDays: 7 },
              },
              createdAt: null as unknown as import('firebase/firestore').Timestamp,
              lastLoginAt: null as unknown as import('firebase/firestore').Timestamp,
            })
          }
        } catch {
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [setFirebaseUser, setUser, setLoading])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <MaintenanceBanner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Dashboard />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/handover" element={<HandoverPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
