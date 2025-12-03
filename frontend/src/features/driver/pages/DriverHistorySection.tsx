// src/features/driver/pages/DriverHistorySection.tsx
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { toast } from "sonner";
import {
  getDriverRideHistory,
  type DriverHistoryRow,
} from "@/features/driver/api";
import {
  MapPin,
  Clock,
  Users,
  ArrowRight,
  CreditCard,
  Loader2,
  History,
} from "lucide-react";

type ActiveRideDetails = DriverHistoryRow | null;

const PAGE_SIZE = 5;

export function DriverHistorySection() {
  const [rides, setRides] = useState<DriverHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsRide, setDetailsRide] = useState<ActiveRideDetails>(null);
  const [page, setPage] = useState(1);

  const hasHistory = rides.length > 0;

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const res = await getDriverRideHistory();
      if (!res.success) {
        setError(
          "error" in res && typeof res.error === "string"
            ? res.error
            : "Failed to load ride history."
        );
        setRides([]);
        setPage(1);
        return;
      }

      setRides(res.rides ?? []);
      setPage(1); // reset to first page on refresh/load
    } catch (err: any) {
      console.error("Error loading driver history:", err);
      setError(err?.message || "Failed to load ride history.");
      setRides([]);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const totalRides = rides.length;
  const totalPages = totalRides === 0 ? 1 : Math.ceil(totalRides / PAGE_SIZE);
  const clampedPage = Math.min(page, totalPages);
  const startIndex = (clampedPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRides);
  const paginatedRides = rides.slice(startIndex, endIndex);

  function formatDateTime(value: string | null | undefined) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  }

  function formatMoney(value: number | null | undefined) {
    if (value == null) return "—";
    return `€${value.toFixed(2)}`;
  }

  return (
    <>
      <Card className="border border-gray-200 bg-white p-4 sm:p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
              <History className="h-4 w-4 text-black" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Ride history
              </h2>
              <p className="text-xs text-gray-600">
                Completed and cancelled rides, with timing and transaction
                details.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            className="rounded-xl bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200 text-xs"
            onClick={loadHistory}
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

        {/* Errors */}
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

        {/* Empty state */}
        {!hasHistory && !loading && !error && (
          <p className="text-sm text-gray-600">
            You don&apos;t have any past rides yet.
          </p>
        )}

        {/* Ride list */}
        {hasHistory && (
          <>
            <div className="space-y-3">
              {paginatedRides.map((ride) => {
                const isCancelled = ride.Status === "Cancelled";

                return (
                  <Card
                    key={ride.RideId}
                    className="border border-gray-200 bg-white p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Left: route & meta */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <MapPin className="h-4 w-4 text-black" />
                          <span>{ride.FromName}</span>
                          <ArrowRight className="h-4 w-4 text-gray-500" />
                          <span>{ride.ToName}</span>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(ride.EndedAt ?? ride.StartedAt)}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {ride.NumOfPeople ?? "—"} passenger
                            {ride.NumOfPeople && ride.NumOfPeople !== 1 && "s"}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {ride.PaymentMethod ?? "—"}
                          </span>
                        </div>
                      </div>

                      {/* Right: status + “View details” */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`border-gray-300 bg-gray-100/70 text-[11px] font-normal ${
                              isCancelled
                                ? "text-red-300"
                                : "text-gray-800"
                            }`}
                          >
                            {ride.Status}
                          </Badge>
                        </div>

                        {/* Instead of showing price, show a details button */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full border-black/70 text-xs font-semibold text-black hover:bg-black/10"
                          onClick={() => setDetailsRide(ride)}
                        >
                          View details
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination controls (same style as DriverOffersSection) */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                <span>
                  Showing{" "}
                  <span className="text-gray-900">
                    {startIndex + 1}–{endIndex}
                  </span>{" "}
                  of{" "}
                  <span className="text-gray-900">
                    {totalRides}
                  </span>{" "}
                  rides
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-300 bg-gray-100 text-[11px] font-medium text-gray-800 hover:bg-gray-200"
                    disabled={clampedPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-[11px] text-gray-600">
                    Page{" "}
                    <span className="text-gray-900">
                      {clampedPage}
                    </span>{" "}
                    of{" "}
                    <span className="text-gray-900">
                      {totalPages}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-300 bg-gray-100 text-[11px] font-medium text-gray-800 hover:bg-gray-200"
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

      {/* Transaction details dialog */}
      <Dialog
        open={detailsRide != null}
        onOpenChange={(open) => !open && setDetailsRide(null)}
      >
        <DialogContent className="max-w-md border border-gray-200 bg-gray-900 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Ride transaction details
            </DialogTitle>
          </DialogHeader>

          {detailsRide && (
            <div className="mt-3 space-y-4 text-sm">
              {/* Route */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Route
                </p>
                <div className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-900">
                  <MapPin className="h-4 w-4 text-black" />
                  <span>{detailsRide.FromName}</span>
                  <ArrowRight className="h-4 w-4 text-gray-500" />
                  <span>{detailsRide.ToName}</span>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {formatDateTime(detailsRide.EndedAt ?? detailsRide.StartedAt)}
                </p>
              </div>

              {/* Payment summary */}
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Payment
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 text-gray-700">
                    <CreditCard className="h-3 w-3" />
                    Method
                  </span>
                  <span className="font-medium text-gray-900">
                    {detailsRide.PaymentMethod ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Status</span>
                  <span>{detailsRide.PaymentStatus ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Paid at</span>
                  <span>{formatDateTime(detailsRide.PaymentPaidAt)}</span>
                </div>
              </div>

              {/* Money breakdown */}
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Fare breakdown
                </p>

                <div className="flex items-center justify-between text-xs text-gray-700">
                  <span>Passenger total</span>
                  <span className="font-medium">
                    {formatMoney(
                      detailsRide.PaymentGrossAmount ?? detailsRide.PriceFinal
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-700">
                  <span>OSRH platform fee</span>
                  <span className="font-medium">
                    {formatMoney(detailsRide.PaymentOsrhFee)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-black">
                  <span>Your income</span>
                  <span className="font-semibold">
                    {formatMoney(detailsRide.PaymentDriverPayout)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
