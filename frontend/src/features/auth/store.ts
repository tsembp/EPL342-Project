import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole, SignupResponse, LoginResponse } from '@/types/api';
import { login as apiLogin, signup as apiSignup, logout as apiLogout, checkAuth as apiCheckAuth, LoginRequest, SignupRequest } from '@/features/auth/api';

interface AuthState {
  isAuthenticated: boolean;
  userRole: UserRole;
  userId: string | null;
  email: string | null;
  accountType: 'USER' | 'STAFF' | null;
  username: string | null;
  verificationStatus: string | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  signup: (data: SignupRequest) => Promise<SignupResponse>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  switchRole: (role: UserRole) => void;
}

// Helper function to map SQL role codes to UserRole
function mapRoleToUserRole(role: string): UserRole {
  if (role === 'D') return 'driver';
  if (role === 'P') return 'passenger';
  if (role === 'O') return 'operator';
  if (role === 'I') return 'inspector';
  if (role === 'C') return 'company_representative';
  if (role === 'A') return 'admin';
  return 'passenger';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userRole: 'passenger',
      userId: null,
      email: null,
      username: null,
      accountType: null,
      verificationStatus: null,
      
      login: async (email, password) => {
        try {
          const data = await apiLogin({ email, password });
          // Ensure verificationStatus is present
          const responseWithVerification: LoginResponse = {
            ...data,
            verificationStatus: data.verificationStatus ?? 'unknown',
          };
          if (responseWithVerification.success) {
            set({
              isAuthenticated: true,
              userId: responseWithVerification.userId,
              email: responseWithVerification.email,
              username: responseWithVerification.username,
              accountType: responseWithVerification.accountType === 'STAFF' ? 'STAFF' : 'USER',
              userRole: mapRoleToUserRole(responseWithVerification.role),
              verificationStatus: responseWithVerification.verificationStatus
            });
            return responseWithVerification; // Return the full response
          } else {
            throw new Error('Login failed');
          }
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      },
      
      signup: async (signupData: SignupRequest) => {
        try {
          // Make sure the apiSignup returns the awaited fetchAPI call
          return await apiSignup(signupData);
        } catch (error) {
            console.error('Signup error:', error);
            throw error;
        }
      },
      
      logout: async () => {
        try {
          await apiLogout();
        } catch (error) {
          console.error('Logout error:', error);
        }
        set({
          isAuthenticated: false,
          userId: null,
          email: null,
          username: null,
          accountType: null,
          userRole: 'passenger',
          verificationStatus: null,
        });
      },
      
      checkAuth: async () => {
        try {
          const data = await apiCheckAuth();
          if (data.authenticated) {
            set({
              isAuthenticated: true,
              userId: data.userId,
              email: data.email,
              username: data.username,
              accountType: data.accountType,
              userRole: mapRoleToUserRole(data.role!),
              verificationStatus: data.verificationStatus ?? 'unknown',
            });
          } else {
            set({
              isAuthenticated: false,
              userId: null,
              email: null,
              accountType: null,
              userRole: 'passenger',
              verificationStatus: null,
            });
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          set({
            isAuthenticated: false,
            userId: null,
            email: null,
            accountType: null,
            userRole: 'passenger',
            verificationStatus: null,
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
