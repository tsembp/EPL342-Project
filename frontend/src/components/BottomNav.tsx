import { NavLink } from "@/components/NavLink";
import { Car, CreditCard, History, User, House } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const userRole = useAuthStore((state) => state.userRole);
  
  const tabs = [
    { to: "/home", icon: House, label: userRole === "driver" ? "Earnings" : "Home" },
    { to: "/credit", icon: CreditCard, label: userRole === "driver" ? "Earnings" : "Credit" },
    { to: "/history", icon: History, label: "History" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="max-w-2xl mx-auto px-2 py-2 flex justify-around items-center">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50"
            activeClassName="text-primary bg-primary/10 font-medium"
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-[10px]">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
