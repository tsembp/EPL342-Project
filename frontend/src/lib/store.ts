// Minimal client-side state for auth and role
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@/types/api';

interface AuthState {
  isAuthenticated: boolean;
  userRole: UserRole;
  userId: string | null;
  email: string | null;
  login: (email: string, userId: string) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userRole: 'passenger',
      userId: null,
      email: null,
      login: (email, userId) =>
        set({ isAuthenticated: true, email, userId }),
      logout: () =>
        set({ isAuthenticated: false, email: null, userId: null, userRole: 'passenger' }),
      switchRole: (role) => set({ userRole: role }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
