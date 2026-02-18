import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = '(max-width: 767px)'

/**
 * Detects whether the viewport is mobile-sized (< 768px).
 * Uses `window.matchMedia` with an event listener and cleans up on unmount.
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(MOBILE_BREAKPOINT).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT)

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }

    // Set initial value in case it changed between render and effect
    setIsMobile(mql.matches)

    mql.addEventListener('change', handleChange)
    return () => {
      mql.removeEventListener('change', handleChange)
    }
  }, [])

  return isMobile
}
