import { NavLink } from "@/components/NavLink";
import { Car, CreditCard, History, User, House } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const userRole = useAuthStore((state) => state.userRole);

  const tabs = [
    {
      to: userRole === "driver" ? "/driver/ride" : "/passenger/ride",
      icon: House,
      label: userRole === "driver" ? "Earnings" : "Ride"
    },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors",
              "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900"
            )}
            activeClassName="text-emerald-400 bg-neutral-900 border border-neutral-800 font-medium"
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-[10px]">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
