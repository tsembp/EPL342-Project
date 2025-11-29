// src/features/driver/pages/DriverScheduleSection.tsx
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getDriverUpcomingRides,
  startDriverRide,
  endDriverRide,
  type DriverRideRow,
} from "@/features/driver/api";
import {
  Clock,
  MapPin,
  Users,
  ArrowRight,
  Loader2,
  MessageCircle,
  Eye,
} from "lucide-react";
import { MapView } from "@/components/MapView";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";
import RideChatWindow from "@/features/passenger/components/FloatingChatWindow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type ActiveChatState = {
  rideId: number;
};

// ---------- helpers for map + timing ----------

function getRideMarkers(ride: DriverRideRow) {
  const markers: {
    position: [number, number];
    icon?: "pickup" | "dropoff";
    popup?: string;
  }[] = [];

  if (ride.FromLat != null && ride.FromLng != null) {
    markers.push({
      position: [ride.FromLat, ride.FromLng],
      icon: "pickup",
      popup: `Pickup: ${ride.FromName ?? "Unknown"}`,
    });
  }

  if (ride.ToLat != null && ride.ToLng != null) {
    markers.push({
      position: [ride.ToLat, ride.ToLng],
      icon: "dropoff",
      popup: `Dropoff: ${ride.ToName ?? "Unknown"}`,
    });
  }

  return markers;
}

function getRidePolyline(
  ride: DriverRideRow
): [number, number][] | undefined {
  if (
    ride.FromLat != null &&
    ride.FromLng != null &&
    ride.ToLat != null &&
    ride.ToLng != null
  ) {
    return [
      [ride.FromLat, ride.FromLng],
      [ride.ToLat, ride.ToLng],
    ];
  }
  return undefined;
}

function getRideMapCenter(ride: DriverRideRow): [number, number] {
  if (
    ride.FromLat != null &&
    ride.FromLng != null &&
    ride.ToLat != null &&
    ride.ToLng != null
  ) {
    return [
      (ride.FromLat + ride.ToLat) / 2,
      (ride.FromLng + ride.ToLng) / 2,
    ];
  }

  if (ride.FromLat != null && ride.FromLng != null) {
    return [ride.FromLat, ride.FromLng];
  }

  if (ride.ToLat != null && ride.ToLng != null) {
    return [ride.ToLat, ride.ToLng];
  }

  return DEFAULT_MAP_CENTER;
}

function getRideMinutesToPickup(ride: DriverRideRow): number | null {
  if (!ride.ScheduledStart) return null;
  const start = new Date(ride.ScheduledStart);
  const diffMs = start.getTime() - Date.now();
  return Math.round(diffMs / 60000);
}

// --------------- component ----------------

export function DriverScheduleSection() {
  const [rides, setRides] = useState<DriverRideRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionRideId, setActionRideId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ActiveChatState | null>(null);
  const [mapRide, setMapRide] = useState<DriverRideRow | null>(null);

  async function loadRides() {
    setLoading(true);
    setError(null);
    try {
      const res = await getDriverUpcomingRides();
      if (!res.success) {
        setError(
          "error" in res && typeof res.error === "string"
            ? res.error
            : "Failed to load rides."
        );
        setRides([]);
      } else {
        setRides(res.rides ?? []);
      }
    } catch (err: any) {
      console.error("Error loading driver rides:", err);
      setError(err?.message || "Failed to load rides.");
      setRides([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRides();
  }, []);

  async function handleStart(rideId: number) {
    setActionRideId(rideId);
    try {
      const res = await startDriverRide(rideId);
      if (!res.success) {
        toast.error(
          "error" in res && typeof res.error === "string"
            ? res.error
            : "Failed to start ride."
        );
        return;
      }

      setRides((prev) =>
        prev.map((r) =>
          r.RideId === rideId ? { ...r, Status: "InProgress" } : r
        )
      );
      toast.success("Ride started.");
    } catch (err: any) {
      console.error("Error starting ride:", err);
      toast.error(err?.message || "Failed to start ride.");
    } finally {
      setActionRideId(null);
    }
  }

  async function handleEnd(rideId: number) {
    setActionRideId(rideId);
    try {
      const res = await endDriverRide(rideId, "Cash");
      if (!res.success) {
        toast.error(
          "error" in res && typeof res.error === "string"
            ? res.error
            : "Failed to end ride."
        );
        return;
      }

      setRides((prev) =>
        prev.map((r) =>
          r.RideId === rideId ? { ...r, Status: "Completed" } : r
        )
      );
      toast.success("Ride completed.");
    } catch (err: any) {
      console.error("Error ending ride:", err);
      toast.error(err?.message || "Failed to end ride.");
    } finally {
      setActionRideId(null);
    }
  }

  const hasRides = rides.length > 0;

  return (
    <>
      <Card className="border border-neutral-800 bg-neutral-900/80 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-50">
              Upcoming rides
            </h2>
            <p className="mt-1 text-xs text-neutral-400">
              Confirmed legs assigned to you. Start and end them when appropriate.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full bg-neutral-50 px-4 py-1.5 text-xs font-medium text-neutral-900 shadow-sm hover:bg-neutral-200 disabled:opacity-60 disabled:hover:bg-neutral-50"
            onClick={loadRides}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Refreshing
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        {!hasRides && !loading && (
          <p className="text-sm text-neutral-400">
            You have no scheduled or in-progress rides right now.
          </p>
        )}

        {hasRides && (
          <div className="space-y-3">
            {rides.map((ride) => {
              const isWorking = actionRideId === ride.RideId;

              return (
                <Card
                  key={ride.RideId}
                  className="border border-neutral-800 bg-neutral-900/80 p-4 sm:p-5"
                >
                  {/* Header row: route + status/actions */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: route label */}
                    <div className="flex items-center gap-2 text-sm font-semibold text-neutral-50">
                      <MapPin className="h-4 w-4 text-emerald-400" />
                      <span>{ride.FromName}</span>
                      <ArrowRight className="h-4 w-4 text-neutral-500" />
                      <span>{ride.ToName}</span>
                    </div>

                    {/* Right: status + actions */}
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant="outline"
                        className="border-neutral-700 bg-neutral-900/70 text-[11px] font-normal text-neutral-200"
                      >
                        {ride.Status}
                      </Badge>

                      {/* Buttons row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Open big map dialog */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full border-neutral-700 bg-neutral-950 px-3 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
                          onClick={() => setMapRide(ride)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          View map
                        </Button>

                        {(ride.Status === "Scheduled" ||
                          ride.Status === "InProgress") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-emerald-500 bg-neutral-950 px-4 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10"
                            onClick={() =>
                              setActiveChat({
                                rideId: ride.RideId,
                              })
                            }
                          >
                            <MessageCircle className="mr-1 h-3 w-3" />
                            Messages
                          </Button>
                        )}

                        {ride.Status === "Scheduled" && (
                          <Button
                            size="sm"
                            className="rounded-full bg-emerald-500 px-5 text-xs font-semibold text-neutral-950 hover:bg-emerald-400"
                            onClick={() => handleStart(ride.RideId)}
                            disabled={isWorking}
                          >
                            {isWorking ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Starting…
                              </>
                            ) : (
                              "Start ride"
                            )}
                          </Button>
                        )}

                        {ride.Status === "InProgress" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-red-500/60 px-5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                            onClick={() => handleEnd(ride.RideId)}
                            disabled={isWorking}
                          >
                            {isWorking ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Ending…
                              </>
                            ) : (
                              "End ride"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inline basic details (no map here) */}
                  <div className="mt-3 flex flex-col gap-1 text-xs text-neutral-300">
                    <div className="flex flex-wrap gap-3 text-neutral-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ride.ScheduledStart
                          ? new Date(ride.ScheduledStart).toLocaleString()
                          : "—"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {ride.NumOfPeople} passenger
                        {ride.NumOfPeople !== 1 && "s"}
                      </span>
                    </div>

                    {(() => {
                      const minutes = getRideMinutesToPickup(ride);
                      if (minutes == null) return null;
                      return (
                        <div className="text-[11px] text-emerald-400">
                          {minutes <= 0
                            ? "Pickup time is starting"
                            : `Pickup in ${minutes} min`}
                        </div>
                      );
                    })()}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* Big map dialog */}
      <Dialog
        open={!!mapRide}
        onOpenChange={(open) => {
          if (!open) setMapRide(null);
        }}
      >
        <DialogContent className="w-[95vw] max-w-6xl h-[85vh] border-neutral-800 bg-neutral-950 text-neutral-50">
          {mapRide && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">
                  Route overview
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-400">
                  {mapRide.FromName} → {mapRide.ToName}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid h-[calc(85vh-5rem)] gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                {/* BIG MAP */}
                <div className="h-full min-h-[24rem] rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                  <MapView
                    center={getRideMapCenter(mapRide)}
                    markers={getRideMarkers(mapRide)}
                    polyline={getRidePolyline(mapRide)}
                    className="h-full w-full"
                  />
                </div>

                {/* Extra details */}
                <div className="flex flex-col gap-3 overflow-y-auto text-xs text-neutral-200">
                  <div>
                    <p className="text-neutral-400">Pickup</p>
                    <p className="font-medium">{mapRide.FromName}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Dropoff</p>
                    <p className="font-medium">{mapRide.ToName}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Scheduled time</p>
                    <p>
                      {mapRide.ScheduledStart
                        ? new Date(
                            mapRide.ScheduledStart
                          ).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Passengers</p>
                    <p>
                      {mapRide.NumOfPeople} passenger
                      {mapRide.NumOfPeople !== 1 && "s"}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Pickup countdown</p>
                    <p>
                      {(() => {
                        const minutes = getRideMinutesToPickup(mapRide);
                        if (minutes == null) return "Unknown";
                        return minutes <= 0
                          ? "Pickup time is starting"
                          : `Pickup in ${minutes} min`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating in-app chat (driver view) */}
      {activeChat && (
        <RideChatWindow
          mode="driver"
          rideId={activeChat.rideId}
          peerName="Passenger"
          onClose={() => setActiveChat(null)}
        />
      )}
    </>
  );
}
