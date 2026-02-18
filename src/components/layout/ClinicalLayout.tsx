import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useMobile } from '@/hooks/useMobile'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import TopBar from '@/components/layout/TopBar'
import NotificationDrawer from '@/components/layout/NotificationDrawer'

// ---------------------------------------------------------------------------
// ClinicalLayout
// ---------------------------------------------------------------------------

/**
 * Main authenticated layout wrapper.
 *
 * - Desktop (>= 768px): Fixed sidebar on left + sticky top bar + scrollable main content.
 * - Mobile  (<  768px): Sticky top bar + scrollable main content + fixed bottom nav.
 *
 * Includes a slide-in NotificationDrawer accessible from the TopBar bell.
 */
export default function ClinicalLayout() {
  const isMobile = useMobile()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  // ---- Mobile layout ----
  if (isMobile) {
    return (
      <div className="flex min-h-dvh flex-col bg-ward-bg">
        <TopBar onNotificationsToggle={() => setNotificationsOpen(true)} />

        <main className="flex-1 overflow-y-auto px-4 py-4 pb-20">
          <div className="mx-auto max-w-3xl">
            <Outlet />
          </div>
        </main>

        <MobileNav />

        <NotificationDrawer
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />
      </div>
    )
  }

  // ---- Desktop layout ----
  return (
    <div className="flex min-h-dvh bg-ward-bg">
      <Sidebar />

      {/* Main content column (right of sidebar) */}
      <div className="ml-[260px] flex-1 flex flex-col min-h-dvh">
        {/* Desktop top bar (slim, clock + notifications) */}
        <TopBar onNotificationsToggle={() => setNotificationsOpen(true)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  )
}
