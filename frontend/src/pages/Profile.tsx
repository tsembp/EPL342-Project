import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store";
import { User, RefreshCw, FileText, BarChart3, LogOut, Download } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const { email, userRole, switchRole, logout } = useAuthStore();

  const handleSwitchRole = () => {
    switchRole(userRole === "passenger" ? "driver" : "passenger");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header title="Profile" />
      
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* User info */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-bold">User Account</h2>
                <p className="text-sm text-muted-foreground">{email}</p>
                <Badge variant="secondary" className="mt-2">
                  {userRole === "passenger" ? "Passenger" : "Driver"}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Card
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={handleSwitchRole}
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <h3 className="font-semibold">Switch role</h3>
                  <p className="text-sm text-muted-foreground">
                    Switch to {userRole === "passenger" ? "driver" : "passenger"} mode
                  </p>
                </div>
              </div>
            </Card>

            {/* GDPR Request */}
            <Card
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/gdpr")}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <h3 className="font-semibold">GDPR request</h3>
                  <p className="text-sm text-muted-foreground">
                    Submit a data request
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/gdpr/export")}
            >
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <h3 className="font-semibold">Download my data</h3>
                  <p className="text-sm text-muted-foreground">
                    View or export the data stored about your account
                  </p>
                </div>
              </div>
            </Card>

            {/* Operator Panel */}
            <Card
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/operator")}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <h3 className="font-semibold">Operator panel</h3>
                  <p className="text-sm text-muted-foreground">
                    View reports and analytics
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Logout */}
          <Button
            variant="outline"
            className="w-full h-12"
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
