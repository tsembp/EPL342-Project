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
import VehiclesPage from "@/features/driver/pages/VehiclesPage";
import ServicesPage from "@/features/driver/pages/ServicesPage";
import AvailabilityPage from "@/features/driver/pages/AvailabilityPage";
import HistoryPage from "@/features/driver/pages/HistoryPage";
import ProfilePage from "@/features/driver/pages/ProfilePage";

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

// ⭐ NEW IMPORT — GDPR Operator Page
import { GDPRDataCorrection } from "@/features/operator/pages/GDPRDataCorrection";

// INSPECTOR
import { InspectorDashboard } from "@/features/inspector/pages/InspectorDashboard";

// ADMIN
import AdminPendingOperatorsPage from "@/features/admin/pages/AdminPendingOperators";

// GDPR (User side)
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

function DriverPendingGuard({ children }: { children: React.ReactNode }) {
  const userRole = useAuthStore((state) => state.userRole);
  const verificationStatus = useAuthStore((state) => state.verificationStatus);

  const isDriverOrCompany =
    userRole === "driver" || userRole === "company_representative";

  // Treat anything that's not VERIFIED as "blocked" (PENDING, REJECTED, unknown, null)
  if (isDriverOrCompany && verificationStatus !== "VERIFIED") {
    return <Navigate to="/driver/pending-approval" replace />;
  }

  return <>{children}</>;
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

            {/* PASSENGER */}
            <Route
              path="/passenger/*"
              element={
                <ProtectedRoute>
                  <PassengerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<PassengerHome />} />
              <Route path="ride" element={<PassengerHome />} />
              <Route path="history" element={<RideHistory />} />
              <Route path="profile" element={<Profile />} />
              <Route
                path="rides/:requestId/details"
                element={<RideRequestDetailsPage />}
              />
              <Route path="checkout" element={<CheckoutPage />} />
            </Route>

            {/* GDPR User */}
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

            {/* DRIVER / COMPANY REPRESENTATIVE*/}
            {/* DRIVER */}
            <Route
              path="/driver"
              element={
                <ProtectedRoute>
                  <DriverPendingGuard>
                    <DriverDashboard />
                  </DriverPendingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver/vehicles"
              element={
                <ProtectedRoute>
                  <DriverPendingGuard>
                    <VehiclesPage />
                  </DriverPendingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver/services"
              element={
                <ProtectedRoute>
                  <DriverPendingGuard>
                    <ServicesPage />
                  </DriverPendingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver/availability"
              element={
                <ProtectedRoute>
                  <DriverPendingGuard>
                    <AvailabilityPage />
                  </DriverPendingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver/history"
              element={
                <ProtectedRoute>
                  <DriverPendingGuard>
                    <HistoryPage />
                  </DriverPendingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver/profile"
              element={
                <ProtectedRoute>
                  <DriverPendingGuard>
                    <ProfilePage />
                  </DriverPendingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver/documents"
              element={
                <ProtectedRoute>
                    <DriverDocuments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver/VehicleDocuments"
              element={
                <ProtectedRoute>
                  <DriverPendingGuard>
                    <VehicleDocuments />
                  </DriverPendingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver/add-vehicle"
              element={
                <ProtectedRoute>
                  <DriverPendingGuard>
                    <AddVehiclePage />
                  </DriverPendingGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver/pending-approval"
              element={
                <ProtectedRoute>
                  {/* IMPORTANT: no DriverPendingGuard here,
                      or it would redirect to itself and loop */}
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

              <Route
                path="gdpr-data-correction"
                element={<GDPRDataCorrection />}
              />
            </Route>

            {/* INSPECTOR */}
            <Route
              path="/inspector/*"
              element={
                <ProtectedRoute>
                  <InspectorDashboard />
                </ProtectedRoute>
              }
            />

            {/* ADMIN */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminPendingOperatorsPage />
                </ProtectedRoute>
              }
            ></Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
