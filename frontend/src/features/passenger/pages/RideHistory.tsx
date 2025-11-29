// src/features/passenger/pages/RideHistory.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { Car, Clock, MapPin, Loader2, ArrowRight } from "lucide-react";

const PAGE_SIZE = 6;

type RideHistoryRow = {
  RequestId: number;
  RequestStatus: string;
  PickupAt: string;

  FromName?: string | null;
  ToName?: string | null;

  // aggregated trip data (may be null / undefined)
  TotalRides?: number | null;
  FirstRideStartedAt?: string | null;
  LastRideEndedAt?: string | null;
  TotalDistanceKm?: number | string | null;
  TotalDurationMinutes?: number | string | null;
  TotalPrice?: number | string | null;
};

export default function RideHistory() {
  const navigate = useNavigate();

  const [history, setHistory] = useState<RideHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // ✅ true server-side pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("page_size", PAGE_SIZE.toString());

        if (statusFilter !== "ALL") {
          params.set("status", statusFilter);
        }

        const res = await fetch(`/api/passenger/ride-history?${params.toString()}`);
        const data = await res.json();

        if (!data.success) {
          setError(
            typeof data.error === "string"
              ? data.error
              : "Failed to load ride history."
          );
          setHistory([]);
          setTotalPages(1);
          setTotalCount(0);
        } else {
          setHistory((data.history ?? []) as RideHistoryRow[]);
          setTotalPages(data.total_pages || 1);
          setTotalCount(data.total_count || 0);
        }
      } catch (err: any) {
        console.error("Error loading ride history:", err);
        setError(err.message || "Failed to load ride history.");
        setHistory([]);
        setTotalPages(1);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [statusFilter, page]);

  const hasItems = totalCount > 0;
  const startIndex = hasItems ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endIndex = hasItems ? (page - 1) * PAGE_SIZE + history.length : 0;

  function formatMoney(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return "0.00";
    const num = Number(value);
    if (Number.isNaN(num)) return "0.00";
    return num.toFixed(2);
  }

  function statusClasses(status: string) {
    switch (status) {
      case "Completed":
        return "border-emerald-500/70 text-emerald-400";
      case "Pending":
        return "border-amber-400/70 text-amber-300";
      case "Accepted":
      case "RidesCreated":
        return "border-sky-500/70 text-sky-300";
      case "Cancelled":
      case "Failed":
        return "border-red-500/70 text-red-300";
      default:
        return "border-neutral-700 text-neutral-300";
    }
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-50">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-neutral-900 bg-neutral-950 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight">
              Ride history
            </span>
          </div>
        </header>

        {/* Filter bar */}
        <section className="border-b border-neutral-900 bg-neutral-950">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
            <div className="flex flex-col">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Filter
              </label>
              <span className="text-xs text-neutral-400">
                View your previous ride requests and trips.
              </span>
            </div>
            <div className="relative mt-2 w-56">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1); // ✅ reset page when filter changes
                }}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-4 pr-10 py-2 text-sm text-neutral-50 appearance-none outline-none"
              >
                <option value="ALL">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="RidesCreated">Rides created</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Failed">Failed</option>
              </select>
              {/* Down arrow */}
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-emerald-500"
                >
                  <path
                    d="M6 8L10 12L14 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>
        </section>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 pb-24">
            {loading && (
              <div className="flex items-center justify-center py-16 text-sm text-neutral-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading ride history…
              </div>
            )}

            {!loading && error && (
              <Card className="border border-red-700/60 bg-red-950/40 px-4 py-3 text-xs text-red-200">
                {error}
              </Card>
            )}

            {!loading && !error && totalCount === 0 && (
              <EmptyState
                icon={Car}
                title="No rides yet"
                description="Your previous ride requests and trips will appear here once you start riding."
                action={
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/744/744465.png"
                    alt="Car"
                    className="mx-auto mt-4 h-24 w-24 opacity-80"
                    style={{ background: "transparent" }}
                  />
                }
              />
            )}

            {!loading && !error && totalCount > 0 && (
              <>
                {history.map((item) => {
                  const hasRides =
                    (item.TotalRides ?? 0) > 0 &&
                    item.FirstRideStartedAt &&
                    item.LastRideEndedAt;

                  return (
                    <Card
                      key={item.RequestId}
                      className="border border-neutral-800 bg-neutral-900/80 p-4 sm:p-5 transition-colors hover:border-emerald-500/70"
                    >
                      {/* Top row: route + status */}
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-lg font-semibold text-neutral-50">
                              {(item.FromName || "Unknown") +
                                " \u2192 " +
                                (item.ToName || "Unknown")}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1 text-base text-neutral-400">
                              <MapPin className="h-4 w-4 text-emerald-400" />
                              <span>Pickup:</span>
                              <span>
                                {new Date(item.PickupAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant="outline"
                            className={`border px-2 py-0.5 text-base ${statusClasses(
                              item.RequestStatus
                            )}`}
                          >
                            {item.RequestStatus}
                          </Badge>
                        </div>
                      </div>

                      {/* Middle row: summary */}
                      <div className="mt-2 flex flex-col gap-2 text-base text-neutral-300">
                        {hasRides ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-neutral-400" />
                              <span>
                                {item.TotalRides} ride
                                {item.TotalRides && item.TotalRides > 1
                                  ? "s"
                                  : ""}{" "}
                                ·{" "}
                                {new Date(
                                  item.FirstRideStartedAt as string
                                ).toLocaleString()}{" "}
                                –{" "}
                                {new Date(
                                  item.LastRideEndedAt as string
                                ).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-neutral-400">
                              Total distance:{" "}
                              <span className="text-neutral-100">
                                {item.TotalDistanceKm ?? 0} km
                              </span>{" "}
                              · Total duration:{" "}
                              <span className="text-neutral-100">
                                {item.TotalDurationMinutes ?? 0} min
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-neutral-400">
                            <Clock className="h-4 w-4 text-neutral-400" />
                            <span>No rides started yet.</span>
                          </div>
                        )}
                      </div>

                      {/* Actions and Price */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-lg font-semibold text-emerald-400">
                          €{formatMoney(item.TotalPrice)}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-neutral-700 bg-neutral-900 text-base font-medium text-neutral-200 hover:bg-neutral-800"
                          onClick={() =>
                            navigate(
                              `/passenger/rides/${item.RequestId}/details`
                            )
                          }
                        >
                          View details
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}

                {totalPages > 1 && (
                  <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                    <span>
                      Showing{" "}
                      <span className="text-neutral-100">
                        {startIndex}–{endIndex}
                      </span>{" "}
                      of{" "}
                      <span className="text-neutral-100">
                        {totalCount}
                      </span>{" "}
                      trips
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-neutral-700 bg-neutral-900 text-[11px] font-medium text-neutral-200 hover:bg-neutral-800"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <span className="text-[11px] text-neutral-400">
                        Page{" "}
                        <span className="text-neutral-100">{page}</span> of{" "}
                        <span className="text-neutral-100">
                          {totalPages}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-neutral-700 bg-neutral-900 text-[11px] font-medium text-neutral-200 hover:bg-neutral-800"
                        disabled={page >= totalPages}
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
          </div>
        </main>

        <BottomNav />
      </div>
    </>
  );
}
