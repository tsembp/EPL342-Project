import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/MapView";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";
import type { Station } from "@/types/api";
import {
  Car,
  Sparkles,
  Truck,
  Package,
  Route,
  User,
  ArrowLeft,
  Bot,
  Gamepad2,
  KeyRound,
  Plus,
  Minus
} from "lucide-react";
import { requestRide } from "@/lib/api";

const serviceIcons = {
  simple_route: Car,
  luxury_route: Sparkles,
  light_cargo: Package,
  heavy_cargo: Truck,
  bridged_route: Route,
};

const rideTypeIcons: Record<string, any> = {
  fully_autonomous: Bot, // robot icon
  teledriving: Gamepad2, // remote controller icon
  vehicle_no_driver: KeyRound, // rental key icon
  vehicle_with_driver: Car, // fallback: car icon
  small_cargo_van: Truck, // fallback: truck
};

function StepHeader({ step, total, title }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="font-bold text-lg">{title}</h2>
        <span className="text-xs text-muted-foreground">
          Step {step} of {total}
        </span>
      </div>
      <Progress value={Math.round((step / total) * 100)} className="w-32" />
    </div>
  );
}

export default function CreateRide() {
  const [step, setStep] = useState(0);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [rideTypes, setRideTypes] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [selected, setSelected] = useState({
    serviceType: "",
    rideType: "",
    vehicleType: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pickup, setPickup] = useState<Station | null>(null);
  const [dropoff, setDropoff] = useState<Station | null>(null);
  const [pickupStations, setPickupStations] = useState<Station[]>([]);
  const [dropoffStations, setDropoffStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [numOfPeople, setNumOfPeople] = useState(1);

  useEffect(() => {
    async function fetchProfiles() {
      const res = await fetch("/api/meta/enums");
      const data = await res.json();
      setProfiles(data.combo_specs);
      setServices(data.services);
      setRideTypes(data.ride_types);
      setVehicleTypes(data.veh_types);
    }
    fetchProfiles();
  }, []);

  // Filter ride types by selected service
  const filteredRideTypes = selected.serviceType
    ? Array.from(
        new Map(
          profiles
            .filter((p) => p.service_type_id === selected.serviceType)
            .map((p) => [p.ride_type_id, p.ride_type_name])
        ).entries()
      ).map(([id, name]) => [id, name])
    : [];

  // Filter vehicle types by selected service+ride
  const filteredVehicleTypes =
    selected.serviceType && selected.rideType
      ? Array.from(
          new Map(
            profiles
              .filter(
                (p) =>
                  p.service_type_id === selected.serviceType &&
                  p.ride_type_id === selected.rideType
              )
              .map((p) => [p.vehicle_type_id, p.vehicle_type_name])
          ).entries()
        ).map(([id, name]) => [id, name])
      : [];

  const maxSeats =
    selected.serviceType && selected.rideType && selected.vehicleType
      ? (() => {
          const profile = profiles.find(
            (p) =>
              p.service_type_id === selected.serviceType &&
              p.ride_type_id === selected.rideType &&
              p.vehicle_type_id === selected.vehicleType
          );
          return profile?.num_seats || 4; // fallback to 4
        })()
      : 4;

  const pathPolyline =
    pickup && dropoff
      ? [
          [pickup.latitude, pickup.longitude],
          [dropoff.latitude, dropoff.longitude],
        ]
      : undefined;


  // Validate combo
  useEffect(() => {
    if (selected.serviceType && selected.rideType && selected.vehicleType) {
      const valid = profiles.find(
        (p) =>
          p.service_type_id === selected.serviceType &&
          p.ride_type_id === selected.rideType &&
          p.vehicle_type_id === selected.vehicleType
      );
      setError(valid ? null : "This combination is not available.");
    } else {
      setError(null);
    }
  }, [selected, profiles]);

  // Fetch pickup stations
  useEffect(() => {
    if (step === 3) {
      setIsLoading(true);
      getStationsWithFilter({ isPickupAllowed: true }).then((stations) => {
        setPickupStations(stations);
        setIsLoading(false);
      });
    }
  }, [step]);

  // Fetch dropoff stations
  useEffect(() => {
    if (step === 4) {
      setIsLoading(true);
      getStationsWithFilter({ isDropoffAllowed: true }).then((stations) => {
        setDropoffStations(stations);
        setIsLoading(false);
      });
    }
  }, [step]);

  async function getStationsWithFilter(filter: {
    isPickupAllowed?: boolean;
    isDropoffAllowed?: boolean;
  }) {
    const params = new URLSearchParams();
    params.append("pointType", "S");
    if (filter.isPickupAllowed !== undefined)
      params.append(
        "isPickupAllowed",
        filter.isPickupAllowed ? "true" : "false"
      );
    if (filter.isDropoffAllowed !== undefined)
      params.append(
        "isDropoffAllowed",
        filter.isDropoffAllowed ? "true" : "false"
      );
    const response = await fetch(`/api/stations?${params.toString()}`);
    const data = await response.json();
    return data.stations as Station[];
  }

  // Markers for MapView
  const pickupMarkers = pickupStations.map((station) => ({
    position: [station.latitude, station.longitude] as [number, number],
    icon: station.pointId === pickup?.pointId ? "pickup" : "station",
    popup: `${station.name} (${station.zoneName})`,
    onClick: () => setPickup(station),
  }));

  const dropoffMarkers = dropoffStations.map((station) => ({
    position: [station.latitude, station.longitude] as [number, number],
    icon: station.pointId === dropoff?.pointId ? "dropoff" : "station",
    popup: `${station.name} (${station.zoneName})`,
    onClick: () => setDropoff(station),
  }));

  // Step titles
  const stepTitles = [
    "Select Service Type",
    "Select Ride Type",
    "Select Vehicle Type",
    "Number of People",
    "Select Pickup Location",
    "Select Dropoff Location",
    "Confirm Ride Request",
  ];

  // Animation helper
  function FadeIn({ children }) {
    return <div className="animate-fade-in">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Title – spans full width */}
      <header className="pt-8 pb-4 px-4 border-b bg-background">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">Plan Your Ride</h1>
          <p className="text-muted-foreground">
            Follow the steps below to request your ride
          </p>
        </div>
      </header>

      {/* Wizard takes the whole page */}
      <main className="flex-1 flex flex-col pb-24">
        <Card className="flex-1 rounded-none border-0 shadow-none px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <StepHeader
              step={step + 1}
              total={stepTitles.length}
              title={stepTitles[step]}
            />

            {step > 0 && (
              <button
                className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-primary transition"
                onClick={() => setStep(step - 1)}
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}

            {/* STEP 0 – SERVICE TYPE */}
            {step === 0 && (
              <FadeIn>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((item) => {
                    const Icon =
                      serviceIcons[
                        item[1]?.toLowerCase().replace(" ", "_")
                      ] || Car;
                    return (
                      <button
                        key={item[0]}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all w-full shadow-sm ${
                          selected.serviceType === item[0]
                            ? "border-primary bg-primary/10 ring-2 ring-primary"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() =>
                          setSelected((s) => ({
                            ...s,
                            serviceType: item[0],
                            rideType: "",
                            vehicleType: "",
                          }))
                        }
                      >
                        <Icon className="h-8 w-8 text-primary" />
                        <span className="font-semibold">
                          {item[1]
                            .split("_")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            )
                            .join(" ")}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  className="btn btn-primary mt-6 w-full sm:w-auto"
                  disabled={!selected.serviceType}
                  onClick={() => setStep(1)}
                >
                  Next
                </button>
              </FadeIn>
            )}

            {/* STEP 1 – RIDE TYPE */}
            {step === 1 && (
              <FadeIn>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredRideTypes.map((item) => {
                    const key = item[1]?.toLowerCase().replace(/ /g, "_");
                    const Icon = rideTypeIcons[key] || User;
                    return (
                      <button
                        key={item[0]}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all w-full shadow-sm ${
                          selected.rideType === item[0]
                            ? "border-primary bg-primary/10 ring-2 ring-primary"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() =>
                          setSelected((s) => ({
                            ...s,
                            rideType: item[0],
                            vehicleType: "",
                          }))
                        }
                      >
                        <Icon className="h-8 w-8 text-primary" />
                        <span className="font-semibold">
                          {item[1]
                            .split("_")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            )
                            .join(" ")}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  className="btn btn-primary mt-6 w-full sm:w-auto"
                  disabled={!selected.rideType}
                  onClick={() => setStep(2)}
                >
                  Next
                </button>
              </FadeIn>
            )}

            {/* STEP 2 – VEHICLE TYPE */}
            {step === 2 && (
              <FadeIn>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredVehicleTypes.map((item) => (
                    <button
                      key={item[0]}
                      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border transition-all shadow-sm text-xs ${
                        selected.vehicleType === item[0]
                          ? "border-primary bg-primary/10 ring-2 ring-primary"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() =>
                        setSelected((s) => ({ ...s, vehicleType: item[0] }))
                      }
                    >
                      <Car className="h-6 w-6 text-primary mb-1" />
                      <span className="font-semibold truncate">{item[1]}</span>
                    </button>
                  ))}
                </div>
                {error && (
                  <Badge variant="destructive" className="mt-2">
                    {error}
                  </Badge>
                )}
                <button
                  className="btn btn-primary mt-6 w-full sm:w-auto"
                  disabled={!selected.vehicleType || !!error}
                  onClick={() => setStep(3)}
                >
                  Next
                </button>
              </FadeIn>
            )}

            {/* STEP 3 – NUMBER OF PEOPLE */}
            {step === 3 && (
              <FadeIn>
                <div className="mb-6">
                  <label className="block font-semibold mb-2">
                    How many people are riding?
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      className="p-2 rounded-full border bg-muted hover:bg-primary/10 transition disabled:opacity-50"
                      disabled={numOfPeople <= 1}
                      onClick={() => setNumOfPeople(numOfPeople - 1)}
                      aria-label="Decrease"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <span className="font-bold text-lg w-10 text-center">{numOfPeople}</span>
                    <button
                      type="button"
                      className="p-2 rounded-full border bg-muted hover:bg-primary/10 transition disabled:opacity-50"
                      disabled={numOfPeople >= maxSeats}
                      onClick={() => setNumOfPeople(numOfPeople + 1)}
                      aria-label="Increase"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    <span className="text-muted-foreground">
                      (Max {maxSeats} for this vehicle)
                    </span>
                  </div>
                  {numOfPeople > maxSeats && (
                    <Badge variant="destructive" className="mt-2">
                      Too many people for this vehicle type!
                    </Badge>
                  )}
                </div>
                <button
                  className="btn btn-primary mt-6 w-full sm:w-auto"
                  disabled={numOfPeople < 1 || numOfPeople > maxSeats}
                  onClick={() => setStep(4)}
                >
                  Next
                </button>
              </FadeIn>
            )}

            {/* STEP 4 – PICKUP MAP */}
            {step === 4 && (
              <FadeIn>
                <div className="h-[50vh] mb-4 rounded-xl overflow-hidden border">
                  <MapView
                    center={
                      pickup
                        ? [pickup.latitude, pickup.longitude]
                        : DEFAULT_MAP_CENTER
                    }
                    markers={pickupMarkers}
                  />
                </div>
                <button
                  className="btn btn-primary w-full sm:w-auto"
                  disabled={!pickup}
                  onClick={() => setStep(5)}
                >
                  Next
                </button>
              </FadeIn>
            )}

            {/* STEP 5 – DROPOFF MAP */}
            {step === 5 && (
              <FadeIn>
                <div className="h-[50vh] mb-4 rounded-xl overflow-hidden border">
                  <MapView
                    center={
                      dropoff
                        ? [dropoff.latitude, dropoff.longitude]
                        : DEFAULT_MAP_CENTER
                    }
                    markers={dropoffMarkers}
                  />
                </div>
                <button
                  className="btn btn-success w-full sm:w-auto"
                  disabled={!dropoff}
                  onClick={() => setStep(6)}
                >
                  Next
                </button>
              </FadeIn>
            )}

            {/* STEP 6 – CONFIRMATION */}
            {step === 6 && (
              <FadeIn>
                <div className="mb-6">
                  <div className="rounded-xl border bg-muted/10 p-4 shadow-sm">
                  {/* Ride Profile Section */}
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" /> Ride Profile
                    </h3>
                    <div className="flex items-center gap-4 flex-wrap">
                    {/* Service Type */}
                    <div className="flex items-center gap-2">
                      {(() => {
                      const service = services.find(s => s[0] === selected.serviceType);
                      const Icon = serviceIcons[service?.[1]?.toLowerCase().replace(" ", "_")] || Car;
                      return <Icon className="h-6 w-6 text-primary" />;
                      })()}
                      <span className="font-medium">{services.find(s => s[0] === selected.serviceType)?.[1]}</span>
                    </div>
                    {/* Ride Type */}
                    <div className="flex items-center gap-2">
                      {(() => {
                      const ride = rideTypes.find(r => r[0] === selected.rideType);
                      const key = ride?.[1]?.toLowerCase().replace(/ /g, "_");
                      const Icon = rideTypeIcons[key] || User;
                      return <Icon className="h-6 w-6 text-primary" />;
                      })()}
                      <span className="font-medium">{rideTypes.find(r => r[0] === selected.rideType)?.[1]}</span>
                    </div>
                    {/* Vehicle Type */}
                    <div className="flex items-center gap-2">
                      <Car className="h-6 w-6 text-primary" />
                      <span className="font-medium">{vehicleTypes.find(v => v[0] === selected.vehicleType)?.[1]}</span>
                    </div>
                    </div>
                  </div>
                  <hr className="my-4" />
                  {/* Pickup Section */}
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <ArrowLeft className="h-5 w-5 text-primary" /> Pickup
                    </h3>
                    <div className="flex items-center gap-2">
                    <Badge variant="outline">{pickup?.zoneName}</Badge>
                    <span className="font-medium">{pickup?.name}</span>
                    </div>
                  </div>
                  <hr className="my-4" />
                  {/* Dropoff Section */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" /> Dropoff
                    </h3>
                    <div className="flex items-center gap-2">
                    <Badge variant="outline">{dropoff?.zoneName}</Badge>
                    <span className="font-medium">{dropoff?.name}</span>
                    </div>
                  </div>
                  <div className="h-[40vh] mb-4 rounded-xl overflow-hidden border">
                    <MapView
                    center={
                      pickup
                      ? [pickup.latitude, pickup.longitude]
                      : DEFAULT_MAP_CENTER
                    }
                    markers={[
                      {
                      position: [pickup.latitude, pickup.longitude],
                      icon: "pickup",
                      popup: pickup?.name,
                      },
                      {
                      position: [dropoff.latitude, dropoff.longitude],
                      icon: "dropoff",
                      popup: dropoff?.name,
                      },
                    ]}
                    polyline={pathPolyline}
                    />
                  </div>
                  </div>
                  <button
                    className="btn btn-primary w-full sm:w-auto"
                    disabled={
                      !pickup ||
                      !dropoff ||
                      !selected.serviceType ||
                      !selected.rideType ||
                      !selected.vehicleType ||
                      !numOfPeople
                    }
                    onClick={async () => {
                      // Find rideProfileId for selected combo
                      const profile = profiles.find(
                        (p) =>
                          p.service_type_id === selected.serviceType &&
                          p.ride_type_id === selected.rideType &&
                          p.vehicle_type_id === selected.vehicleType
                      );
                      if (!profile) {
                        toast.error("Invalid ride profile");
                        return;
                      }
                      const rideProfileId = profile.ride_profile_id;
                      const pickupAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 minutes from now

                      try {
                        const res = await fetch("/api/passenger/request-ride", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({
                            pickupPointId: pickup.pointId,
                            dropoffPointId: dropoff.pointId,
                            rideProfileId,
                            numOfPeople,
                            pickupAt,
                          }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          toast.success("Ride requested!");
                          setStep(0);
                          setSelected({
                            serviceType: "",
                            rideType: "",
                            vehicleType: "",
                          });
                          setPickup(null);
                          setDropoff(null);
                          setNumOfPeople(1);
                        } else {
                          toast.error(data.error || "Failed to request ride");
                        }
                      } catch (err) {
                        toast.error("Error submitting ride request");
                      }
                    }}
                  >
                    Submit Request
                  </button>
                </div>
              </FadeIn>
            )}
          </div>
        </Card>
      </main>

      {/* Bottom nav always at the bottom */}
      <BottomNav />

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
