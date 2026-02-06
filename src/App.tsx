import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { PatientDetailPage } from '@/pages/PatientDetailPage'
import { TasksPage } from '@/pages/TasksPage'
import { HandoverPage } from '@/pages/HandoverPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { useAuthStore } from '@/stores/authStore'
import { onAuthChange, getUserProfile } from '@/services/firebase/auth'

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

  if (!firebaseUser || !user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  const setFirebaseUser = useAuthStore((s) => s.setFirebaseUser)
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid)
          setUser(profile)
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
    <BrowserRouter>
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
  )
}
