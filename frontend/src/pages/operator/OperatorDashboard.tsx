import { SidebarProvider, Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import { Card } from "@/components/ui/card";

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
      <div className="flex items-center justify-center h-screen">
        <Card className="p-8 text-center text-lg font-semibold">Access denied: Operator role required.</Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar className="hidden md:block">
          <SidebarMenu>
            {operatorSections.map((section) => (
              <SidebarMenuItem key={section.path}>
                <SidebarMenuButton
                  isActive={location.pathname.startsWith(section.path)}
                  onClick={() => navigate(section.path)}
                >
                  {section.label}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </Sidebar>
        <main className="flex-1 p-4 md:ml-[16rem]">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
