import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { ToastContainer } from '@/components/ui/Toast'
import { ModalManager } from '@/components/ModalManager'
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
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)}>
            <div className="w-72" onClick={(e) => e.stopPropagation()}>
              <Sidebar />
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
      {isMobile && <BottomNav />}
      <ModalManager />
      <ToastContainer />
    </div>
  )
}
