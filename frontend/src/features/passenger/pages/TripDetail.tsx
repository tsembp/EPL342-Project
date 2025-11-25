import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Clock, DollarSign, User, Phone, Car } from "lucide-react";
import { toast } from "sonner";

// Demo trip data
const demoTrip = {
  id: "1",
  started_at: "2025-01-10T14:30:00Z",
  from_label: "Downtown Station",
  to_label: "Airport Terminal 2",
  price: 45.00,
  status: "completed" as const,
  driver: {
    name: "John Smith",
    rating: 4.8,
    vehicle_plate: "ABC-1234",
  },
  stages: [
    { status: "requested", timestamp: "2025-01-10T14:30:00Z" },
    { status: "assigned", timestamp: "2025-01-10T14:32:00Z" },
    { status: "enroute", timestamp: "2025-01-10T14:35:00Z" },
    { status: "completed", timestamp: "2025-01-10T15:05:00Z" },
  ],
  receipt: {
    base_fare: 10.00,
    distance_fare: 30.00,
    time_fare: 5.00,
    total: 45.00,
    currency: "$",
  },
};

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const handlePay = () => {
    toast.success("Payment processed successfully");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Trip Details" showBack />
      
      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-8">
        {/* Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Trip #{id}</h2>
            <Badge variant="secondary" className="bg-success/10 text-success">
              {demoTrip.status}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <p className="font-medium">{demoTrip.from_label}</p>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-destructive" />
              <p className="font-medium">{demoTrip.to_label}</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {new Date(demoTrip.started_at).toLocaleString()}
            </div>
          </div>
        </Card>

        {/* Driver info */}
        {demoTrip.driver && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Driver</h3>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <p className="font-semibold">{demoTrip.driver.name}</p>
                <p className="text-sm text-muted-foreground">
                  ⭐ {demoTrip.driver.rating}
                </p>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Car className="h-4 w-4" />
                  {demoTrip.driver.vehicle_plate}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Timeline */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Timeline</h3>
          <div className="space-y-4">
            {demoTrip.stages.map((stage, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  index === demoTrip.stages.length - 1 ? 'bg-success' : 'bg-primary'
                }`} />
                <div className="flex-1">
                  <p className="font-medium capitalize">{stage.status}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(stage.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Receipt */}
        {demoTrip.receipt && (
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Receipt</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base fare</span>
                <span>${demoTrip.receipt.base_fare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Distance</span>
                <span>${demoTrip.receipt.distance_fare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time</span>
                <span>${demoTrip.receipt.time_fare.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-lg">${demoTrip.receipt.total.toFixed(2)}</span>
              </div>
            </div>

            {demoTrip.status === "completed" && (
              <Button onClick={handlePay} className="w-full mt-4 h-11">
                <DollarSign className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
