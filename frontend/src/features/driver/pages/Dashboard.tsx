import { useState } from "react";
import { Header } from "@/components/Header";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Car,
  CarFront,
  ClipboardList,
  CreditCard,
  History,
  Loader2,
  MapPin,
  Settings,
} from "lucide-react";
import { VehicleManagementSection } from "@/features/driver/components/VehicleManagementSection";
import { DriverServicesSection } from "@/features/driver/pages/DriverServicesSection";



import { DriverOffersSection } from "@/features/driver/pages/DriverOffersSection";
import DriverProfile from "@/features/driver/pages/DriverProfile";
import { DriverScheduleSection } from "@/features/driver/pages/DriverScheduleSection";
import { DriverHistorySection } from "@/features/driver/pages/DriverHistorySection";
import { DriverAvailabilitySection } from "@/features/driver/pages/DriverAvailabilitySection";


type TabKey =
  | "rides"
  | "offers"
  | "services"
  | "vehicles"
  | "availability"
  | "history"
  | "profile";

export default function Dashboard() {

  const username = useAuthStore((state) => state.username);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "rides";
  
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [isOnline, setIsOnline] = useState(false);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  const userName = useAuthStore((state) => state.username);

  async function handleToggleOnline(next: boolean) {
    setIsTogglingOnline(true);
    try {
      // TODO: call setDriverAvailability(next) from "@/features/driver/api"
      setIsOnline(next);
    } finally {
      setIsTogglingOnline(false);
    }
  }

  const handleTabChange = (v: string) => {
    const newTab = v as TabKey;
    setTab(newTab);
    setSearchParams({ tab: newTab });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <Header title="Driver Dashboard" />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-8 pt-4">
        {/* Top driver status card */}
        <Card className="border border-neutral-800 bg-neutral-900/80 p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900">
                <CarFront className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Driver mode
                </p>
                <h1 className="text-xl font-semibold text-neutral-50 sm:text-2xl">
                  Welcome back, {username || "Driver"}
                </h1>
                <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                  <Badge
                    variant="outline"
                    className="border-neutral-700 bg-neutral-900/60 text-[11px] font-normal text-neutral-300"
                  >
                    <Car className="mr-1 h-3 w-3" />
                    Ride &amp; cargo services
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-neutral-900/70 px-3 py-2">
              <div className="flex flex-col text-right">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                  Status
                </span>
                <span
                  className={`text-sm font-semibold ${
                    isOnline ? "text-emerald-400" : "text-neutral-300"
                  }`}
                >
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
              <Switch
                checked={isOnline}
                disabled={isTogglingOnline}
                onCheckedChange={handleToggleOnline}
              />
              {isTogglingOnline && (
                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
              )}
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs
          value={tab}
          onValueChange={handleTabChange}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-7 rounded-xl bg-neutral-900/70 p-1">
            <TabsTrigger
              value="rides"
              className="text-xs sm:text-sm text-neutral-400 data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50"
            >
              Rides
            </TabsTrigger>
            <TabsTrigger
              value="offers"
              className="text-xs sm:text-sm text-neutral-400 data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50"
            >
              Offers
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="text-xs sm:text-sm text-neutral-400 data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50"
            >
              Services
            </TabsTrigger>
            <TabsTrigger
              value="vehicles"
              className="text-xs sm:text-sm text-neutral-400 data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50"
            >
              Vehicles
            </TabsTrigger>
            <TabsTrigger
              value="availability"
              className="text-xs sm:text-sm text-neutral-400 data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50"
            >
              Availability
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-xs sm:text-sm text-neutral-400 data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50"
            >
              History
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="text-xs sm:text-sm text-neutral-400 data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50"
            >
              Profile
            </TabsTrigger>
          </TabsList>

          {/* RIDES TAB */}
          <TabsContent value="rides">
            <DriverScheduleSection />
          </TabsContent>


          {/* OFFERS TAB – now split */}
          <TabsContent value="offers">
            <DriverOffersSection />
          </TabsContent>

          
          {/* SERVICES TAB */}
          <TabsContent value="services">
            <DriverServicesSection />
          </TabsContent>



          {/* VEHICLES TAB */}
          <TabsContent value="vehicles">
            <VehicleManagementSection />
          </TabsContent>
          {/* AVAILABILITY TAB */}
          <TabsContent value="availability">
            <DriverAvailabilitySection />
          </TabsContent>
          {/* HISTORY TAB */}
          <TabsContent value="history">
            <DriverHistorySection />
          </TabsContent>

          {/* PROFILE TAB */}
          <TabsContent value="profile">
            <DriverProfile />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function DriverHomeSection({
  isOnline,
  onRegisterServiceClick,
  onRegisterVehicleClick,
}: {
  isOnline: boolean;
  onRegisterServiceClick: () => void;
  onRegisterVehicleClick: () => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-[2fr,1.2fr]">
      {/* Left: overview + quick actions */}
      <div className="space-y-4">
        <Card className="border border-neutral-800 bg-neutral-900/80 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Today
              </p>
              <h2 className="text-lg font-semibold text-neutral-50">
                Overview
              </h2>
            </div>
            <Badge
              variant="outline"
              className={`border-neutral-700 bg-neutral-900/70 text-[11px] font-normal ${
                isOnline ? "text-emerald-400" : "text-neutral-300"
              }`}
            >
              {isOnline ? "Accepting rides" : "Offline"}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniStat label="Trips" value="—" />
            <MiniStat label="Earnings" value="—" prefix="€" />
            <MiniStat label="Time online" value="—" suffix="h" />
          </div>
        </Card>

        {/* Quick actions */}
        <Card className="border border-neutral-800 bg-neutral-900/80 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-50">
              Quick actions
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
              onClick={onRegisterServiceClick}
            >
              <ClipboardList className="h-4 w-4" />
              Register new service
            </Button>
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2 rounded-xl border-neutral-700 bg-neutral-900 text-sm font-semibold text-neutral-100 hover:bg-neutral-800"
              onClick={onRegisterVehicleClick}
            >
              <CarFront className="h-4 w-4" />
              Register vehicle
            </Button>
          </div>
        </Card>
      </div>

      {/* Right: status / next steps */}
      <Card className="border border-neutral-800 bg-neutral-900/80 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-neutral-50">
          What’s next
        </h3>
        <p className="mt-2 text-xs text-neutral-400">
          Soon this panel will guide the driver step-by-step:
          complete documents, add vehicles, enroll services, and go
          online safely.
        </p>
        <ul className="mt-4 space-y-2 text-xs text-neutral-300">
          <li>• Register at least one vehicle.</li>
          <li>• Upload required personal &amp; vehicle documents.</li>
          <li>• Enroll in at least one service with a chosen vehicle.</li>
          <li>• Go online and start receiving offers.</li>
        </ul>
      </Card>
    </div>
  );
}

function MiniStat({
  label,
  value,
  prefix,
  suffix,
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-neutral-50">
        {prefix}
        {value}
        {suffix}
      </p>
    </div>
  );
}

function PlaceholderSection({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="border border-neutral-800 bg-neutral-900/80 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-neutral-50">
            {title}
          </h2>
          <p className="mt-1 text-xs text-neutral-400">{description}</p>
        </div>
      </div>
    </Card>
  );
}
