import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/store";

export function RoleRedirect() {
  const { isAuthenticated, userRole } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    } else {
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

  return null;
}