import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { MapPin, Clock, DollarSign, History as HistoryIcon } from "lucide-react";

// Demo data
const demoTrips = [
  {
    id: "1",
    started_at: "2025-01-10T14:30:00Z",
    from_label: "Downtown Station",
    to_label: "Airport Terminal 2",
    price: 45.00,
    status: "completed" as const,
  },
  {
    id: "2",
    started_at: "2025-01-08T09:15:00Z",
    from_label: "Office Building",
    to_label: "City Mall",
    price: 18.50,
    status: "completed" as const,
  },
  {
    id: "3",
    started_at: "2025-01-05T16:45:00Z",
    from_label: "Home",
    to_label: "Restaurant District",
    price: 12.00,
    status: "cancelled" as const,
  },
];

export default function History() {
  const navigate = useNavigate();
  const [trips] = useState(demoTrips);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success";
      case "cancelled":
        return "bg-destructive/10 text-destructive";
      case "enroute":
        return "bg-primary/10 text-primary";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (trips.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header title="History" />
        <div className="flex-1 flex items-center justify-center pb-20">
          <EmptyState
            icon={HistoryIcon}
            title="No trips yet"
            description="Your ride history will appear here"
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header title="History" />
      
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-2xl mx-auto p-4 space-y-3">
          {trips.map((trip) => (
            <Card
              key={trip.id}
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/trip/${trip.id}`)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="font-medium">{trip.from_label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-destructive" />
                      <span className="font-medium">{trip.to_label}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-bold">${trip.price.toFixed(2)}</p>
                    <Badge variant="secondary" className={getStatusColor(trip.status)}>
                      {trip.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(trip.started_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Paid
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
