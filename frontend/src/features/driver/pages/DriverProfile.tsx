import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { User, FileText, Download, LogOut } from "lucide-react";

export default function DriverProfile() {
  const navigate = useNavigate();
  const { email, userRole, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const roleLabel =
    userRole === "driver"
      ? "Driver"
      : userRole === "passenger"
      ? "Passenger"
      : userRole === "operator"
      ? "Operator"
      : "User";

  return (
    <div className="w-full space-y-3">
      {/* GDPR REQUEST CARD */}
      <Card
        role="button"
        tabIndex={0}
        onClick={() => navigate("/gdpr", { state: { backTo: "/driver/dashboard?tab=profile" } })}
        className="w-full cursor-pointer border border-neutral-800 bg-neutral-900/80 px-5 py-4 sm:px-6 sm:py-5 transition-colors hover:bg-neutral-850 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800">
            <FileText className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-50">
              GDPR request
            </p>
            <p className="text-xs text-neutral-400">
              Submit a data request
            </p>
          </div>
        </div>
      </Card>

      {/* DOWNLOAD DATA CARD */}
      <Card
        role="button"
        tabIndex={0}
        onClick={() => navigate("/gdpr-export")}
        className="w-full cursor-pointer border border-neutral-800 bg-neutral-900/80 px-5 py-4 sm:px-6 sm:py-5 transition-colors hover:bg-neutral-850 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800">
            <Download className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-50">
              Download my data
            </p>
            <p className="text-xs text-neutral-400">
              View or export the data stored about your account
            </p>
          </div>
        </div>
      </Card>

      {/* SIGN OUT FULL-WIDTH BAR */}
      <Card className="w-full border border-neutral-800 bg-neutral-900/80 px-5 py-3 sm:px-6">
        <Button
          variant="ghost"
          className="w-full justify-center gap-2 text-sm font-medium text-neutral-50 hover:bg-neutral-800"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </Card>
    </div>
  );
}
