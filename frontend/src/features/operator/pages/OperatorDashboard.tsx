import {
  SidebarProvider,
  Sidebar,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { LogOut } from "lucide-react";

const operatorSections = [
  { label: "Overview", path: "/operator/overview" },
  { label: "Vehicles", path: "/operator/vehicles" },
  { label: "Service Types & Profiles", path: "/operator/services" },
  { label: "Enrollments", path: "/operator/enrollments" },
  { label: "Documents", path: "/operator/documents" },
  { label: "Reports & Analytics", path: "/operator/reports" },
  { label: "GDPR Data Correction", path: "/operator/gdpr-data-correction" },
];

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, logout } = useAuthStore();

  if (userRole !== "operator") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-900">
        <Card className="border border-gray-200 bg-white p-8 text-center text-lg font-semibold shadow-sm">
          Access denied: Operator role required.
        </Card>
      </div>
    );
  }

  const currentSection =
    operatorSections.find((s) => location.pathname.startsWith(s.path)) ??
    operatorSections[0];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  
  return (
    <div className="flex min-h-screen bg-white">
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 flex-col border-r border-gray-200 bg-white">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Operator Console
            </span>
            <span className="text-sm font-semibold text-gray-900">
              One-Stop Ride-Hail
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 px-3 mb-2">Navigation</p>
            {operatorSections.map((section) => {
              const active = location.pathname.startsWith(section.path);
              return (
                <button
                  key={section.path}
                  onClick={() => navigate(section.path)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${active 
                      ? 'bg-black text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* FOOTER WITH LOGOUT */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0 overflow-hidden">
        {/* Top app bar */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs uppercase tracking-wide text-gray-500">
              Operator Console
            </span>
            <h1 className="text-lg font-semibold text-gray-900">
              {currentSection.label}
            </h1>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
