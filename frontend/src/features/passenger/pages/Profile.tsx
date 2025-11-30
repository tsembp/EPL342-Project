import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store";
import {
  User,
  RefreshCw,
  FileText,
  LogOut,
  Download,
} from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const { email, userRole, switchRole, logout } = useAuthStore();

  const handleSwitchRole = () => {
    switchRole(userRole === "passenger" ? "driver" : "passenger");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-neutral-50">
      <Header title="Profile" />

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* User info */}
          <Card className="p-6 border border-neutral-800 bg-neutral-900/80 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center">
                <User className="h-8 w-8 text-emerald-500" />
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-semibold text-neutral-50">
                  User Account
                </h2>
                <p className="text-sm text-neutral-400">{email}</p>
                <Badge
                  variant="outline"
                  className="mt-2 border-neutral-700 bg-neutral-900 text-neutral-200"
                >
                  {userRole === "passenger" ? "Passenger" : "Driver"}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            
            {/* GDPR Request */}
            <Card
              className="p-4 cursor-pointer border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-900 transition-colors"
              onClick={() => navigate("/gdpr", { state: { backTo: "/profile" } })}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-emerald-500" />
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-50">
                    GDPR request
                  </h3>
                  <p className="text-sm text-neutral-400">
                    Submit a data request
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="p-4 cursor-pointer border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-900 transition-colors"
              onClick={() => navigate("/gdpr/export")}
            >
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-emerald-500" />
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-50">
                    Download my data
                  </h3>
                  <p className="text-sm text-neutral-400">
                    View or export the data stored about your account
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Logout */}
          <Button
            variant="outline"
            className="w-full h-12 border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800 hover:text-neutral-50"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
