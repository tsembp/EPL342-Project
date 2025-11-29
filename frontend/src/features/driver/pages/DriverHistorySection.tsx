// src/features/driver/pages/DriverHistorySection.tsx
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

export function DriverHistorySection() {
  const [rides, setRides] = useState<DriverHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function formatPrice(value: number | null | undefined) {
    if (value == null) return "—";
    return `€${value.toFixed(2)}`;
  }

  return (
    <Card className="border border-neutral-800 bg-neutral-900/80 p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900">
            <History className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-50">Ride history</h2>
            <p className="text-xs text-neutral-400">
              Completed and cancelled rides, with times and fares.
            </p>
          </div>
        </div>

        {/* DARK Refresh button */}
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
            const isCompleted = ride.Status === "Completed";
            const isCancelled = ride.Status === "Cancelled";

            return (
              <Card
                key={ride.RideId}
                className="border border-neutral-800 bg-neutral-900/80 p-4 sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: route & details */}
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

                  {/* Right: status + price */}
                  <div className="flex flex-col items-end gap-2">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-neutral-700 bg-neutral-900/70 text-[11px] font-normal text-neutral-200"
                      >
                        {ride.Status}
                      </Badge>

                      {/* Only show payment badge if it is NOT "Completed" */}
                      {ride.PaymentStatus &&
                        ride.PaymentStatus !== "Completed" && (
                          <Badge
                            variant="outline"
                            className="border-neutral-700 bg-neutral-900/70 text-[11px] font-normal text-neutral-200"
                          >
                            {ride.PaymentStatus}
                          </Badge>
                        )}
                    </div>

                    <p className="text-sm font-semibold text-neutral-50">
                      {formatPrice(ride.PriceFinal)}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
