import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import ClinicalLayout from '@/layouts/ClinicalLayout'
import { ModeProvider } from '@/context/ModeContext'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { PatientDetailPage } from '@/pages/PatientDetailPage'
import { TasksPage } from '@/pages/TasksPage'
import { HandoverPage } from '@/pages/HandoverPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AIAssistantPage } from '@/pages/AIAssistantPage'
import { LabAnalysisPage } from '@/pages/LabAnalysisPage'
import { DrugInfoPage } from '@/pages/DrugInfoPage'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ModalController } from '@/components/layout/ModalController'
import { ToastContainer } from '@/components/ui/Toast'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { firebaseConfigMissing } from '@/config/firebase'
import { onAuthChange, getUserProfile } from '@/services/firebase/auth'
import { subscribeToAllPatients } from '@/services/firebase/patients'
import { subscribeToTasks } from '@/services/firebase/tasks'

function FirebaseConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-yellow-200 p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
          <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Firebase not configured</h1>
        <p className="text-sm text-gray-600 mb-4">
          Missing Firebase environment variables. Create a <code className="bg-gray-100 px-1 rounded">.env</code> file
          in the project root with your Firebase config. See <code className="bg-gray-100 px-1 rounded">.env.example</code> for the required variables.
        </p>
      </div>
    </div>
  )
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

  if (!firebaseUser || !user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function DataSubscriptions() {
  const setPatients = usePatientStore((s) => s.setPatients)
  const setTasks = useTaskStore((s) => s.setTasks)
  const setIsMobile = useUIStore((s) => s.setIsMobile)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setIsMobile])

  useEffect(() => {
    const unsubPatients = subscribeToAllPatients((patients) => {
      setPatients(patients)
    })
    const unsubTasks = subscribeToTasks((tasks) => {
      setTasks(tasks)
    })
    return () => {
      unsubPatients()
      unsubTasks()
    }
  }, [setPatients, setTasks])

  return null
}

export default function App() {
  const setFirebaseUser = useAuthStore((s) => s.setFirebaseUser)
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    if (firebaseConfigMissing) {
      setLoading(false)
      return
    }

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

  if (firebaseConfigMissing) {
    return <FirebaseConfigError />
  }

  return (
    <ErrorBoundary>
      <ModeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <DataSubscriptions />
                  <ClinicalLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/patients" element={<Dashboard />} />
              <Route path="/patients/:id" element={<PatientDetailPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/handover" element={<HandoverPage />} />
              <Route path="/ai" element={<AIAssistantPage />} />
              <Route path="/labs" element={<LabAnalysisPage />} />
              <Route path="/drugs" element={<DrugInfoPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ModeProvider>
    </ErrorBoundary>
  )
}
