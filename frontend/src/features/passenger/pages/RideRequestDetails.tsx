import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { MapView } from "@/components/MapView";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";
import { toast } from "sonner";
import RideChatWindow from "@/features/passenger/components/FloatingChatWindow";
import { getRideRequestDetails, type RideRequestDetails, submitRideRating, getRideLiveLocation, cancelRideRequest } from "@/features/passenger/api";
import { 
  Clock,
  MapPin,
  Navigation2,
  Loader2,
  Car,
  User2,
  MessageCircle,
  Star,
  CarTaxiFront
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";



export default function RideRequestDetailsPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<RideRequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRideId, setReviewRideId] = useState<number | null>(null);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [activeChat, setActiveChat] = useState<{
    rideId: number;
    driverName: string;
  } | null>(null);


  async function loadDetails(isRefresh = false) {
    if (!requestId) return;
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);

    try {
      const idNum = Number(requestId);
      if (!Number.isFinite(idNum)) {
        throw new Error("Invalid request id");
      }

      const res = await getRideRequestDetails(idNum);
      if (!res.success || !res.request) {
        throw new Error(res.error || "Failed to load ride request.");
      }
      setData(res.request);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load ride request.");
      toast.error(err.message || "Failed to load ride request.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDetails(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const statusColor = (status: string) => {
    switch (status) {
      case "SearchingDrivers":
      case "Pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/60";
      case "Accepted":
        return "border-sky-500/70 text-sky-300";
      case "Completed":
      case "Matched":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/60";
      case "Cancelled":
        return "bg-red-500/10 text-red-400 border-red-500/60";
      default:
        return "bg-neutral-700/30 text-neutral-300 border-neutral-600";
    }
  };

  const hasRides = !!(data?.rides && data.rides.length > 0);

  // Rides we care about for live tracking
  const activeRides = useMemo(
    () =>
      data?.rides?.filter(
        (r) => r.status === "Scheduled" || r.status === "InProgress"
      ) ?? [],
    [data]
  );

  // One query per active ride → live location
  const liveQueries = useQueries({
    queries: activeRides.map((ride) => ({
      queryKey: ["ride-live-location", ride.rideId],
      queryFn: () => getRideLiveLocation(ride.rideId),
      enabled: activeRides.length > 0,
    })),
  });

  // Map rideId -> liveLocation result
  const liveLocationByRideId = useMemo(() => {
    const map: Record<number, any> = {};

    activeRides.forEach((ride, idx) => {
      const q = liveQueries[idx];
      if (q && q.data && q.data.success) {
        map[ride.rideId] = q.data;
      }
    });

    return map;
  }, [activeRides, liveQueries]);

  const allRidesCompleted =
    hasRides && data!.rides!.every((r) => r.status === "Completed");
  const requestCompleted =
    data?.status === "Completed" || data?.progressStatus === "Completed";
  const canProceedToPayment = requestCompleted && allRidesCompleted;

  const formattedPickupTime =
    data?.pickupAt ? new Date(data.pickupAt).toLocaleString() : "—";

  const hasPickupCoords =
    data &&
    typeof (data as any).pickup?.latitude === "number" &&
    typeof (data as any).pickup?.longitude === "number";

  const hasDropoffCoords =
    data &&
    typeof (data as any).dropoff?.latitude === "number" &&
    typeof (data as any).dropoff?.longitude === "number";

  const handleGoToPayment = () => {
    if (!data) return;
    navigate(`/passenger/checkout?requestId=${data.requestId}`);
  };

  const mapCenter: [number, number] = useMemo(() => {
    if (hasPickupCoords && data) {
      return [
        (data as any).pickup.latitude as number,
        (data as any).pickup.longitude as number,
      ];
    }

    return DEFAULT_MAP_CENTER as [number, number];
  }, [hasPickupCoords, data]);

  const markers = useMemo(() => {
    const m: {
      position: [number, number];
      icon?: "default" | "pickup" | "dropoff" | "station" | "vehicle" | "taxi";
      popup?: string;
      onClick?: () => void;
    }[] = [];

    if (hasPickupCoords && data) {
      const { pickup } = data as any;
      m.push({
        position: [pickup.latitude as number, pickup.longitude as number],
        icon: "pickup",
        popup: `Pickup: ${pickup.name} (Zone ${pickup.zoneId})`,
      });
    }

    if (hasDropoffCoords && data) {
      const { dropoff } = data as any;
      m.push({
        position: [dropoff.latitude as number, dropoff.longitude as number],
        icon: "dropoff",
        popup: `Dropoff: ${dropoff.name} (Zone ${dropoff.zoneId})`,
      });
    }

    if (data?.rides) {
      for (const ride of data.rides) {
        const live = liveLocationByRideId[ride.rideId];
        if (
          live &&
          live.success &&
          live.hasLocation &&
          typeof live.lat === "number" &&
          typeof live.lng === "number"
        ) {
          m.push({
            position: [live.lat, live.lng],
            icon: "taxi",
            popup: `Driver for leg ${ride.legIndex}: ${ride.driverName}`,
          });
        }
      }
    }

    return m;
  }, [hasPickupCoords, hasDropoffCoords, data, liveLocationByRideId]);

  const polyline: [number, number][] = useMemo(() => {
    if (hasPickupCoords && hasDropoffCoords && data) {
      const { pickup, dropoff } = data as any;
      return [
        [pickup.latitude as number, pickup.longitude as number],
        [dropoff.latitude as number, dropoff.longitude as number],
      ];
    }
    return [];
  }, [hasPickupCoords, hasDropoffCoords, data]);

  const [cancelling, setCancelling] = useState(false);

  const handleCancelRequest = async () => {
    if (!data) return;

    if (data.status !== "Pending") {
      toast.error("You can only cancel a pending request.");
      return;
    }

    try {
      setCancelling(true);

      const res = await cancelRideRequest(data.requestId);
      if (!res.success) {
        throw new Error(res.error || "Failed to cancel ride request.");
      }

      toast.success("Your ride has been cancelled.");
      await loadDetails(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to cancel ride request.");
    } finally {
      setCancelling(false);
    }
  };


  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-50 overflow-y-auto">
      <header className="flex items-center justify-between border-b border-neutral-900 bg-neutral-950 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight">Ride</span>
        </div>
      </header>

      <main className="flex flex-col flex-1">
        {/* One big card that contains BOTH details + map */}
        {/* <section className="w-full bg-neutral-950 px-4 py-6"> */}
        <section className="w-full bg-neutral-950 px-4 py-6 pb-24">
          <Card className="w-full border border-neutral-800 bg-neutral-900/80 shadow-lg overflow-hidden">
            <div className="flex flex-col lg:flex-row w-full">
              {/* LEFT: details (everything that was inside your Card before) */}
              <div className="w-full lg:w-[420px] border-b lg:border-b-0 lg:border-r border-neutral-800 p-6 space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    Loading ride request…
                  </div>
                ) : error || !data ? (
                  <div className="space-y-3 text-sm">
                    <p className="text-red-400 text-sm">{error || "Not found."}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadDetails(false)}
                      className="border-neutral-700 text-neutral-100"
                    >
                      Try again
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h1 className="text-lg font-semibold text-neutral-50">
                          Ride request #{data.requestId}
                        </h1>
                        <p className="mt-1 text-xs text-neutral-400">
                          {data.numOfPeople}{" "}
                          {data.numOfPeople === 1 ? "person" : "people"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs border px-2 py-1 ${statusColor(
                          data.status
                        )}`}
                      >
                        {data.status}
                      </Badge>
                    </div>

                    <div className="mt-2 space-y-3 text-sm">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">
                          From
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2">
                          <MapPin className="h-4 w-4 text-emerald-500" />
                          <div className="flex flex-col">
                            <span className="text-sm text-neutral-50">
                              {data.pickup.name}
                            </span>
                            <span className="text-xs text-neutral-500">
                              Zone {data.pickup.zoneId}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">
                          To
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2">
                          <Navigation2 className="h-4 w-4 text-emerald-500" />
                          <div className="flex flex-col">
                            <span className="text-sm text-neutral-50">
                              {data.dropoff.name}
                            </span>
                            <span className="text-xs text-neutral-500">
                              Zone {data.dropoff.zoneId}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">
                          Pickup time
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2">
                          <Clock className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm text-neutral-50">
                            {formattedPickupTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Waiting-for-drivers block */}
                    <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/90 px-4 py-5">
                      {data.progressStatus === "AllAccepted" ||
                      data.progressStatus === "RidesCreated" ||
                      data.progressStatus === "Completed" ? (
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                            <Car className="h-5 w-5 text-emerald-400" />
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-emerald-400">
                              All rides have been accepted!
                            </p>
                            <p className="mt-1 text-xs text-neutral-400">
                              Drivers have accepted your ride. Your trip will begin soon.
                            </p>
                          </div>
                        </div>
                      ) : data.progressStatus === "Failed" ? (
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                            <Car className="h-5 w-5 text-red-400" />
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-400">
                              Ride request has been cancelled.
                            </p>
                            <p className="mt-1 text-xs text-neutral-400">
                              You have cancelled this ride request.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10">
                            <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                              <Car className="h-5 w-5 text-emerald-400" />
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-neutral-50">
                              Waiting for drivers…
                            </p>
                            <p className="mt-1 text-xs text-neutral-400">
                              We’ve sent out offers to nearby drivers. You’ll see your
                              ride here as soon as someone accepts.
                            </p>
                          </div>
                        </div>
                      )}
                        <div className="mt-4 flex items-center justify-between gap-2">
                          {/* Left: Refresh */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadDetails(true)}
                            disabled={
                              refreshing ||
                              requestCompleted ||
                              ["AllAccepted", "RidesCreated", "Completed"].includes(data?.progressStatus) ||
                              ["Accepted", "Cancelled", "Completed"].includes(data?.status)
                            }
                            className="border-neutral-700 text-xs text-neutral-900 bg-neutral-50 hover:bg-emerald-500 hover:text-neutral-50"
                          >
                            {refreshing && (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            )}
                            Refresh status
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelRequest}
                            disabled={
                              cancelling ||
                              ["Cancelled", "Declined", "Accepted"].includes(data.status) ||
                              ["Failed", "Completed", "RidesCreated", "AllAccepted"].includes(data.progressStatus)
                            }
                            className="border-red-500/70 text-xs bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-100"
                          >
                            {cancelling && (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            )}
                            Cancel ride
                          </Button>
                        </div>
                    </div>
                  </>
                )}

                {/* Back button */}
                <div className="mt-4 flex items-center justify-start">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-neutral-700 text-xs text-neutral-900 bg-neutral-50 hover:bg-emerald-500 hover:text-neutral-50"
                    onClick={() => navigate("/passenger/ride")}
                  >
                    &larr; Back
                  </Button>
                </div>
              </div>

                {/* RIGHT: map INSIDE the same Card, full remaining width */}
                <div className="flex-1">
                  <div className="relative h-full min-h-[320px] rounded-none">
                    <MapView
                    center={mapCenter}
                    markers={markers}
                    polyline={polyline}
                    className="rounded-none"
                    />
                  </div>
                </div>
            </div>
          </Card>
          {/* BOTTOM: Rides */}
          <div className="w-full px-4 py-4">
            {/* If accepted → show rides */}
            {(data?.progressStatus === "AllAccepted" || data?.progressStatus === "RidesCreated" || data?.progressStatus === "Completed") &&
              data?.rides && data.rides.length > 0 ? (
              <>
                <h2 className="text-sm font-semibold text-neutral-200 mb-2">
                Your rides
                </h2>

                <div className="flex gap-4 overflow-x-auto pb-4 items-center">
                  {data.rides.map((ride, idx) => (
                    <div key={ride.rideId} className="flex items-center">
                      <div
                        className="min-w-[240px] rounded-xl border border-neutral-800 bg-neutral-900 p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs uppercase text-neutral-400">
                            Leg {ride.legIndex}
                          </span>
                          <Badge className="text-[10px] px-2 py-0.5">
                            {ride.status}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-emerald-500" />
                            <span>{ride.fromName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Navigation2 className="h-4 w-4 text-emerald-500" />
                            <span>{ride.toName}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <User2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-neutral-300">
                              {ride.driverName}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 w-full border-neutral-700 bg-neutral-800 text-neutral-50 hover:bg-neutral-700 hover:text-emerald-400 flex items-center gap-1"
                          onClick={() =>
                          setActiveChat({
                            rideId: ride.rideId,
                            driverName: ride.driverName,
                          })
                          }
                          disabled={data.status === "Completed"}
                          title={
                          data.status === "Completed"
                            ? "Can't chat if ride is completed"
                            : undefined
                          }
                        >
                          <MessageCircle className="h-4 w-4 text-neutral-50" />
                          <span className="text-neutral-50 font-semibold">Chat</span>
                        </Button>
                        { data.status === "Completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-3 w-full border-neutral-200 bg-neutral-50 text-neutral-900 hover:bg-neutral-200 hover:text-neutral-900"
                              onClick={() => {
                                setReviewRideId(ride.rideId);
                                setReviewOpen(true);
                              }}
                            >
                              <Star className="h-4 w-4 mr-2 text-neutral-900" />
                              <span className="text-neutral-900 font-semibold">Leave a review</span>
                            </Button>
                        )}
                      </div>
                      {/* Arrow between legs, except after last leg */}
                      {idx < data.rides.length - 1 && (
                        <div className="flex items-center mx-2">
                          <span className="text-emerald-500 text-2xl select-none">{'→'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
              {/* WAITING PLACEHOLDER */}
              <div className="flex flex-col items-center justify-center py-10 text-neutral-500">
                <Car className="h-10 w-10 text-neutral-700 mb-2" />
                <p className="text-sm">Waiting for drivers to accept your ride...</p>
              </div>
            </>
            )}
          </div>

          {canProceedToPayment && (
            <div className="mt-4 flex justify-end px-4 pb-4">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 group"
                  onClick={handleGoToPayment}
                >
                  Continue to payment
                  <span className="transition-transform duration-200 group-hover:translate-x-1 text-xl">→</span>
                </Button>
            </div>
          )}

        </section>
      </main>
      {activeChat && (
        <RideChatWindow
          rideId={activeChat.rideId}
          driverName={activeChat.driverName}
          onClose={() => setActiveChat(null)}
        />
      )}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="bg-neutral-900 border border-neutral-800 text-neutral-50">
          <DialogHeader>
            <DialogTitle className="text-neutral-50">Leave a review</DialogTitle>
          </DialogHeader>

          {/* ⭐ STAR SELECTOR */}
          <div className="flex gap-2 py-3 justify-center">
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = hoverRating >= star || rating >= star;
              return (
                <Star
                  key={star}
                  className={`h-8 w-8 cursor-pointer transition-colors ${
                    filled ? "text-yellow-400 fill-yellow-400" : "text-neutral-600"
                  }`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                />
              );
            })}
          </div>

          {/* COMMENT FIELD */}
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write your feedback..."
            className="bg-neutral-800 border-neutral-700 text-neutral-50"
          />

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              className="bg-neutral-800 border-neutral-600 text-white hover:bg-neutral-700 hover:text-emerald-400"
              onClick={() => setReviewOpen(false)}
            >
              Cancel
            </Button>

            <Button
              disabled={rating === 0 || submittingReview}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={async () => {
                if (!reviewRideId) {
                  toast.error("Missing ride id for review.");
                  return;
                }

                try {
                  setSubmittingReview(true);
                  const res = await submitRideRating(reviewRideId, {
                    stars: rating,
                    comment: comment.trim() || undefined,
                  });

                  if (!res.success) {
                    throw new Error(res.error || "Failed to submit review.");
                  }

                  toast.success("Review submitted. Thank you!");
                  setReviewOpen(false);
                  setRating(0);
                  setHoverRating(0);
                  setComment("");
                } catch (err: any) {
                  console.error(err);
                  toast.error(err.message || "Failed to submit review.");
                } finally {
                  setSubmittingReview(false);
                }
              }}
            >
              {submittingReview ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
