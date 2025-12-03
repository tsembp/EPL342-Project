// src/features/driver/pages/DriverScheduleSection.tsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [actionRideId, setActionRideId] = useState<number | null>(null);
  const [activeChat, setActiveChat] = useState<ActiveChatState | null>(null);
  const [mapRide, setMapRide] = useState<DriverRideRow | null>(null);

  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["driver", "rides"],
    queryFn: async () => {
      const res = await getDriverUpcomingRides();
      if (!res.success) {
        throw new Error(
          "error" in res && typeof res.error === "string"
            ? res.error
            : "Failed to load rides."
        );
      }
      return res.rides ?? [];
    },
  });

  const rides = data ?? [];
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Failed to load rides."
    : null;

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

      queryClient.invalidateQueries({ queryKey: ["driver", "rides"] });
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

      queryClient.invalidateQueries({ queryKey: ["driver", "rides"] });
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
      <Card className="border border-gray-200 bg-white p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Upcoming rides
            </h2>
            <p className="mt-1 text-xs text-gray-600">
              Confirmed legs assigned to you. Start and end them when appropriate.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["driver", "rides"] })}
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

        {error && <p className="text-xs text-red-600">{error}</p>}

        {!hasRides && !loading && (
          <p className="text-sm text-gray-500">
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
                  className="border border-gray-200 bg-gray-50 p-4 sm:p-5"
                >
                  {/* Header row: route + status/actions */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: route label */}
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <MapPin className="h-4 w-4 text-black" />
                      <span>{ride.FromName}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <span>{ride.ToName}</span>
                    </div>

                    {/* Right: status + actions */}
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant="outline"
                        className="border-gray-300 bg-white text-[11px] font-normal text-gray-700"
                      >
                        {ride.Status}
                      </Badge>

                      {/* Buttons row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Open big map dialog */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100"
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
                            className="rounded-full border-black bg-white px-4 text-xs font-semibold text-gray-900 hover:bg-gray-100"
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
                            className="rounded-full bg-black px-5 text-xs font-semibold text-white hover:bg-gray-800"
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
                            className="rounded-full border-red-300 px-5 text-xs font-semibold text-red-600 hover:bg-red-50"
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
                  <div className="mt-3 flex flex-col gap-1 text-xs text-gray-700">
                    <div className="flex flex-wrap gap-3 text-gray-600">
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
                        <div className="text-[11px] text-black">
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
        <DialogContent className="w-[95vw] max-w-6xl h-[85vh] border-gray-200 bg-white text-gray-900">
          {mapRide && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">
                  Route overview
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-600">
                  {mapRide.FromName} → {mapRide.ToName}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid h-[calc(85vh-5rem)] gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                {/* BIG MAP */}
                <div className="h-full min-h-[24rem] rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                  <MapView
                    center={getRideMapCenter(mapRide)}
                    markers={getRideMarkers(mapRide)}
                    polyline={getRidePolyline(mapRide)}
                    className="h-full w-full"
                  />
                </div>

                {/* Extra details */}
                <div className="flex flex-col gap-3 overflow-y-auto text-xs text-gray-900">
                  <div>
                    <p className="text-gray-600">Pickup</p>
                    <p className="font-medium">{mapRide.FromName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Dropoff</p>
                    <p className="font-medium">{mapRide.ToName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Scheduled time</p>
                    <p>
                      {mapRide.ScheduledStart
                        ? new Date(
                            mapRide.ScheduledStart
                          ).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Passengers</p>
                    <p>
                      {mapRide.NumOfPeople} passenger
                      {mapRide.NumOfPeople !== 1 && "s"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Pickup countdown</p>
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
