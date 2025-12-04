import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import type { UserRole } from "@/types/api";
import { useEffect } from "react";
import { toast } from "sonner";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
  showUnauthorizedMessage?: boolean;
}

/**
 * RoleGuard - Protects routes based on user roles
 * 
 * Usage:
 * <RoleGuard allowedRoles={['passenger']}>
 *   <PassengerPage />
 * </RoleGuard>
 */
export function RoleGuard({ 
  children, 
  allowedRoles, 
  redirectTo, 
  showUnauthorizedMessage = true 
}: RoleGuardProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userRole = useAuthStore((state) => state.userRole);
  const location = useLocation();

  const hasWrongRole = isAuthenticated && !allowedRoles.includes(userRole);

  // Show unauthorized message when user has wrong role
  useEffect(() => {
    if (hasWrongRole && showUnauthorizedMessage) {
      toast.error("Access Denied", {
        description: "You don't have permission to access this page.",
      });
    }
  }, [hasWrongRole, showUnauthorizedMessage]);

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check if user's role is in allowed roles
  if (hasWrongRole) {
    // If redirectTo is provided, use it; otherwise redirect based on role
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    // Default redirects based on role
    switch (userRole) {
      case 'passenger':
        return <Navigate to="/passenger" replace />;
      case 'driver':
      case 'company_representative':
        return <Navigate to="/driver" replace />;
      case 'operator':
        return <Navigate to="/operator" replace />;
      case 'inspector':
        return <Navigate to="/inspector" replace />;
      case 'admin':
        return <Navigate to="/admin" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  // User has correct role - render children
  return <>{children}</>;
}

/**
 * AdminOnlyGuard - Specific guard for admin-only routes
 */
export function AdminOnlyGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['admin']}>
      {children}
    </RoleGuard>
  );
}

/**
 * OperatorOnlyGuard - Specific guard for operator-only routes
 */
export function OperatorOnlyGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['operator']}>
      {children}
    </RoleGuard>
  );
}

/**
 * InspectorOnlyGuard - Specific guard for inspector-only routes
 */
export function InspectorOnlyGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['inspector']}>
      {children}
    </RoleGuard>
  );
}

/**
 * DriverOnlyGuard - Specific guard for driver/company rep routes
 */
export function DriverOnlyGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['driver', 'company_representative']}>
      {children}
    </RoleGuard>
  );
}

/**
 * PassengerOnlyGuard - Specific guard for passenger-only routes
 */
export function PassengerOnlyGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['passenger']}>
      {children}
    </RoleGuard>
  );
}

/**
 * GuestOnlyGuard - Redirects authenticated users to their dashboard
 * Use for login/signup pages
 */
export function GuestOnlyGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userRole = useAuthStore((state) => state.userRole);

  if (isAuthenticated) {
    // Redirect to appropriate dashboard based on role
    switch (userRole) {
      case 'passenger':
        return <Navigate to="/passenger" replace />;
      case 'driver':
      case 'company_representative':
        return <Navigate to="/driver" replace />;
      case 'operator':
        return <Navigate to="/operator" replace />;
      case 'inspector':
        return <Navigate to="/inspector" replace />;
      case 'admin':
        return <Navigate to="/admin" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
