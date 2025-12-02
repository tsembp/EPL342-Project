// src/features/driver/pages/DriverOffersSection.tsx
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/MapView";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";

import {
  getDriverOffers,
  type DispatchOfferRow,
  respondToOffer,
} from "@/features/driver/api";
import {
  MapPin,
  Clock,
  Car,
  Loader2,
  Users,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 5;

/** Safely convert a value to a finite number or null */
function toNum(value: any): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function getOfferMarkers(offer: DispatchOfferRow) {
  const markers: {
    position: [number, number];
    icon?: "pickup" | "dropoff";
    popup?: string;
  }[] = [];

  const fromLat = toNum((offer as any).FromLat);
  const fromLng = toNum((offer as any).FromLng);
  const toLat = toNum((offer as any).ToLat);
  const toLng = toNum((offer as any).ToLng);

  if (fromLat !== null && fromLng !== null) {
    markers.push({
      position: [fromLat, fromLng],
      icon: "pickup",
      popup: `Pickup: ${offer.FromPointName ?? "Unknown"}`,
    });
  }

  if (toLat !== null && toLng !== null) {
    markers.push({
      position: [toLat, toLng],
      icon: "dropoff",
      popup: `Dropoff: ${offer.ToPointName ?? "Unknown"}`,
    });
  }

  return markers;
}

function getOfferPolyline(
  offer: DispatchOfferRow
): [number, number][] | undefined {
  const fromLat = toNum((offer as any).FromLat);
  const fromLng = toNum((offer as any).FromLng);
  const toLat = toNum((offer as any).ToLat);
  const toLng = toNum((offer as any).ToLng);

  if (
    fromLat !== null &&
    fromLng !== null &&
    toLat !== null &&
    toLng !== null
  ) {
    return [
      [fromLat, fromLng],
      [toLat, toLng],
    ];
  }
  return undefined;
}

function getOfferMapCenter(offer: DispatchOfferRow): [number, number] {
  const fromLat = toNum((offer as any).FromLat);
  const fromLng = toNum((offer as any).FromLng);
  const toLat = toNum((offer as any).ToLat);
  const toLng = toNum((offer as any).ToLng);

  // Both points → midpoint
  if (
    fromLat !== null &&
    fromLng !== null &&
    toLat !== null &&
    toLng !== null
  ) {
    const midLat = (fromLat + toLat) / 2;
    const midLng = (fromLng + toLng) / 2;
    if (Number.isFinite(midLat) && Number.isFinite(midLng)) {
      return [midLat, midLng];
    }
  }

  // Only pickup
  if (fromLat !== null && fromLng !== null) {
    return [fromLat, fromLng];
  }

  // Only dropoff
  if (toLat !== null && toLng !== null) {
    return [toLat, toLng];
  }

  // No coords at all → default center
  return DEFAULT_MAP_CENTER;
}

function getOfferMinutesToPickup(offer: DispatchOfferRow): number | null {
  // use PickupAt primarily; fall back to ApproxStartTime if needed
  const pickup = offer.PickupAt || (offer as any).ApproxStartTime;
  if (!pickup) return null;

  const start = new Date(pickup);
  const diffMs = start.getTime() - Date.now();
  return Math.round(diffMs / 60000);
}

export function DriverOffersSection() {
  const queryClient = useQueryClient();
  const [offers, setOffers] = useState<DispatchOfferRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionOfferId, setActionOfferId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function loadOffers() {
      setLoading(true);
      setError(null);
      try {
        const res = await getDriverOffers();
        if (!res.success) {
          setError(
            "error" in res && typeof res.error === "string"
              ? res.error
              : "Failed to load offers."
          );
          setOffers([]);
        } else {
          setOffers(res.offers ?? []);
          setPage(1); // reset to first page on new data
        }
      } catch (err: any) {
        console.error("Error loading driver offers:", err);
        setError(err.message || "Failed to load offers.");
        setOffers([]);
      } finally {
        setLoading(false);
      }
    }

    loadOffers();
  }, []);

  async function handleRespond(
    offerId: number,
    action: "accept" | "reject"
  ) {
    setActionOfferId(offerId);
    try {
      const res = await respondToOffer(offerId, action);

      if (!res.success) {
        toast.error(
          "error" in res && typeof (res as any).error === "string"
            ? (res as any).error
            : `Failed to ${action} offer.`
        );
        return;
      }

      const updated = res.offer;
      if (updated) {
        setOffers((prev) =>
          prev.map((o) =>
            o.OfferId === offerId
              ? {
                  ...o,
                  OfferStatus: (updated as any).Status ?? o.OfferStatus,
                  RespondedAt:
                    (updated as any).RespondedAt ?? o.RespondedAt,
                }
              : o
          )
        );
      }

      toast.success(
        action === "accept" ? "Offer accepted." : "Offer rejected."
      );

      // Invalidate rides query so the Rides tab shows the newly created ride
      if (action === "accept") {
        queryClient.invalidateQueries({ queryKey: ["driver", "rides"] });
      }
    } catch (err: any) {
      console.error(`Error trying to ${action} offer:`, err);
      toast.error(
        err.message || `An error occurred while trying to ${action} the offer.`
      );
    } finally {
      setActionOfferId(null);
    }
  }

  const totalOffers = offers.length;
  const totalPages = totalOffers === 0 ? 1 : Math.ceil(totalOffers / PAGE_SIZE);
  const clampedPage = Math.min(page, totalPages);
  const startIndex = (clampedPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalOffers);
  const paginatedOffers = offers.slice(startIndex, endIndex);

  return (
    <Card className="border border-neutral-800 bg-neutral-900/80 p-5 sm:p-6">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900">
            <MapPin className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-50">
              Offers & active rides
            </h2>
            <p className="mt-1 text-xs text-neutral-400">
              Incoming dispatch offers assigned to you appear here.
            </p>
          </div>
        </div>
        <Badge className="hidden border border-neutral-700 bg-neutral-900/80 text-[11px] font-normal text-neutral-300 sm:inline-flex">
          Live dispatch
        </Badge>
      </div>

      {/* Loading / error states */}
      {loading && (
        <div className="flex items-center justify-center py-10 text-sm text-neutral-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading offers…
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 rounded-lg border border-red-700/60 bg-red-950/40 px-3 py-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && totalOffers === 0 && (
        <Card className="mt-4 border border-dashed border-neutral-800 bg-neutral-900/60 p-4">
          <p className="text-xs text-neutral-400">
            You don’t have any offers at the moment. When dispatch sends you a
            ride, it will appear here with full route and timing details.
          </p>
        </Card>
      )}

      {!loading && !error && totalOffers > 0 && (
        <>
          <div className="mt-4 space-y-3 text-sm">
            {paginatedOffers.map((offer) => {
              const isOpen = offer.OfferStatus === "Sent";
              const isActing = actionOfferId === offer.OfferId;

              const markers = getOfferMarkers(offer);
              const polyline = getOfferPolyline(offer);
              const center = getOfferMapCenter(offer);
              const hasValidCenter =
                Number.isFinite(center[0]) && Number.isFinite(center[1]);

              return (
                <Card
                  key={`${offer.OfferId}-${offer.LegId}-${offer.SeqNo}`}
                  className="cursor-pointer border border-neutral-800 bg-neutral-900/80 p-3 transition-colors hover:border-emerald-500/70"
                >
                  {/* card header */}
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-neutral-50">
                        Offer #{offer.OfferId}
                      </span>
                      <Badge
                        variant="outline"
                        className={`border-neutral-700 bg-neutral-900/80 text-[10px] ${
                          isOpen
                            ? "border-emerald-500/60 text-emerald-400"
                            : offer.OfferStatus === "Accepted"
                            ? "border-emerald-500/60 text-emerald-300"
                            : offer.OfferStatus === "Declined"
                            ? "border-red-500/60 text-red-300"
                            : "text-neutral-300"
                        }`}
                      >
                        {offer.OfferStatus}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-neutral-400">
                      {offer.ServiceTypeName || "Service"} ·{" "}
                      {offer.RideTypeName || "Ride type"}
                    </span>
                  </div>

                  {/* route details + mini map */}
                  <div className="mt-2 grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                    {/* LEFT: text details */}
                    <div className="flex flex-col gap-1 text-xs text-neutral-300">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-emerald-400" />
                        <span className="truncate">
                          {offer.FromPointName || "Unknown pickup"}{" "}
                          <ArrowRight className="mx-1 inline h-3 w-3 text-neutral-500" />
                          {offer.ToPointName || "Unknown dropoff"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-neutral-400">
                          <Clock className="h-3 w-3" />
                          <span>
                            Pickup at{" "}
                            {offer.PickupAt
                              ? new Date(
                                  offer.PickupAt
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-neutral-300">
                          <Users className="h-3 w-3" />
                          <span>{offer.NumOfPeople} pax</span>
                        </div>
                      </div>

                      {(() => {
                        const minutes = getOfferMinutesToPickup(offer);
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

                    {/* RIGHT: map (only if we have a valid center) */}
                    {hasValidCenter ? (
                      <div className="h-36 rounded-lg border border-neutral-800 bg-neutral-950/80 overflow-hidden">
                        <MapView
                          center={center}
                          markers={markers}
                          polyline={polyline}
                          className="h-full w-full"
                        />
                      </div>
                    ) : (
                      <div className="flex h-36 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950/40 text-[11px] text-neutral-500">
                        Map not available for this offer
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex justify-end gap-2">
                    {isOpen && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isActing}
                          className="border-neutral-700 bg-neutral-900 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRespond(offer.OfferId, "reject");
                          }}
                        >
                          {isActing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Reject"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          disabled={isActing}
                          className="rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-neutral-950 hover:bg-emerald-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRespond(offer.OfferId, "accept");
                          }}
                        >
                          {isActing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Accept"
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
              <span>
                Showing{" "}
                <span className="text-neutral-100">
                  {startIndex + 1}–{endIndex}
                </span>{" "}
                of{" "}
                <span className="text-neutral-100">
                  {totalOffers}
                </span>{" "}
                offers
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-neutral-700 bg-neutral-900 text-[11px] font-medium text-neutral-200 hover:bg-neutral-800"
                  disabled={clampedPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-[11px] text-neutral-400">
                  Page{" "}
                  <span className="text-neutral-100">
                    {clampedPage}
                  </span>{" "}
                  of{" "}
                  <span className="text-neutral-100">
                    {totalPages}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-neutral-700 bg-neutral-900 text-[11px] font-medium text-neutral-200 hover:bg-neutral-800"
                  disabled={clampedPage >= totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
