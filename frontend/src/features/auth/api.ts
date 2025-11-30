import { fetchAPI } from "@/lib/apiClient";
import type { SignupResponse } from "@/types/api"; // Import the global SignupResponse

// Authentication endpoints
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  userId: string;
  role: string;
  accountType: 'USER' | 'STAFF';
  email: string;
  username: string; // New field
  verificationStatus?: string; // New field
  error?: string;
}

export interface SignupRequest {
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

export interface AuthCheckResponse {
  authenticated: boolean;
  userId?: string;
  role?: string;
  accountType?: 'USER' | 'STAFF';
  email?: string;
  username?: string; // New field
}

export const login = (data: LoginRequest) =>
  fetchAPI<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const adminLogin = (data: { email: string; password: string }) =>
  fetchAPI<LoginResponse>("/admin/login", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const signup = (data: SignupRequest) =>
  fetchAPI<SignupResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const logout = () =>
  fetchAPI<{ success: boolean; message: string }>("/auth/logout", {
    method: "POST",
  });

export const checkAuth = () =>
  fetchAPI<AuthCheckResponse>("/auth/me");
