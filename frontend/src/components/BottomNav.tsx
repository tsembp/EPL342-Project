import { NavLink } from "@/components/NavLink";
import { Car, CreditCard, History, User, House } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const userRole = useAuthStore((state) => state.userRole);

  let tabs = [];

  if (userRole === "passenger") {
    tabs = [
      { to: "/passenger/ride", icon: House, label: "Ride" },
      { to: "/passenger/history", icon: History, label: "History" },
      { to: "/profile", icon: User, label: "Profile" },
    ];
  } else if (userRole === "driver") {
    tabs = [
      { to: "/driver/ride", icon: House, label: "Ride" },
      { to: "/driver/enrollment", icon: CreditCard, label: "Enrollment" },
      { to: "/driver/history", icon: History, label: "History" },
      { to: "/profile", icon: User, label: "Profile" },
    ];
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2">
      {tabs.map((tab) => (
        <NavLink
        key={tab.to}
        to={tab.to}
        className={cn(
          "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors",
          "text-neutral-500 hover:text-emerald-400 hover:bg-neutral-900"
        )}
        activeClassName="text-emerald-400 bg-neutral-900 border border-neutral-800 font-medium"
        >
        <tab.icon className="h-5 w-5 transition-colors" />
        <span className="text-[10px] transition-colors">{tab.label}</span>
        </NavLink>
      ))}
      </div>
    </nav>
  );
}
