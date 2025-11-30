import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import { RoleRedirect } from "@/components/RoleRedirect";

import Login from "@/features/auth/pages/Login";
import Signup from "@/features/auth/pages/Signup";

// DRIVER
import DriverDocuments from "@/features/driver/pages/DriverDocuments";
import PendingApproval from "@/features/driver/pages/PendingApproval";
import DriverDashboard from "@/features/driver/pages/Dashboard";
import VehicleDocuments from "@/features/driver/pages/VehicleDocuments";
import AddVehiclePage from "@/features/driver/pages/AddVehiclePage";

// PASSENGER
import PassengerLayout from "@/features/passenger/pages/PassengerLayout";
import Map from "@/features/passenger/pages/Map";
import Profile from "@/features/passenger/pages/Profile";
import PassengerHome from "@/features/passenger/pages/PassengerHome";
import Home from "@/features/passenger/pages/Home";
import RideHistory from "@/features/passenger/pages/RideHistory";
import CheckoutPage from "@/features/passenger/pages/CheckoutPage";

// OPERATOR
import OperatorDashboard from "@/features/operator/pages/OperatorDashboard";
import Overview from "@/features/operator/pages/Overview";
import UsersDrivers from "@/features/operator/pages/UsersDrivers";
import Vehicles from "@/features/operator/pages/Vehicles";
import ServiceTypesProfiles from "@/features/operator/pages/ServiceTypesProfiles";
import Enrollments from "@/features/operator/pages/Enrollments";
import Documents from "@/features/operator/pages/Documents";
import RidesOperations from "@/features/operator/pages/RidesOperations";
import ReportsAnalytics from "@/features/operator/pages/ReportsAnalytics";
import SystemAuditLogs from "@/features/operator/pages/SystemAuditLogs";

// INSPECTOR
import { InspectorDashboard } from "@/features/inspector/pages/InspectorDashboard";

// ADMIN
import AdminPendingOperatorsPage from "@/features/admin/pages/AdminPendingOperators";

// GDPR
import GDPRRequest from "@/features/gdpr/pages/GDPRRequest";
import GDPRExport from "@/features/gdpr/pages/GDPRExport";
import NotFound from "@/pages/NotFound";
import RideRequestDetailsPage from "./features/passenger/pages/RideRequestDetails";

import AdminLogin from "@/features/auth/pages/AdminLogin";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            <Route path="/passenger/*" element={<ProtectedRoute><PassengerLayout /></ProtectedRoute>}>
              <Route index element={<PassengerHome />} />
              <Route path="ride" element={<PassengerHome />} />
              <Route path="history" element={<RideHistory />} />
              <Route
                path="rides/:requestId/details"
                element={<RideRequestDetailsPage />}
              />
              <Route path="checkout" element={<CheckoutPage />} />
            </Route>

            <Route
              path="/gdpr"
              element={
                <ProtectedRoute>
                  <GDPRRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gdpr/export"
              element={
                <ProtectedRoute>
                  <GDPRExport />
                </ProtectedRoute>
              }
            />

            {/* DRIVER */}
            {/* main dashboard (tabs, including Vehicles tab) */}
            <Route
              path="/driver"
              element={
                <ProtectedRoute>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />
            {/* driver personal docs */}
            <Route
              path="/driver/documents"
              element={
                <ProtectedRoute>
                  <DriverDocuments />
                </ProtectedRoute>
              }
            />
            {/* vehicle docs for a specific vehicle (navigated with state.vehicleId) */}
            <Route
              path="/driver/VehicleDocuments"
              element={
                <ProtectedRoute>
                  <VehicleDocuments />
                </ProtectedRoute>
              }
            />
            {/* add vehicle page */}
            <Route
              path="/driver/add-vehicle"
              element={
                <ProtectedRoute>
                  <AddVehiclePage />
                </ProtectedRoute>
              }
            />
            {/* pending approval page */}
            <Route
              path="/driver/pending-approval"
              element={
                <ProtectedRoute>
                  <PendingApproval />
                </ProtectedRoute>
              }
            />

            {/* OPERATOR */}
            <Route
              path="/operator/*"
              element={
                <ProtectedRoute>
                  <OperatorDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="overview" element={<Overview />} />
              <Route path="users" element={<UsersDrivers />} />
              <Route path="vehicles" element={<Vehicles />} />
              <Route path="services" element={<ServiceTypesProfiles />} />
              <Route path="enrollments" element={<Enrollments />} />
              <Route path="documents" element={<Documents />} />
              <Route path="rides" element={<RidesOperations />} />
              <Route path="reports" element={<ReportsAnalytics />} />
              <Route path="logs" element={<SystemAuditLogs />} />
            </Route>

            {/* INSPECTOR */}
            <Route path="/inspector/*" element={<ProtectedRoute><InspectorDashboard /></ProtectedRoute>} />

            {/* ADMIN */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminPendingOperatorsPage />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminPendingOperatorsPage />} />
              <Route path="dashboard" element={<AdminPendingOperatorsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
