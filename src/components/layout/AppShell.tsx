import { useEffect, useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { ToastContainer } from '@/components/ui/Toast'
import { ModalManager } from '@/components/ModalManager'
import { useUIStore } from '@/stores/uiStore'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { subscribeToAllPatients } from '@/services/firebase/patients'
import { subscribeToTasks } from '@/services/firebase/tasks'

export function AppShell() {
  const isMobile = useUIStore((s) => s.isMobile)
  const setIsMobile = useUIStore((s) => s.setIsMobile)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const setPatients = usePatientStore((s) => s.setPatients)
  const setTasks = useTaskStore((s) => s.setTasks)
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  // Subscribe to Firestore collections (real-time sync)
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

  // Responsive breakpoint detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setIsMobile])

  // Detect virtual keyboard via visualViewport
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const handleResize = () => {
      const threshold = window.innerHeight * 0.75
      setKeyboardOpen(viewport.height < threshold)
    }

    viewport.addEventListener('resize', handleResize)
    return () => viewport.removeEventListener('resize', handleResize)
  }, [])

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen, setSidebarOpen])

  // Prevent body scroll when drawer is open on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobile, sidebarOpen])

  const handleOverlayClick = useCallback(() => {
    setSidebarOpen(false)
  }, [setSidebarOpen])

  return (
    <div className="min-h-screen bg-ward-bg">
      <Header />

      <div className={`flex relative ${isMobile ? 'h-[calc(100dvh-52px)]' : ''}`}>
        {/* Desktop sidebar - always visible */}
        {!isMobile && (
          <div className="flex-shrink-0 border-r border-ward-border min-h-[calc(100vh-52px)]">
            <Sidebar />
          </div>
        )}

        {/* Mobile Context Drawer - overlay with slide-in animation */}
        {isMobile && (
          <>
            {/* Overlay backdrop */}
            <div
              className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
                sidebarOpen
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
              onClick={handleOverlayClick}
              aria-hidden="true"
            />

            {/* Drawer panel */}
            <div
              className={`fixed top-0 left-0 z-50 h-full w-72 shadow-xl transition-transform duration-300 ease-in-out ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar />
            </div>
          </>
        )}

        {/* Main content area */}
        <main
          className={`flex-1 overflow-y-auto px-4 pt-3 max-w-7xl mx-auto w-full ${
            isMobile ? 'pb-[76px]' : 'pb-3'
          }`}
        >
          <Outlet />
        </main>
      </div>

      {/* Bottom nav - mobile only, hidden when keyboard is open */}
      {isMobile && !keyboardOpen && <BottomNav />}

      <ModalManager />
      <ToastContainer />
    </div>
  )
}
