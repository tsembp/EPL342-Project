import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Car, Sparkles, Package, Truck, Route } from "lucide-react";
import { SERVICES } from "@/lib/constants";

const serviceIcons: Record<string, any> = {
  simple_route: Car,
  luxury_route: Sparkles,
  light_cargo: Package,
  heavy_cargo: Truck,
  bridged_route: Route,
};

export default function Services() {
  const [search, setSearch] = useState("");

  const filteredServices = SERVICES.filter(([_, label]) =>
    label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header title="Services" />
      
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-12"
            />
          </div>

          {/* Services list */}
          <div className="space-y-3">
            {filteredServices.map(([id, label]) => {
              const Icon = serviceIcons[id] || Car;
              
              return (
                <Card
                  key={id}
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold">{label}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getServiceDescription(id)}
                      </p>
                    </div>

                    {id === "luxury_route" && (
                      <Badge variant="secondary">Premium</Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function getServiceDescription(id: string): string {
  const descriptions: Record<string, string> = {
    simple_route: "Standard point-to-point ride",
    luxury_route: "Premium vehicles and service",
    light_cargo: "Small packages and deliveries",
    heavy_cargo: "Large cargo transport",
    bridged_route: "Multi-zone geofenced routing",
  };
  return descriptions[id] || "Service";
}
