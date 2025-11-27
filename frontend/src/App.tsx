import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import Login from "@/features/auth/pages/Login";
import Signup from "@/features/auth/pages/Signup";
import DriverDocuments from "@/features/driver/pages/DriverDocuments";
import PendingApproval from "@/features/driver/pages/PendingApproval";
import Map from "@/features/passenger/pages/Map";
import Services from "@/features/passenger/pages/Services";
import Profile from "@/features/passenger/pages/Profile";  
import TripDetail from "@/features/passenger/pages/TripDetail";
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
import NotFound from "@/pages/NotFound";
import GDPRRequest from "@/features/gdpr/pages/GDPRRequest";
import GDPRExport from "@/features/gdpr/pages/GDPRExport";
import CreateRide from "@/features/passenger/pages/CreateRide";
import RideAlternativesPage from "@/features/passenger/pages/RideAlternativesPage";
import Home from "@/features/passenger/pages/Home";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  // Check authentication status on app load
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
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/driver/documents" element={<DriverDocuments />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/ride" element={<ProtectedRoute><CreateRide /></ProtectedRoute>} />
            <Route path="/ride-alternatives/:requestId" element={<ProtectedRoute><RideAlternativesPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/trip/:id" element={<ProtectedRoute><TripDetail /></ProtectedRoute>} />
            <Route path="/operator/*" element={<ProtectedRoute><OperatorDashboard /></ProtectedRoute>}>
              <Route path="overview" element={<Overview />} />
              <Route path="users" element={<UsersDrivers />} />
              <Route path="vehicles" element={<Vehicles />} />
              <Route path="services" element={<ServiceTypesProfiles />} />
              <Route path="enrollments" element={<Enrollments />} />
              <Route path="documents" element={<Documents />} />
              <Route path="rides" element={<RidesOperations />} />
              <Route path="reports" element={<ReportsAnalytics />} />
              <Route path="logs" element={<SystemAuditLogs />} />
              <Route index element={<Overview />} />
            </Route>
            <Route path="/gdpr" element={<ProtectedRoute><GDPRRequest /></ProtectedRoute>} />
            <Route path="/gdpr/export" element={<ProtectedRoute><GDPRExport /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
