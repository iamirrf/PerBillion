import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  fullName: string
  username?: string | null
  profilePicture?: string
  role: string
  createdAt?: string
  lastLogin?: string
}

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  updateUser: (updates: Partial<User>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'perbillion-auth',
    }
  )
)
