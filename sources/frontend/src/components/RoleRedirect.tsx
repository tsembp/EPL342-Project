import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import LandingPage from "@/pages/LandingPage";

export function RoleRedirect() {
  const { isAuthenticated, userRole, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      switch (userRole) {
        case "admin":
          navigate("/admin", { replace: true });
          break;
        case "operator":
            navigate("/operator", { replace: true });
            break;
        case "inspector":
            navigate("/inspector", { replace: true });
            break;
        case "driver":
        case "company_representative":
          navigate("/driver", { replace: true });
          break;
        default:
          navigate("/passenger", { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, userRole, navigate]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return null;
}