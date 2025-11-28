import { Outlet } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";

export default function PassengerLayout() {
  return (
    <div className="flex min-h-screen h-screen flex-col bg-neutral-950 text-neutral-50 overflow-hidden">
      {/* Shared header, etc. */}
      <Outlet />
      <BottomNav />
    </div>
  );
}