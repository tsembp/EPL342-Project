import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import LandingPage from "@/pages/LandingPage";

export function RoleRedirect() {
  const { isAuthenticated, userRole } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
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
  }, [isAuthenticated, userRole, navigate]);

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return null;
}