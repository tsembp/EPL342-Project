// src/features/passenger/pages/RideHistory.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        return "border-gray-200 bg-gray-50 text-gray-900";
      case "Pending":
        return "border-amber-200 bg-amber-50 text-amber-700";
      case "Accepted":
      case "RidesCreated":
        return "border-blue-200 bg-blue-50 text-blue-700";
      case "Cancelled":
      case "Failed":
        return "border-red-200 bg-red-50 text-red-700";
      default:
        return "border-gray-200 bg-gray-50 text-gray-700";
    }
  }

  return (
    <div className="flex h-full flex-col bg-white text-gray-900">
      {/* Page Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Rides</h1>
        <p className="text-sm text-gray-600">
          View your previous ride requests and trips.
        </p>
      </div>

      {/* Filter bar */}
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-900">
              Filter by status:
            </label>
            <div className="relative w-56">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-200 bg-white pl-4 pr-10 py-2 text-sm text-gray-900 appearance-none outline-none focus:border-black focus:ring-1 focus:ring-black"
              >
                <option value="ALL">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="RidesCreated">Rides created</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Failed">Failed</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 8L10 12L14 8"
                    stroke="#000"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 pb-8">
            {loading && (
              <div className="flex items-center justify-center py-16 text-sm text-gray-600">
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
                      className="border border-gray-200 bg-gray-100/80 p-4 sm:p-5 transition-colors hover:border-black/70"
                    >
                      {/* Top row: route + status */}
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-lg font-semibold text-gray-900">
                              {(item.FromName || "Unknown") +
                                " \u2192 " +
                                (item.ToName || "Unknown")}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1 text-base text-gray-600">
                              <MapPin className="h-4 w-4 text-black" />
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
                      <div className="mt-2 flex flex-col gap-2 text-base text-gray-700">
                        {hasRides ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-600" />
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
                            <div className="text-gray-600">
                              Total distance:{" "}
                              <span className="text-gray-900">
                                {item.TotalDistanceKm ?? 0} km
                              </span>{" "}
                              · Total duration:{" "}
                              <span className="text-gray-900">
                                {item.TotalDurationMinutes ?? 0} min
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-4 w-4 text-gray-600" />
                            <span>No rides started yet.</span>
                          </div>
                        )}
                      </div>

                      {/* Actions and Price */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-lg font-semibold text-black">
                          €{formatMoney(item.TotalPrice)}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-300 bg-gray-100 text-base font-medium text-gray-800 hover:bg-gray-200"
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
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                    <span>
                      Showing{" "}
                      <span className="text-gray-900">
                        {startIndex}–{endIndex}
                      </span>{" "}
                      of{" "}
                      <span className="text-gray-900">
                        {totalCount}
                      </span>{" "}
                      trips
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-300 bg-gray-100 text-[11px] font-medium text-gray-800 hover:bg-gray-200"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <span className="text-[11px] text-gray-600">
                        Page{" "}
                        <span className="text-gray-900">{page}</span> of{" "}
                        <span className="text-gray-900">
                          {totalPages}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-300 bg-gray-100 text-[11px] font-medium text-gray-800 hover:bg-gray-200"
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
      </div>
  );
}
