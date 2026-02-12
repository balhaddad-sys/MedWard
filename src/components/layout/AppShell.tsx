import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { ModalController } from './ModalController'
import { ToastContainer } from '@/components/ui/Toast'
import { useUIStore } from '@/stores/uiStore'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { useAuthStore } from '@/stores/authStore'
import { subscribeToAllPatients } from '@/services/firebase/patients'
import { subscribeToTasks } from '@/services/firebase/tasks'

export function AppShell() {
  const isMobile = useUIStore((s) => s.isMobile)
  const setIsMobile = useUIStore((s) => s.setIsMobile)
  const setPatients = usePatientStore((s) => s.setPatients)
  const setTasks = useTaskStore((s) => s.setTasks)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const isMobileRef = useRef(isMobile)

  useEffect(() => {
    isMobileRef.current = isMobile
  }, [isMobile])

  useEffect(() => {
    const checkMobile = () => {
      const next = window.innerWidth < 768
      if (next !== isMobileRef.current) setIsMobile(next)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setIsMobile])

  // Load data from Firestore on mount
  useEffect(() => {
    if (!firebaseUser) return

    // Real-time patient subscription
    const unsubPatients = subscribeToAllPatients(firebaseUser.uid, (patients) => {
      setPatients(patients)
    })

    // Real-time task subscription
    const unsubTasks = subscribeToTasks(firebaseUser.uid, (tasks) => {
      setTasks(tasks)
    })

    return () => {
      unsubPatients()
      unsubTasks()
    }
  }, [setPatients, setTasks, firebaseUser])

  return (
    <div className="min-h-screen bg-ward-bg">
      <Header />
      <main className="p-3 sm:p-4 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto w-full min-w-0">
        <Outlet />
      </main>
      {isMobile && <BottomNav />}
      <ModalController />
      <ToastContainer />
    </div>
  )
}
