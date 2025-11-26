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
  { label: "Users & Drivers", path: "/operator/users" },
  { label: "Vehicles", path: "/operator/vehicles" },
  { label: "Service Types & Profiles", path: "/operator/services" },
  { label: "Enrollments", path: "/operator/enrollments" },
  { label: "Documents", path: "/operator/documents" },
  { label: "Rides & Operations", path: "/operator/rides" },
  { label: "Reports & Analytics", path: "/operator/reports" },
  { label: "System & Audit Logs", path: "/operator/logs" },
];

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuthStore();

  if (userRole !== "operator") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-50">
        <Card className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center text-lg font-semibold shadow-lg">
          Access denied: Operator role required.
        </Card>
      </div>
    );
  }

  const currentSection =
    operatorSections.find((s) => location.pathname.startsWith(s.path)) ??
    operatorSections[0];

  function handleLogout() {
    // If clearAuth is not available, just navigate to login
    navigate("/login");
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-neutral-950 text-neutral-50">
        {/* SIDEBAR */}
        <Sidebar
          collapsible="icon"
          variant="floating"
          className="hidden md:block"
        >
          <SidebarHeader>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Operator Console
              </span>
              <span className="text-sm font-semibold text-neutral-50">
                One-Stop Ride-Hail
              </span>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarMenu>
                {operatorSections.map((section) => {
                  const active = location.pathname.startsWith(section.path);
                  return (
                    <SidebarMenuItem key={section.path}>
                      <SidebarMenuButton
                        isActive={active}
                        onClick={() => navigate(section.path)}
                        className="justify-start text-sm font-medium"
                      >
                        <span className="truncate">{section.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          {/* FOOTER WITH LOGOUT */}
          <SidebarFooter>
            <button
              onClick={handleLogout}
              className="
                flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm 
                font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 
                transition-colors group-data-[collapsible=icon]:justify-center
              "
            >
              <LogOut className="h-4 w-4" />
              <span className="truncate group-data-[collapsible=icon]:hidden">
                Logout
              </span>
            </button>
          </SidebarFooter>
        </Sidebar>

        {/* MAIN AREA */}
        <SidebarInset className="flex flex-col">
          {/* Top app bar */}
          <header className="flex items-center justify-between border-b border-neutral-900/70 px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              {/* Mobile trigger */}
              <div className="md:hidden">
                <SidebarTrigger />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[0.7rem] uppercase tracking-[0.18em] text-neutral-500">
                  Operator Console
                </span>
                <h1 className="text-base font-semibold text-neutral-50 md:text-lg">
                  {currentSection.label}
                </h1>
              </div>
            </div>

            {/* Removed Role badge */}
            <div></div>
          </header>

          {/* Page content */}
          <div className="flex-1 px-4 py-4 md:px-6 md:py-6">
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
