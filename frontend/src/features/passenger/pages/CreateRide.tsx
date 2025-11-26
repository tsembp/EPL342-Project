import { useState, useEffect } from "react";
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
} from "lucide-react";

// Very simple pickup-time + rider type enums for now
const PICKUP_TIMES = [
  { value: "now", label: "Pickup now" },
  { value: "in_15", label: "In 15 minutes" },
  { value: "in_30", label: "In 30 minutes" },
];

const RIDER_TYPES = [
  { value: "me", label: "For me" },
  { value: "other", label: "For someone else" },
];

export default function CreateRide() {
  const [stations, setStations] = useState<Station[]>([]);
  const [pickup, setPickup] = useState<Station | null>(null);
  const [dropoff, setDropoff] = useState<Station | null>(null);
  const [pickupTime, setPickupTime] = useState<string>("now");
  const [riderType, setRiderType] = useState<string>("me");
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For now, we’ll pick a default ride profile from meta/enums
  const [profiles, setProfiles] = useState<any[]>([]);

  // ─────────────────────────────────────────────
  // Fetch meta/enums (ride profiles) + stations
  // ─────────────────────────────────────────────
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
      icon: isPickup ? "pickup" : isDropoff ? "dropoff" : "station",
      popup: `${station.name} (${station.zoneName})`,
      onClick: () => {
        // Simple behaviour: if no pickup -> set pickup, else set dropoff
        if (!pickup) {
          setPickup(station);
        } else if (!dropoff) {
          setDropoff(station);
        } else {
          // If both set, clicking toggles closest role
          const sameAsPickup = pickup.pointId === station.pointId;
          const sameAsDropoff = dropoff.pointId === station.pointId;
          if (sameAsPickup) setPickup(null);
          else if (sameAsDropoff) setDropoff(null);
          else setDropoff(station);
        }
      },
    };
  });

  const polyline =
    pickup && dropoff
      ? [
          [pickup.latitude, pickup.longitude],
          [dropoff.latitude, dropoff.longitude],
        ]
      : undefined;

  const mapCenter: [number, number] =
    pickup?.latitude !== undefined && pickup?.longitude !== undefined
      ? [pickup.latitude, pickup.longitude]
      : dropoff?.latitude !== undefined && dropoff?.longitude !== undefined
      ? [dropoff.latitude, dropoff.longitude]
      : DEFAULT_MAP_CENTER as [number, number];

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  function computePickupAtISO(): string {
    const now = new Date();
    if (pickupTime === "in_15") {
      now.setMinutes(now.getMinutes() + 15);
    } else if (pickupTime === "in_30") {
      now.setMinutes(now.getMinutes() + 30);
    }
    return now.toISOString();
  }

  async function handleSearch() {
    if (!pickup || !dropoff) {
      toast.error("Select both pickup and dropoff locations.");
      return;
    }

    const profile = profiles[0];
    if (!profile) {
      toast.error("Ride configuration not available.");
      return;
    }

    const rideProfileId = profile.ride_profile_id;
    const pickupAt = computePickupAtISO();

    try {
      setIsSubmitting(true);

      const res = await fetch("/api/passenger/request-ride", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pickupPointId: pickup.pointId,
          dropoffPointId: dropoff.pointId,
          rideProfileId,
          numOfPeople: 1,
          pickupAt,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Ride requested!");
        // Reset minimal state so user can create another ride
        setPickup(null);
        setDropoff(null);
        setPickupTime("now");
        setRiderType("me");
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
  // UI
  // ─────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      {/* Top bar – simple Uber-like */}
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight">Ride</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          {/* Placeholder – you can wire actual auth actions later */}
          <button className="rounded-full border px-4 py-1 hover:bg-neutral-50">
            Login
          </button>
          <button className="rounded-full bg-neutral-900 px-4 py-1 text-white hover:bg-black">
            Sign up
          </button>
        </div>
      </header>

      {/* Main layout: left panel + right map */}
      <main className="flex flex-1 flex-col lg:flex-row">
        {/* LEFT PANEL */}
        <section className="flex w-full justify-center border-b bg-white px-4 py-6 lg:w-[380px] lg:border-b-0 lg:border-r">
          <Card className="w-full max-w-md border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Get a ride</h2>

            <div className="space-y-3 text-sm">
              {/* Pickup */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Pickup location
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                  <MapPin className="h-4 w-4 text-neutral-600" />
                  <select
                    className="w-full bg-transparent text-sm outline-none"
                    value={pickup?.pointId ?? ""}
                    onChange={(e) => {
                      const station = stations.find(
                        (s) => s.pointId === Number(e.target.value),
                      );
                      setPickup(station ?? null);
                    }}
                  >
                    <option value="">Choose pickup point</option>
                    {stations.map((s) => (
                      <option key={s.pointId} value={s.pointId}>
                        {s.name} ({s.zoneName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dropoff */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Dropoff location
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                  <Navigation2 className="h-4 w-4 text-neutral-600" />
                  <select
                    className="w-full bg-transparent text-sm outline-none"
                    value={dropoff?.pointId ?? ""}
                    onChange={(e) => {
                      const station = stations.find(
                        (s) => s.pointId === Number(e.target.value),
                      );
                      setDropoff(station ?? null);
                    }}
                  >
                    <option value="">Choose dropoff point</option>
                    {stations.map((s) => (
                      <option key={s.pointId} value={s.pointId}>
                        {s.name} ({s.zoneName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pickup time */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Pickup time
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                  <Clock className="h-4 w-4 text-neutral-600" />
                  <select
                    className="w-full bg-transparent text-sm outline-none"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                  >
                    {PICKUP_TIMES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* For me / Someone else */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Rider
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                  <User className="h-4 w-4 text-neutral-600" />
                  <select
                    className="w-full bg-transparent text-sm outline-none"
                    value={riderType}
                    onChange={(e) => setRiderType(e.target.value)}
                  >
                    {RIDER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Info / hint */}
              {pickup && dropoff && (
                <div className="pt-1 text-xs text-neutral-500">
                  <span>Route from </span>
                  <Badge variant="outline" className="mr-1">
                    {pickup.zoneName}
                  </Badge>
                  <span>to </span>
                  <Badge variant="outline">{dropoff.zoneName}</Badge>
                </div>
              )}

              {/* Search button */}
              <Button
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-black disabled:bg-neutral-300 disabled:text-neutral-500"
                disabled={
                  isSubmitting || isLoadingStations || !pickup || !dropoff
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
        <section className="relative flex-1 bg-neutral-100">
          <MapView center={mapCenter} markers={markers} polyline={polyline} />
        </section>
      </main>

      {/* Bottom nav for mobile (unchanged) */}
      <BottomNav />
    </div>
  );
}
