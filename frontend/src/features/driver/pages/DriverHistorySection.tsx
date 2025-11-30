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

export function DriverHistorySection() {
  const [rides, setRides] = useState<DriverHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsRide, setDetailsRide] = useState<ActiveRideDetails>(null);

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
        return;
      }

      setRides(res.rides ?? []);
    } catch (err: any) {
      console.error("Error loading driver history:", err);
      setError(err?.message || "Failed to load ride history.");
      setRides([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

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
      <Card className="border border-neutral-800 bg-neutral-900/80 p-4 sm:p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900">
              <History className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-50">
                Ride history
              </h2>
              <p className="text-xs text-neutral-400">
                Completed and cancelled rides, with timing and transaction
                details.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            className="rounded-xl bg-neutral-900 text-neutral-200 border border-neutral-800 hover:bg-neutral-800 text-xs"
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
          <p className="text-sm text-neutral-400">
            You don&apos;t have any past rides yet.
          </p>
        )}

        {/* Ride list */}
        {hasHistory && (
          <div className="space-y-3">
            {rides.map((ride) => {
              const isCancelled = ride.Status === "Cancelled";

              return (
                <Card
                  key={ride.RideId}
                  className="border border-neutral-800 bg-neutral-900/80 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: route & meta */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-50">
                        <MapPin className="h-4 w-4 text-emerald-400" />
                        <span>{ride.FromName}</span>
                        <ArrowRight className="h-4 w-4 text-neutral-500" />
                        <span>{ride.ToName}</span>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs text-neutral-400">
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
                          className={`border-neutral-700 bg-neutral-900/70 text-[11px] font-normal ${
                            isCancelled
                              ? "text-red-300"
                              : "text-neutral-200"
                          }`}
                        >
                          {ride.Status}
                        </Badge>
                      </div>

                      {/* Instead of showing price, show a details button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-emerald-500/70 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10"
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
        )}
      </Card>

      {/* Transaction details dialog */}
      <Dialog
        open={detailsRide != null}
        onOpenChange={(open) => !open && setDetailsRide(null)}
      >
        <DialogContent className="max-w-md border border-neutral-800 bg-neutral-950 text-neutral-50">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Ride transaction details
            </DialogTitle>
          </DialogHeader>

          {detailsRide && (
            <div className="mt-3 space-y-4 text-sm">
              {/* Route */}
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Route
                </p>
                <div className="mt-1 flex items-center gap-2 text-sm font-medium text-neutral-100">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  <span>{detailsRide.FromName}</span>
                  <ArrowRight className="h-4 w-4 text-neutral-500" />
                  <span>{detailsRide.ToName}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-400">
                  {formatDateTime(detailsRide.EndedAt ?? detailsRide.StartedAt)}
                </p>
              </div>

              {/* Payment summary */}
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Payment
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 text-neutral-300">
                    <CreditCard className="h-3 w-3" />
                    Method
                  </span>
                  <span className="font-medium text-neutral-100">
                    {detailsRide.PaymentMethod ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>Status</span>
                  <span>{detailsRide.PaymentStatus ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>Paid at</span>
                  <span>{formatDateTime(detailsRide.PaymentPaidAt)}</span>
                </div>
              </div>

              {/* Money breakdown */}
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Fare breakdown
                </p>

                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>Passenger total</span>
                  <span className="font-medium">
                    {formatMoney(
                      detailsRide.PaymentGrossAmount ?? detailsRide.PriceFinal
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>OSRH platform fee</span>
                  <span className="font-medium">
                    {formatMoney(detailsRide.PaymentOsrhFee)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-emerald-300">
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
