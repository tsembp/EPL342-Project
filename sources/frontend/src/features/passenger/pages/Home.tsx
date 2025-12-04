import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Car } from "lucide-react";
import { Outlet } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-background">
      <BottomNav />
      <Outlet />
    </div>
  );
}