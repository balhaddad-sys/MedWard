import { create } from 'zustand'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  firebaseUser: import('firebase/auth').User | null
  loading: boolean
  error: string | null
  setUser: (user: User | null) => void
  setFirebaseUser: (user: import('firebase/auth').User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,
  setUser: (user) => set({ user }),
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ user: null, firebaseUser: null, loading: false, error: null }),
}))
