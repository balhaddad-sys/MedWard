import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { ModalController } from './ModalController'
import { ToastContainer } from '@/components/ui/Toast'
import { useUIStore } from '@/stores/uiStore'

export function AppShell() {
  const isMobile = useUIStore((s) => s.isMobile)
  const setIsMobile = useUIStore((s) => s.setIsMobile)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setIsMobile])

  return (
    <div className="min-h-screen bg-ward-bg">
      <Header />
      <div className="flex">
        {!isMobile && <Sidebar />}
        {isMobile && sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 animate-fade-in" onClick={() => setSidebarOpen(false)}>
            <div className="w-72 h-full bg-white overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
              <Sidebar />
            </div>
          </div>
        )}
        <main className="flex-1 p-3 sm:p-4 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto w-full min-w-0">
          <Outlet />
        </main>
      </div>
      {isMobile && <BottomNav />}
      <ModalController />
      <ToastContainer />
    </div>
  )
}
