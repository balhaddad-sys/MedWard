import { create } from 'zustand'
import type { WardMode } from '@/types'

interface UIStore {
  sidebarOpen: boolean
  currentMode: WardMode
  activeModal: string | null
  modalData?: Record<string, unknown> | null
  toasts: Toast[]
  isMobile: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setCurrentMode: (mode: WardMode) => void
  openModal: (modalId: string, data?: Record<string, unknown>) => void
  closeModal: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setIsMobile: (isMobile: boolean) => void
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

let toastId = 0

export const useUIStore = create<UIStore>()((set) => ({
  sidebarOpen: false,
  currentMode: 'clinical',
  activeModal: null,
  modalData: null,
  toasts: [],
  isMobile: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCurrentMode: (currentMode) => set({ currentMode }),
  openModal: (activeModal, modalData) => set({ activeModal, modalData: modalData ?? null }),
  closeModal: () => set({ activeModal: null, modalData: undefined }),
  addToast: (toast) => {
    const id = `toast-${++toastId}`
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, toast.duration || 5000)
    }
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  setIsMobile: (isMobile) => set((state) => {
    if (state.isMobile === isMobile) return state
    return { isMobile }
  }),
}))
