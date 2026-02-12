import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import ClinicalLayout from '@/layouts/ClinicalLayout'
import { ModeProvider } from '@/context/ModeContext'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ModalController } from '@/components/layout/ModalController'
import { ToastContainer } from '@/components/ui/Toast'

const PatientDetailPage = lazy(() => import('@/pages/PatientDetailPage').then(m => ({ default: m.PatientDetailPage })))
const TasksPage = lazy(() => import('@/pages/TasksPage').then(m => ({ default: m.TasksPage })))
const HandoverPage = lazy(() => import('@/pages/HandoverPage').then(m => ({ default: m.HandoverPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const AIAssistantPage = lazy(() => import('@/pages/AIAssistantPage').then(m => ({ default: m.AIAssistantPage })))
const LabAnalysisPage = lazy(() => import('@/pages/LabAnalysisPage').then(m => ({ default: m.LabAnalysisPage })))
const DrugInfoPage = lazy(() => import('@/pages/DrugInfoPage').then(m => ({ default: m.DrugInfoPage })))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })))
const TermsPage = lazy(() => import('@/pages/TermsPage').then(m => ({ default: m.TermsPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

import { HIPAADisclaimer } from '@/components/HIPAADisclaimer'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { firebaseReady } from '@/config/firebase'
import { onAuthChange, getOrCreateProfile, handleRedirectResult } from '@/services/firebase/auth'
import { subscribeToAllPatients } from '@/services/firebase/patients'
import { subscribeToTasks } from '@/services/firebase/tasks'

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-3 border-primary-600 border-t-transparent rounded-full" />
    </div>
  )
}

function FirebaseConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg border border-yellow-200 p-8">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Firebase not configured</h1>
          <p className="text-sm text-gray-600 mb-4">
            Missing Firebase environment variables. Run the following to get started:
          </p>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <code className="text-sm text-green-400 block">
            <span className="text-gray-500"># Copy the example env file</span><br />
            cp .env.example .env<br /><br />
            <span className="text-gray-500"># Or use the setup script</span><br />
            npm run setup<br /><br />
            <span className="text-gray-500"># Start emulators + dev server</span><br />
            npm run firebase:emulators &amp; npm run dev
          </code>
        </div>
        <p className="text-xs text-gray-500 text-center">
          The default <code className="bg-gray-100 px-1 rounded">.env.example</code> is
          pre-configured for local Firebase emulators. For production, replace with
          your real Firebase credentials.
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
  const firebaseUser = useAuthStore((s) => s.firebaseUser)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setIsMobile])

  useEffect(() => {
    if (!firebaseUser) return

    const unsubPatients = subscribeToAllPatients(firebaseUser.uid, (patients) => {
      setPatients(patients)
    })
    const unsubTasks = subscribeToTasks(firebaseUser.uid, (tasks) => {
      setTasks(tasks)
    })
    return () => {
      unsubPatients()
      unsubTasks()
    }
  }, [setPatients, setTasks, firebaseUser])

  return null
}

export default function App() {
  const setFirebaseUser = useAuthStore((s) => s.setFirebaseUser)
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)

  // null = still resolving, true = ready, false = missing config
  const [firebaseOk, setFirebaseOk] = useState<boolean | null>(null)

  useEffect(() => {
    firebaseReady.then(setFirebaseOk)
  }, [])

  useEffect(() => {
    if (firebaseOk !== true) return

    // Process any pending redirect sign-in result (mobile / popup-blocked)
    handleRedirectResult()

    // Safety timeout: if auth never responds, stop loading so the user
    // sees the login screen instead of an infinite spinner.
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 10_000)

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      clearTimeout(timeout)
      setFirebaseUser(firebaseUser)
      if (firebaseUser) {
        localStorage.setItem('user_id', firebaseUser.uid)
        try {
          const profile = await getOrCreateProfile(firebaseUser)
          setUser(profile)
        } catch (err) {
          console.error('[MedWard] Profile creation failed — retrying once', err)
          // Retry once after a short delay (Firestore cold-start / rules propagation)
          try {
            await new Promise((r) => setTimeout(r, 2000))
            const profile = await getOrCreateProfile(firebaseUser)
            setUser(profile)
          } catch (retryErr) {
            console.error('[MedWard] Profile creation retry failed', retryErr)
            setUser(null)
          }
        }
      } else {
        localStorage.removeItem('user_id')
        setUser(null)
      }
      setLoading(false)
    })
    return () => {
      clearTimeout(timeout)
      unsubscribe()
    }
  }, [firebaseOk, setFirebaseUser, setUser, setLoading])

  if (firebaseOk === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ward-bg">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-3 border-primary-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-ward-muted mt-4">Loading MedWard Pro...</p>
        </div>
      </div>
    )
  }

  if (firebaseOk === false) {
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
              <Route path="/patients/:id" element={<Suspense fallback={<PageLoader />}><PatientDetailPage /></Suspense>} />
              <Route path="/tasks" element={<Suspense fallback={<PageLoader />}><TasksPage /></Suspense>} />
              <Route path="/handover" element={<Suspense fallback={<PageLoader />}><HandoverPage /></Suspense>} />
              <Route path="/ai" element={<Suspense fallback={<PageLoader />}><AIAssistantPage /></Suspense>} />
              <Route path="/labs" element={<Suspense fallback={<PageLoader />}><LabAnalysisPage /></Suspense>} />
              <Route path="/drugs" element={<Suspense fallback={<PageLoader />}><DrugInfoPage /></Suspense>} />
              <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
            </Route>
            <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPage /></Suspense>} />
            <Route path="/terms" element={<Suspense fallback={<PageLoader />}><TermsPage /></Suspense>} />
            <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>} />
          </Routes>
          <ModalController />
          <ToastContainer />
          <HIPAADisclaimer />
        </BrowserRouter>
      </ModeProvider>
    </ErrorBoundary>
  )
}
