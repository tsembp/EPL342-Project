import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/MapView";
import { BottomNav } from "@/components/BottomNav";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";
import type { Station } from "@/types/api";
import { toast } from "sonner";
import {
  MapPin,
  Navigation2,
  Clock,
  User,
  Search as SearchIcon,
  Car,
  Sparkles,
  Truck,
  Package,
  Route,
  Bot,
  Gamepad2,
  KeyRound
} from "lucide-react";

const serviceIcons = {
  simple_route: Car,
  luxury_route: Sparkles,
  light_cargo: Package,
  heavy_cargo: Truck,
  bridged_route: Route,
};

const rideTypeIcons: Record<string, any> = {
  fully_autonomous: Bot,
  teledriving: Gamepad2,
  vehicle_no_driver: KeyRound,
  vehicle_with_driver: Car,
  small_cargo_van: Truck,
};

export default function CreateRide() {
  // Car animation loading state for alternatives calculation
  const [isCalculatingAlternatives, setIsCalculatingAlternatives] = useState(false);
  // Car animation component (reuse from RideAlternativesPage)
  function CarLoadingAnimation() {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative w-32 h-16">
          <div className="absolute left-0 top-1/2 animate-car-move">
            <Car className="w-16 h-16 text-emerald-500" />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-neutral-700 to-neutral-900 rounded-full" />
        </div>
        <div className="mt-4 text-neutral-400 text-sm">Calculating possible routes...</div>
        <style>{`
          @keyframes car-move {
            0% { left: 0; }
            100% { left: 8rem; }
          }
          .animate-car-move {
            animation: car-move 2s linear infinite alternate;
          }
        `}</style>
      </div>
    );
  }
  const navigate = useNavigate();
  const [stations, setStations] = useState<Station[]>([]);
  const [pickup, setPickup] = useState<Station | null>(null);
  const [dropoff, setDropoff] = useState<Station | null>(null);
  // Pickup time selection: preset intervals
  const pickupOptions = [
    { label: "In 5 minutes", value: 5 },
    { label: "In 15 minutes", value: 15 },
    { label: "In 30 minutes", value: 30 },
    { label: "In 1 hour", value: 60 },
    { label: "In 2 hours", value: 120 },
    { label: "In 3 hours", value: 180 },
  ];
  const [pickupTimeMinutes, setPickupTimeMinutes] = useState<number>(5);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [rideTypes, setRideTypes] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [selected, setSelected] = useState({
    serviceType: "",
    rideType: "",
    vehicleType: "",
  });
  const [comboError, setComboError] = useState<string | null>(null);
  const [numOfPeople, setNumOfPeople] = useState(1);

  // ─────────────────────────────────────────────
  // Fetch meta/enums (ride profiles) + stations
  // ─────────────────────────────────────────────
  useEffect(() => {
    async function fetchMetaAndStations() {
      try {
        setIsLoadingStations(true);
        const metaRes = await fetch("/api/meta/enums");
        const meta = await metaRes.json();
        setProfiles(meta.combo_specs || []);
        setServices(meta.services || []);
        setRideTypes(meta.ride_types || []);
        setVehicleTypes(meta.veh_types || []);
        // ...fetch stations as before...
      } catch (err) {
        toast.error("Failed to load stations or ride profiles.");
      } finally {
        setIsLoadingStations(false);
      }
    }
    fetchMetaAndStations();
  }, []);

  useEffect(() => {
    async function fetchMetaAndStations() {
      try {
        setIsLoadingStations(true);

        // meta/enums (for rideProfileId)
        const metaRes = await fetch("/api/meta/enums");
        const meta = await metaRes.json();
        setProfiles(meta.combo_specs || []);

        // all stations (pickup + dropoff)
        const params = new URLSearchParams();
        params.append("pointType", "S");
        const stationRes = await fetch(`/api/stations?${params.toString()}`);
        const stationData = await stationRes.json();
        setStations(stationData.stations as Station[]);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load stations. Please try again.");
      } finally {
        setIsLoadingStations(false);
      }
    }

    fetchMetaAndStations();
  }, []);

  // ─────────────────────────────────────────────
  // Map markers + path
  // ─────────────────────────────────────────────
  const markers = stations.map((station) => {
    const isPickup = pickup?.pointId === station.pointId;
    const isDropoff = dropoff?.pointId === station.pointId;

    return {
      position: [station.latitude, station.longitude] as [number, number],
      icon: (isPickup
        ? "pickup"
        : isDropoff
        ? "dropoff"
        : "station") as "pickup" | "dropoff" | "station" | "default" | "vehicle",
      popup: `${station.name} (${station.zoneName})`,
      onClick: () => {
        if (!pickup) {
          setPickup(station);
        } else if (!dropoff) {
          setDropoff(station);
        } else {
          // If both are set, clicking any other point sets pickup to that point and clears dropoff
          if (station.pointId !== pickup.pointId && station.pointId !== dropoff.pointId) {
            setPickup(station);
            setDropoff(null);
          } else if (station.pointId === pickup.pointId) {
            setPickup(null);
          } else if (station.pointId === dropoff.pointId) {
            setDropoff(null);
          }
        }
      },
    };
  });

  const polyline: [number, number][] =
    pickup && dropoff
      ? [
          [pickup.latitude, pickup.longitude] as [number, number],
          [dropoff.latitude, dropoff.longitude] as [number, number],
        ]
      : [];

  const mapCenter: [number, number] =
    pickup?.latitude !== undefined && pickup?.longitude !== undefined
      ? [pickup.latitude, pickup.longitude]
      : dropoff?.latitude !== undefined && dropoff?.longitude !== undefined
      ? [dropoff.latitude, dropoff.longitude]
      : (DEFAULT_MAP_CENTER as [number, number]);

  const filteredRideTypeIds = selected.serviceType
    ? Array.from(
        new Set(
          profiles
            .filter((p) => String(p.service_type_id) === selected.serviceType)
            .map((p) => p.ride_type_id)
        )
      )
    : [];

  const filteredRideTypes = filteredRideTypeIds.map((id) => {
    // rideTypes is an array of [id, name]
    const rideType = Array.isArray(rideTypes)
      ? rideTypes.find((rt) => String(rt[0]) === String(id))
      : null;
    return rideType
      ? { id: rideType[0], name: rideType[1] }
      : { id, name: id };
  });

  const filteredVehicleTypeIds = selected.serviceType && selected.rideType
    ? Array.from(
        new Set(
          profiles
            .filter(
              (p) =>
                String(p.service_type_id) === selected.serviceType &&
                String(p.ride_type_id) === selected.rideType
            )
            .map((p) => p.vehicle_type_id)
        )
      )
    : [];

  const filteredVehicleTypes = filteredVehicleTypeIds.map((id) => {
    // vehicleTypes is an array of [id, name]
    const vehicleType = Array.isArray(vehicleTypes)
      ? vehicleTypes.find((vt) => String(vt[0]) === String(id))
      : null;
    return vehicleType
      ? { id: vehicleType[0], name: vehicleType[1] }
      : { id, name: id };
  });

  useEffect(() => {
    if (selected.serviceType && selected.rideType && selected.vehicleType) {
      const valid = profiles.find(
        (p) =>
          String(p.service_type_id) === selected.serviceType &&
          String(p.ride_type_id) === selected.rideType &&
          String(p.vehicle_type_id) === selected.vehicleType
      );
      setComboError(valid ? null : "This combination is not available.");
    } else {
      setComboError(null);
    }
  }, [selected, profiles]);

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  function getMinMaxTime() {
    const now = new Date();
    const min = now.toISOString().slice(0, 16);
    const maxDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const max = maxDate.toISOString().slice(0, 16);
    return { min, max };
  }

  // Removed pickupTime effect, not needed for preset intervals

  function computePickupAtISO(): string {
  // Compute ISO string for pickup time based on selected minutes from now
  const now = new Date();
  now.setMinutes(now.getMinutes() + pickupTimeMinutes);
  return now.toISOString().slice(0, 19); // "YYYY-MM-DDTHH:mm:ss"
  }

  const maxSeats = selected.serviceType && selected.rideType && selected.vehicleType
    ? (() => {
        const profile = profiles.find(
          (p) =>
            String(p.service_type_id) === selected.serviceType &&
            String(p.ride_type_id) === selected.rideType &&
            String(p.vehicle_type_id) === selected.vehicleType
        );
        return profile?.num_seats || 4;
      })()
    : 4;

  async function handleSearch() {
    if (!pickup || !dropoff) {
      toast.error("Select both pickup and dropoff locations.");
      return;
    }

    // Find the correct profile based on selected service, ride, and vehicle type
    const profile = profiles.find(
      (p) =>
        String(p.service_type_id) === selected.serviceType &&
        String(p.ride_type_id) === selected.rideType &&
        String(p.vehicle_type_id) === selected.vehicleType
    );
    if (!profile) {
      toast.error("Ride configuration not available for selected options.");
      return;
    }

    const rideProfileId = profile.ride_profile_id;
    const pickupAt = computePickupAtISO();

    try {
      setIsSubmitting(true);
      setIsCalculatingAlternatives(false);

      const requestBody = {
        pickupPointId: pickup.pointId,
        dropoffPointId: dropoff.pointId,
        rideProfileId,
        numOfPeople,
        pickupAt,
      };
      console.log("Ride request payload:", requestBody);

      const res = await fetch("/api/passenger/request-ride", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Ride requested!");
        // Reset minimal state so user can create another ride
        setPickup(null);
        setDropoff(null);
        setPickupTimeMinutes(5); // reset to default interval

        // Step 2: Calculate alternatives before redirect
        setIsCalculatingAlternatives(true);
        try {
          const altRes = await fetch(`/api/passenger/ride-requests/${data.requestId}/alternatives`, {
            credentials: "include",
          });
          const altData = await altRes.json();
          console.debug("[CreateRide] Alternatives API response:", altData);
          // Optionally, you can pass alternatives to the next page via state, but for now just redirect
          navigate(`/ride-alternatives/${data.requestId}`);
        } catch (altErr) {
          console.error("[CreateRide] Alternatives fetch error:", altErr);
          toast.error("Failed to calculate alternative routes.");
        } finally {
          setIsCalculatingAlternatives(false);
        }
      } else {
        toast.error(data.error || "Failed to request ride");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting ride request");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────
  // UI – DARK THEME
  // ─────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-50">
      {/* Car animation overlay for alternatives calculation */}
      {isCalculatingAlternatives && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <CarLoadingAnimation />
        </div>
      )}
      {/* Top bar – simple Uber-like */}
      <header className="flex items-center justify-between border-b border-neutral-900 bg-neutral-950 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight">Ride</span>
        </div>
      </header>

      {/* Main layout: left panel + right map */}
      <main className="flex flex-1 flex-col lg:flex-row">
        {/* LEFT PANEL */}
        <section className="flex w-full justify-center border-b border-neutral-900 bg-neutral-950 px-4 py-6 lg:w-[380px] lg:border-b-0 lg:border-r">
          <Card className="w-full max-w-md border border-neutral-800 bg-neutral-900/80 p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold text-neutral-50">
              Get a ride
            </h2>
            <div className="space-y-3 text-sm">
              {/* Service Type Dropdown */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Service Type
                </label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Car className="h-5 w-5 text-emerald-500" />
                  </span>
                  <select
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-10 pr-10 py-2 text-neutral-50 appearance-none outline-none"
                    value={selected.serviceType}
                    onChange={(e) =>
                      setSelected((s) => ({
                        ...s,
                        serviceType: e.target.value,
                        rideType: "",
                        vehicleType: "",
                      }))
                    }
                  >
                    <option value="">Choose service type</option>
                    {services.map((item) => (
                      <option key={item[0]} value={item[0]}>
                        {item[1].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M6 8l4 4 4-4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </div>
              </div>

              {/* Ride Type Dropdown */}
              {selected.serviceType && (
                <div className="mt-4">
                  <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Ride Type
                  </label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Bot className="h-5 w-5 text-emerald-500" />
                    </span>
                    <select
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-10 pr-10 py-2 text-neutral-50 appearance-none outline-none"
                      value={selected.rideType}
                      onChange={(e) =>
                        setSelected((s) => ({
                          ...s,
                          rideType: e.target.value,
                          vehicleType: "",
                        }))
                      }
                      disabled={!selected.serviceType}
                    >
                      <option value="">Choose ride type</option>
                      {filteredRideTypes.length > 0 ? (
                        filteredRideTypes.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No ride types available</option>
                      )}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M6 8l4 4 4-4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  </div>
                </div>
              )}

              {/* Vehicle Type Dropdown */}
              {selected.serviceType && selected.rideType && (
                <div className="mt-4">
                  <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Vehicle Type
                  </label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Car className="h-5 w-5 text-emerald-500" />
                    </span>
                    <select
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-10 pr-10 py-2 text-neutral-50 appearance-none outline-none"
                      value={selected.vehicleType}
                      onChange={(e) => {
                        setSelected((s) => ({
                          ...s,
                          vehicleType: e.target.value,
                        }));
                        setNumOfPeople(1); // reset people count on vehicle change
                      }}
                      disabled={!selected.serviceType || !selected.rideType}
                    >
                      <option value="">Choose vehicle type</option>
                      {filteredVehicleTypes.length > 0 ? (
                        filteredVehicleTypes.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No vehicle types available</option>
                      )}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M6 8l4 4 4-4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  </div>
                </div>
              )}

              {/* Number of People Selection */}
              {selected.serviceType && selected.rideType && selected.vehicleType && (
                <div className="mt-4">
                  <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Number of People
                  </label>
                  <div className="flex items-center gap-4 mt-2">
                    <button
                      type="button"
                      className="p-2 rounded-full border bg-neutral-800 hover:bg-primary/10 transition disabled:opacity-50 text-emerald-400 font-bold"
                      disabled={numOfPeople <= 1}
                      onClick={() => setNumOfPeople(numOfPeople - 1)}
                      aria-label="Decrease"
                    >
                      -
                    </button>
                    <span className="font-bold text-lg w-10 text-center text-emerald-400">{numOfPeople}</span>
                    <button
                      type="button"
                      className="p-2 rounded-full border bg-neutral-800 hover:bg-primary/10 transition disabled:opacity-50 text-emerald-400 font-bold"
                      disabled={numOfPeople >= maxSeats}
                      onClick={() => setNumOfPeople(numOfPeople + 1)}
                      aria-label="Increase"
                    >
                      +
                    </button>
                    <span className="text-muted-foreground text-xs">
                      (Max {maxSeats} for this vehicle)
                    </span>
                  </div>
                  {numOfPeople > maxSeats && (
                    <Badge variant="destructive" className="mt-2">
                      Too many people for this vehicle type!
                    </Badge>
                  )}
                </div>
              )}

              {/* Combo error */}
              {comboError && (
                <Badge variant="destructive" className="mt-2">
                  {comboError}
                </Badge>
              )}
            </div>

            <div className="space-y-3 text-sm">
              {/* Pickup */}
              <div className="flex flex-col gap-1 mt-6">
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Pickup location
                </label>
                <div className="relative flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 cursor-pointer"
                  onClick={() => {
                    // Optionally open a modal or picker for stations
                  }}
                >
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  <span className="flex-1 text-sm text-neutral-50">
                    {pickup ? `${pickup.name} (${pickup.zoneName})` : "Choose pickup point"}
                  </span>
                </div>
              </div>

              {/* Dropoff */}
              <div className="flex flex-col gap-1 mt-2">
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Dropoff location
                </label>
                <div className="relative flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 cursor-pointer"
                  onClick={() => {
                    // Optionally open a modal or picker for stations
                  }}
                >
                  <Navigation2 className="h-4 w-4 text-emerald-500" />
                  <span className="flex-1 text-sm text-neutral-50">
                    {dropoff ? `${dropoff.name} (${dropoff.zoneName})` : "Choose dropoff point"}
                  </span>
                </div>
              </div>

              {/* Pickup time selection (preset intervals) */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Pickup time
                </label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Clock className="h-5 w-5 text-emerald-500" />
                  </span>
                  <select
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-10 pr-10 py-2 text-neutral-50 appearance-none outline-none"
                    value={pickupTimeMinutes}
                    onChange={e => setPickupTimeMinutes(Number(e.target.value))}
                  >
                    {pickupOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M6 8l4 4 4-4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </div>
              </div>

              {/* Info / hint */}
              {pickup && dropoff && (
                <div className="pt-1 text-xs text-neutral-400">
                  <span>Route from </span>
                  <Badge
                    variant="outline"
                    className="mr-1 border-neutral-700 bg-neutral-900 text-neutral-200"
                  >
                    {pickup.zoneName}
                  </Badge>
                  <span>to </span>
                  <Badge
                    variant="outline"
                    className="border-neutral-700 bg-neutral-900 text-neutral-200"
                  >
                    {dropoff.zoneName}
                  </Badge>
                </div>
              )}

              {/* Search button */}
              <Button
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-medium text-neutral-950 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500"
                disabled={
                  isSubmitting ||
                  isLoadingStations ||
                  !pickup ||
                  !dropoff ||
                  !selected.serviceType ||
                  !selected.rideType ||
                  !selected.vehicleType ||
                  !!comboError
                }
                onClick={handleSearch}
              >
                {isSubmitting ? (
                  "Requesting…"
                ) : (
                  <>
                    <SearchIcon className="h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </Card>
        </section>

        {/* RIGHT MAP */}
        <section className="relative flex-1 border-t border-neutral-900 bg-neutral-900 lg:border-t-0 lg:border-l">
          <MapView center={mapCenter} markers={markers} polyline={polyline} />
        </section>
      </main>

      {/* Bottom nav for mobile (unchanged, but dark bg from global layout) */}
      <BottomNav />
    </div>
  );
}
