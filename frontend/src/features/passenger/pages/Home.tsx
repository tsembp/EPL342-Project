import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Car } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header title="OSRH" />
      <div className="flex-1 flex items-center justify-center pb-20 px-4">
        <Card className="p-8 flex flex-col items-center gap-6">
          <Car className="h-12 w-12 text-primary" />
          <h1 className="text-2xl font-bold">Ready to plan your ride?</h1>
          <p className="text-muted-foreground text-center">
            Welcome to RideBridge! Book your next trip in just a few steps.
          </p>
          <Button size="lg" className="w-full" onClick={() => navigate("/ride")}>
            Plan a Ride
          </Button>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}