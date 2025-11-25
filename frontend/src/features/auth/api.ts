import { fetchAPI } from "@/lib/apiClient";

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

export interface SignupResponse {
  success: boolean;
  userId?: string;
  role?: string;
  email?: string;
  message?: string;
  error?: string;
}

export interface AuthCheckResponse {
  authenticated: boolean;
  userId?: string;
  role?: string;
  accountType?: 'USER' | 'STAFF';
  email?: string;
}

export const login = (data: LoginRequest) =>
  fetchAPI<LoginResponse>("/auth/login", {
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
