import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import {
  getRideRequestDetails,
  type RideRequestDetails,
  payForRideRequest,
  type RidePaymentSummary,
} from "@/features/passenger/api";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Navigation2,
  Car,
  CreditCard,
  Wallet,
} from "lucide-react";

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const requestIdParam = searchParams.get("requestId");
  const requestId = requestIdParam ? Number(requestIdParam) : null;

  const [data, setData] = useState<RideRequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<"CreditCard" | "Cash">(
    "CreditCard",
  );
  const [paying, setPaying] = useState(false);
  const [payments, setPayments] = useState<RidePaymentSummary[] | null>(null);

  // ---- Load ride request details ----
  useEffect(() => {
    async function load() {
      if (!requestId || !Number.isFinite(requestId)) {
        setError("Invalid ride request.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await getRideRequestDetails(requestId);
        if (!res.success || !res.request) {
          throw new Error(res.error || "Failed to load ride request.");
        }
        setData(res.request);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load ride request.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [requestId]);

  const hasRides = !!(data?.rides && data.rides.length > 0);

  const allRidesCompleted =
    hasRides && data!.rides!.every((r) => r.status === "Completed");

  const requestCompleted =
    data?.status === "Completed" || data?.progressStatus === "Completed";

  const canProceedToPayment = requestCompleted && allRidesCompleted;

  const totalGross = useMemo(() => {
    if (!payments || payments.length === 0) return 0;
    return payments.reduce((sum, p) => sum + (p.grossAmount || 0), 0);
  }, [payments]);

  const totalLegs = data?.rides?.length ?? 0;

  const formattedPickupTime = useMemo(() => {
    if (!data?.pickupAt) return "";
    const date = new Date(data.pickupAt);
    return date.toLocaleString(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [data?.pickupAt]);

  const totalPrice = useMemo(() => {
    if (!data?.rides || data.rides.length === 0) return 0;
    return data.rides.reduce((sum, ride: any) => {
        const p = typeof ride.priceFinal === "number" ? ride.priceFinal : 0;
        return sum + p;
    }, 0);
    }, [data?.rides]);


  async function handleConfirmPayment() {
    if (!requestId || !canProceedToPayment) return;

    try {
      setPaying(true);
      const res = await payForRideRequest(requestId, paymentMethod);

      if (!res.success) {
        throw new Error(res.error || "Payment failed.");
      }

      const newPayments = res.payments ?? [];
      setPayments(newPayments);

      if (newPayments.length === 0) {
        toast.info("No rides were pending payment for this request.");
      } else {
        toast.success("Payment completed successfully.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to complete payment.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-neutral-900 bg-neutral-950 px-6 py-3">
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-100"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span className="text-base font-semibold tracking-tight">
          Checkout
        </span>
        <span className="w-6" /> {/* spacer */}
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col px-4 py-4 gap-4">
        <Card className="w-full border border-neutral-800 bg-neutral-900/80 shadow-lg p-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              Loading checkout…
            </div>
          ) : error || !data ? (
            <div className="flex flex-col items-center justify-center py-10 text-red-400">
              <p className="text-sm mb-2">
                {error || "Failed to load ride request."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-neutral-700 text-neutral-200"
                onClick={() => navigate(-1)}
              >
                Go back
              </Button>
            </div>
          ) : (
            <>
              {/* Request summary */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-semibold text-neutral-50">
                    Ride Request #{data.requestId}
                  </h1>
                  <Badge
                    className={`text-xs px-2 py-0.5 border ${
                      requestCompleted
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/60"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/60"
                    }`}
                  >
                    {data.status}
                  </Badge>
                </div>

                <p className="text-xs text-neutral-400">
                  {formattedPickupTime && (
                    <>
                      <span className="font-medium text-neutral-300">
                        Pickup:
                      </span>{" "}
                      {formattedPickupTime}
                    </>
                  )}
                </p>

                <div className="mt-2 flex items-start gap-3 text-sm">
                  <div className="flex flex-col items-center mt-1">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    <div className="h-8 w-px bg-neutral-700" />
                    <Navigation2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="text-xs uppercase text-neutral-500">
                        From
                      </p>
                      <p className="text-sm text-neutral-100">
                        {data.pickup?.name ?? "Unknown pickup"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-neutral-500">
                        To
                      </p>
                      <p className="text-sm text-neutral-100">
                        {data.dropoff?.name ?? "Unknown destination"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legs / rides */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-neutral-100">
                    Trip breakdown
                  </p>
                  <span className="text-xs text-neutral-400">
                    {totalLegs} leg{totalLegs === 1 ? "" : "s"}
                  </span>
                </div>

                {hasRides ? (
                  <div className="flex flex-col gap-3">
                    {data.rides!.map((ride) => (
                      <div
                        key={ride.rideId}
                        className="flex items-start justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            <Car className="h-4 w-4 text-emerald-400" />
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-xs uppercase text-neutral-500">
                              Leg {ride.legIndex}
                            </p>
                            <p className="text-sm text-neutral-100">
                              {ride.fromName} → {ride.toName}
                            </p>
                            <p className="text-xs text-neutral-400">
                              Driver:{" "}
                              <span className="text-neutral-200">
                                {ride.driverName || "Unknown"}
                              </span>
                            </p>
                            {typeof (ride as any).priceFinal === "number" && (
                                <p className="text-xs text-emerald-300 font-semibold">
                                    Price: €{(ride as any).priceFinal.toFixed(2)}
                                </p>
                            )}
                          </div>
                        </div>
                        <Badge
                          className={`text-[10px] px-2 py-0.5 border ${
                            ride.status === "Completed"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/50"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/50"
                          }`}
                        >
                          {ride.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-neutral-500">
                    <Car className="h-6 w-6 text-neutral-700 mb-2" />
                    <p className="text-xs">
                      No rides found for this request yet.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Total Price */}
              {hasRides && (
                <div className="mt-3 flex items-center justify-between border-t border-neutral-800 pt-3">
                    <span className="text-sm text-neutral-300 font-medium">
                    Total price
                    </span>
                    <span className="text-sm font-semibold text-emerald-300">
                    €{totalPrice.toFixed(2)}
                    </span>
                </div>
              )}

              {/* Payment method selector */}
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-neutral-100">
                  Payment method
                </p>
                <div className="flex gap-2">
                    <Button
                    type="button"
                    variant="outline"
                    className={
                      paymentMethod === "CreditCard"
                      ? "flex-1 bg-emerald-800 border-emerald-300 text-white shadow-sm ring-2 ring-emerald-300 hover:bg-emerald-800"
                      : "flex-1 bg-neutral-950 border-neutral-700 text-neutral-200 shadow-sm ring-2 ring-neutral-500 hover:bg-neutral-950"
                    }
                    onClick={() => setPaymentMethod("CreditCard")}
                    onMouseEnter={e => {
                      if (paymentMethod !== "CreditCard") {
                      e.currentTarget.classList.add("text-emerald-400");
                      e.currentTarget.querySelector("svg")?.classList.add("text-emerald-400");
                      }
                    }}
                    onMouseLeave={e => {
                      if (paymentMethod !== "CreditCard") {
                      e.currentTarget.classList.remove("text-emerald-400");
                      e.currentTarget.querySelector("svg")?.classList.remove("text-emerald-400");
                      }
                    }}
                    >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Card
                    </Button>
                    <Button
                    type="button"
                    variant="outline"
                    className={
                      paymentMethod === "Cash"
                      ? "flex-1 bg-emerald-800 border-emerald-300 text-white shadow-sm ring-2 ring-emerald-300 hover:bg-emerald-800"
                      : "flex-1 bg-neutral-950 border-neutral-700 text-neutral-200 shadow-sm ring-2 ring-neutral-500 hover:bg-neutral-950"
                    }
                    onClick={() => setPaymentMethod("Cash")}
                    onMouseEnter={e => {
                      if (paymentMethod !== "Cash") {
                      e.currentTarget.classList.add("text-emerald-400");
                      e.currentTarget.querySelector("svg")?.classList.add("text-emerald-400");
                      }
                    }}
                    onMouseLeave={e => {
                      if (paymentMethod !== "Cash") {
                      e.currentTarget.classList.remove("text-emerald-400");
                      e.currentTarget.querySelector("svg")?.classList.remove("text-emerald-400");
                      }
                    }}
                    >
                    <Wallet className="h-4 w-4 mr-2" />
                    Cash
                    </Button>
                </div>
              </div>

              {/* Payment summary (after paying) */}
              {payments && payments.length > 0 && (
                <div className="mt-4 rounded-xl border border-emerald-700/60 bg-emerald-900/10 px-3 py-3 space-y-1">
                  <p className="text-sm font-semibold text-emerald-300">
                    Payment completed
                  </p>
                  <p className="text-xs text-emerald-200">
                    {payments.length} ride
                    {payments.length === 1 ? "" : "s"} paid. Total gross:{" "}
                    <span className="font-semibold">
                      €{totalGross.toFixed(2)}
                    </span>
                  </p>
                </div>
              )}

              {/* Confirm button */}
              <div className="mt-5 flex flex-col gap-2">
                {!canProceedToPayment && (
                  <p className="text-xs text-amber-400">
                    You can only pay when all rides in this request are completed.
                  </p>
                )}

                <Button
                  disabled={!canProceedToPayment || paying}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  onClick={handleConfirmPayment}
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing payment…
                    </>
                  ) : (
                    <>
                      Confirm &amp; pay{" "}
                      {totalLegs > 0 && (
                        <span className="ml-1 text-sm text-emerald-100">
                          ({totalLegs} ride{totalLegs === 1 ? "" : "s"})
                        </span>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
