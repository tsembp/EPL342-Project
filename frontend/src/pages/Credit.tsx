import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { useAuthStore } from "@/lib/store";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Demo driver earnings
const demoEarnings = {
  net: 1245.50,
  gross: 1580.00,
  trips: [
    { id: "1", date: "2025-01-10", amount: 45.00, from: "Downtown", to: "Airport" },
    { id: "2", date: "2025-01-10", amount: 28.50, from: "Mall", to: "Stadium" },
    { id: "3", date: "2025-01-09", amount: 65.00, from: "Hotel", to: "Convention Center" },
  ],
};

export default function Credit() {
  const userRole = useAuthStore((state) => state.userRole);

  if (userRole === "passenger") {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header title="Credit" />
        <div className="flex-1 flex items-center justify-center pb-20">
          <EmptyState
            icon={DollarSign}
            title="No statements"
            description="Credit and payment information will appear here"
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header 
        title="Earnings" 
        action={
          <Select defaultValue="2025-01">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-01">Jan 2025</SelectItem>
              <SelectItem value="2024-12">Dec 2024</SelectItem>
              <SelectItem value="2024-11">Nov 2024</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                Net earnings
              </div>
              <p className="text-2xl font-bold">${demoEarnings.net.toFixed(2)}</p>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Gross
              </div>
              <p className="text-2xl font-bold">${demoEarnings.gross.toFixed(2)}</p>
            </Card>
          </div>

          {/* Trips list */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">Recent trips</h3>
            
            {demoEarnings.trips.map((trip) => (
              <Card key={trip.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">
                      {trip.from} → {trip.to}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(trip.date).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <p className="text-lg font-bold text-success">
                    +${trip.amount.toFixed(2)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
