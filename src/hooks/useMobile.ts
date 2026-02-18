import { useSyncExternalStore } from 'react'

const MOBILE_BREAKPOINT = '(max-width: 767px)'

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(MOBILE_BREAKPOINT)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_BREAKPOINT).matches
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * Detects whether the viewport is mobile-sized (< 768px).
 * Uses `useSyncExternalStore` with `window.matchMedia`.
 */
export function useMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
