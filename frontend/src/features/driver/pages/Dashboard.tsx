import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Car,
  CarFront,
  Clock,
  History,
  Loader2,
  Settings,
  ChevronRight,
  Calendar,
  TrendingUp,
  Package,
} from "lucide-react";
import { DriverOffersSection } from "@/features/driver/pages/DriverOffersSection";
import { DriverScheduleSection } from "@/features/driver/pages/DriverScheduleSection";

export default function Dashboard() {
  const navigate = useNavigate();
  const username = useAuthStore((state) => state.username);
  const userRole = useAuthStore((state) => state.userRole);
  
  const [isOnline, setIsOnline] = useState(false);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  const [showRidesSection, setShowRidesSection] = useState(true);
  const [showOffersSection, setShowOffersSection] = useState(true);

  const roleLabel = userRole === "company_representative" ? "Company Representative" : "Driver";

  async function handleToggleOnline(next: boolean) {
    setIsTogglingOnline(true);
    try {
      // TODO: call setDriverAvailability(next) from "@/features/driver/api"
      setIsOnline(next);
    } finally {
      setIsTogglingOnline(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black">
                <CarFront className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">OSRH Driver</h1>
                <p className="text-xs text-gray-500">{username}</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("profile")}
              className="text-gray-600 hover:text-gray-200"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <main className="w-full px-4 pb-20 pt-6 space-y-4">
        {/* Active Rides Section */}
        {showRidesSection ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Your Rides</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRidesSection(false)}
                className="text-xs text-gray-500 hover:text-gray-200"
              >
                Hide
              </Button>
            </div>
            <DriverScheduleSection />
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRidesSection(true)}
            className="w-full border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-black"
          >
            Show Your Rides
          </Button>
        )}

        {/* Available Offers Section */}
        {showOffersSection ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Available Offers</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOffersSection(false)}
                className="text-xs text-gray-500 hover:text-gray-200"
              >
                Hide
              </Button>
            </div>
            <DriverOffersSection />
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOffersSection(true)}
            className="w-full border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-black"
          >
            Show Available Offers
          </Button>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Card 
            className="border border-gray-200 bg-white hover:border-black hover:shadow-md cursor-pointer transition-all"
            onClick={() => navigate("vehicles")}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Car className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Vehicles</p>
                    <p className="text-xs text-gray-500">Manage fleet</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </Card>

          <Card 
            className="border border-gray-200 bg-white hover:border-black hover:shadow-md cursor-pointer transition-all"
            onClick={() => navigate("services")}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Services</p>
                    <p className="text-xs text-gray-500">View enrollments</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </Card>

          <Card 
            className="border border-gray-200 bg-white hover:border-black hover:shadow-md cursor-pointer transition-all"
            onClick={() => navigate("availability")}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Schedule</p>
                    <p className="text-xs text-gray-500">Set availability</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </Card>

          <Card 
            className="border border-gray-200 bg-white hover:border-black hover:shadow-md cursor-pointer transition-all"
            onClick={() => navigate("history")}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <History className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">History</p>
                    <p className="text-xs text-gray-500">Past rides</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
