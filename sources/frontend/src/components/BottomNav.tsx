import { NavLink } from "@/components/NavLink";
import { Car, CreditCard, History, User, House } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const userRole = useAuthStore((state) => state.userRole);

  let tabs = [];

  if (userRole === "passenger") {
    tabs = [
      { to: "/passenger/ride", icon: House, label: "Home" },
      { to: "/passenger/history", icon: History, label: "Activity" },
      { to: "/profile", icon: User, label: "Account" },
    ];
  } else if (userRole === "driver") {
    tabs = [
      { to: "/driver/ride", icon: House, label: "Home" },
      { to: "/driver/enrollment", icon: CreditCard, label: "Enrollment" },
      { to: "/driver/history", icon: History, label: "Activity" },
      { to: "/profile", icon: User, label: "Account" },
    ];
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-3">
      {tabs.map((tab) => (
        <NavLink
        key={tab.to}
        to={tab.to}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl transition-all",
          "text-gray-600 hover:text-gray-900"
        )}
        activeClassName="text-black bg-gray-100 font-medium"
        >
        <tab.icon className="h-6 w-6 transition-colors" />
        <span className="text-xs transition-colors">{tab.label}</span>
        </NavLink>
      ))}
      </div>
    </nav>
  );
}
