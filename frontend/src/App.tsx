import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DriverDocuments from "./pages/DriverDocuments";
import PendingApproval from "./pages/PendingApproval";
import Map from "./pages/Map";
import Services from "./pages/Services";
import History from "./pages/History";
import Credit from "./pages/Credit";
import Profile from "./pages/Profile";
import TripDetail from "./pages/TripDetail";
import Operator from "./pages/Operator";
import GDPRRequest from "./pages/GDPRRequest";
import NotFound from "./pages/NotFound";

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
            <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/driver/documents" element={<DriverDocuments />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
            
            <Route path="/map" element={<ProtectedRoute><Map /></ProtectedRoute>} />
            <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/credit" element={<ProtectedRoute><Credit /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/trip/:id" element={<ProtectedRoute><TripDetail /></ProtectedRoute>} />
            <Route path="/operator" element={<ProtectedRoute><Operator /></ProtectedRoute>} />
            <Route path="/gdpr" element={<ProtectedRoute><GDPRRequest /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
