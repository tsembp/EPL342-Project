import { NavLink } from "@/components/NavLink";
import { Car, CreditCard, History, User, House } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AdminBottomNav() {
  
  const tabs = [
      { to: "/admin/dashboard", icon: House, label: "Ride" },
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2">
      {tabs.map((tab) => (
        <NavLink
        key={tab.to}
        to={tab.to}
        className={cn(
          "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors",
          "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
        )}
        activeClassName="text-gray-900 bg-gray-100 border border-gray-300 font-medium"
        >
        <tab.icon className="h-5 w-5 transition-colors" />
        <span className="text-[10px] transition-colors">{tab.label}</span>
        </NavLink>
      ))}
      </div>
    </nav>
  );
}
