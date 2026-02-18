import { Outlet } from 'react-router-dom'
import { useMobile } from '@/hooks/useMobile'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import TopBar from '@/components/layout/TopBar'

// ---------------------------------------------------------------------------
// ClinicalLayout
// ---------------------------------------------------------------------------

/**
 * Main authenticated layout wrapper.
 *
 * - Desktop (>= 768px): Fixed sidebar on left + scrollable main content area.
 * - Mobile  (<  768px): Sticky top bar + scrollable main content + fixed bottom nav.
 *
 * Uses `<Outlet />` from React Router for nested route rendering.
 */
export default function ClinicalLayout() {
  const isMobile = useMobile()

  // ---- Mobile layout ----
  if (isMobile) {
    return (
      <div className="flex min-h-dvh flex-col bg-ward-bg">
        <TopBar />

        <main className="flex-1 overflow-y-auto px-4 py-4 pb-20">
          <div className="mx-auto max-w-3xl">
            <Outlet />
          </div>
        </main>

        <MobileNav />
      </div>
    )
  }

  // ---- Desktop layout ----
  return (
    <div className="flex min-h-dvh bg-ward-bg">
      <Sidebar />

      <main className="ml-[260px] flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
