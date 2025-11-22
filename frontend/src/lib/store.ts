// Minimal client-side state for auth and role
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@/types/api';

interface SignupData {
  accountType: 'user' | 'staff';
  role: string;
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  address?: string;
  company?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  userRole: UserRole;
  userId: string | null;
  email: string | null;
  accountType: 'USER' | 'STAFF' | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  switchRole: (role: UserRole) => void;
}

// Helper function to map SQL role codes to UserRole
function mapRoleToUserRole(role: string): UserRole {
  if (role === 'D') return 'driver';
  if (role === 'P') return 'passenger';
  if (role === 'O') return 'operator';
  if (role === 'I') return 'operator'; // Inspector mapped to operator
  if (role === 'C') return 'passenger'; // Company rep mapped to passenger for now
  return 'passenger';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userRole: 'passenger',
      userId: null,
      email: null,
      accountType: null,
      
      login: async (email: string, password: string) => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include', // Important for session cookies
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Login failed');
        }
        
        const data = await response.json();
        set({
          isAuthenticated: true,
          userId: data.userId,
          email: data.email,
          accountType: data.accountType,
          userRole: mapRoleToUserRole(data.role),
        });
      },
      
      signup: async (signupData: SignupData) => {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signupData),
          credentials: 'include',
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Signup failed');
        }
        
        const data = await response.json();
        // After signup, user needs to login (or we could auto-login here)
        return data;
      },
      
      logout: async () => {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
        set({
          isAuthenticated: false,
          userId: null,
          email: null,
          accountType: null,
          userRole: 'passenger',
        });
      },
      
      checkAuth: async () => {
        try {
          const response = await fetch('/api/auth/me', {
            credentials: 'include',
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
              set({
                isAuthenticated: true,
                userId: data.userId,
                email: data.email,
                accountType: data.accountType,
                userRole: mapRoleToUserRole(data.role),
              });
              return;
            }
          }
          // If not authenticated, clear state
          set({
            isAuthenticated: false,
            userId: null,
            email: null,
            accountType: null,
            userRole: 'passenger',
          });
        } catch (error) {
          console.error('Auth check failed:', error);
          set({
            isAuthenticated: false,
            userId: null,
            email: null,
            accountType: null,
            userRole: 'passenger',
          });
        }
      },
      
      switchRole: (role: UserRole) => set({ userRole: role }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
