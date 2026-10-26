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
  emailVerified?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  csrfToken: string | null
  _hasHydrated: boolean
  setAuth: (user: User, token: string | null, csrfToken?: string | null) => void
  updateUser: (updates: Partial<User>) => void
  logout: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      csrfToken: null,
      _hasHydrated: false,
      setAuth: (user, token, csrfToken = null) => set({ user, token, csrfToken }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      logout: () => set((state) => {
        // Practice caches are account-scoped and disposable. Remove the
        // departing account's copies so a shared browser retains no private
        // portfolio snapshot after sign-out.
        if (state.user?.id) try {
          const prefix = `perbillion-practice-cache-${state.user.id}-`
          for (let index = localStorage.length - 1; index >= 0; index--) {
            const key = localStorage.key(index)
            if (key?.startsWith(prefix)) localStorage.removeItem(key)
          }
        } catch { /* Authentication still clears when storage is unavailable. */ }
        return { user: null, token: null, csrfToken: null }
      }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'perbillion-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
