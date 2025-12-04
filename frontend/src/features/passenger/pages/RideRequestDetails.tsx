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
import { getRideRequestDetails, type RideRequestDetails, type RideRequestEditDraft, submitRideRating, getRideLiveLocation, cancelRideRequest, updateRideRequest } from "@/features/passenger/api";
import { 
  Clock,
  MapPin,
  Navigation2,
  Loader2,
  Car,
  User2,
  MessageCircle,
  Star,
  CarTaxiFront,
  Pencil,
  X,
  Bot,
  CreditCard
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { Station } from "@/types/api"; 

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

  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<RideRequestEditDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const [editNumOfPeople, setEditNumOfPeople] = useState<string>("");
  const [editPickupAt, setEditPickupAt] = useState<string>("");

  const [profiles, setProfiles] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [rideTypes, setRideTypes] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);

  const [selected, setSelected] = useState({
    serviceType: "",
    rideType: "",
    vehicleType: "",
  });

  const [comboError, setComboError] = useState<string | null>(null);
  
  const formatName = (str: string) =>
    str
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  useEffect(() => {
    async function fetchMetaAndStations() {

      try {
        const metaRes = await fetch("/api/meta/enums");
        if (!metaRes.ok) throw new Error("Failed to load ride metadata");
        const meta = await metaRes.json();

        setProfiles(meta.combo_specs || []);

        // Normalise services: [id, name] OR {id, name} → { id, name }
        const normalisedServices = (meta.services || []).map((s: any) => {
          if (Array.isArray(s)) {
            return {
              id: String(s[0]),
              name: formatName(String(s[1])),
            };
          }
          return {
            id: String(s.id),
            name: String(s.name),
          };
        });
        setServices(normalisedServices);

        // Normalise ride types: [id, name] OR {id, name} → { id, name }
        const normalisedRideTypes = (meta.ride_types || []).map((rt: any) => {
          if (Array.isArray(rt)) {
            return {
              id: String(rt[0]),
              name: formatName(String(rt[1])),
            };
          }
          return {
            id: String(rt.id),
            name: String(rt.name),
          };
        });
        setRideTypes(normalisedRideTypes);

        // Normalise vehicle types: [id, name] OR {id, name} → { id, name }
        const normalisedVehicleTypes = (meta.veh_types || []).map((vt: any) => {
          if (Array.isArray(vt)) {
            return {
              id: String(vt[0]),
              name: formatName(String(vt[1])),
            };
          }
          return {
            id: String(vt.id),
            name: String(vt.name),
          };
        });
        setVehicleTypes(normalisedVehicleTypes);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to load ride configuration metadata.");
      }
    }

    fetchMetaAndStations();
  }, []);

  useEffect(() => {
    if (!data) return;

    // Init service/ride/vehicle from rideProfileId if we have both
    if (profiles.length > 0 && (data as any).rideProfileId) {
      const profile = profiles.find(
        (p: any) =>
          String(p.ride_profile_id ?? p.profile_id ?? p.id) ===
          String((data as any).rideProfileId)
      );
      if (profile) {
        setSelected({
          serviceType: String(profile.service_type_id),
          rideType: String(profile.ride_type_id),
          vehicleType: String(profile.vehicle_type_id),
        });
      }
    }
  }, [data, profiles]);

// Same pattern as PassengerHome
const filteredRideTypeIds = selected.serviceType
  ? Array.from(
      new Set(
        profiles
          .filter(
            (p: any) => String(p.service_type_id) === selected.serviceType
          )
          .map((p: any) => p.ride_type_id)
      )
    )
  : [];

  const filteredVehicleTypeIds =
    selected.serviceType && selected.rideType
      ? Array.from(
          new Set(
            profiles
              .filter(
                (p: any) =>
                  String(p.service_type_id) === selected.serviceType &&
                  String(p.ride_type_id) === selected.rideType
              )
              .map((p: any) => p.vehicle_type_id)
          )
        )
      : [];

  // Ride types allowed for the selected service
  const filteredRideTypes = useMemo(() => {
    if (!selected.serviceType) return [];

    // Build a Set of allowed ride_type_ids for this service
    const allowedRideTypeIds = new Set(
      profiles
        .filter((p: any) => String(p.service_type_id) === selected.serviceType)
        .map((p: any) => String(p.ride_type_id))
    );

    // Keep only rideTypes whose id is allowed
    return rideTypes.filter((rt: any) => allowedRideTypeIds.has(String(rt.id)));
  }, [selected.serviceType, profiles, rideTypes]);

  // Vehicle types allowed for the selected service + ride
  const filteredVehicleTypes = useMemo(() => {
    if (!selected.serviceType || !selected.rideType) return [];

    const allowedVehicleTypeIds = new Set(
      profiles
        .filter(
          (p: any) =>
            String(p.service_type_id) === selected.serviceType &&
            String(p.ride_type_id) === selected.rideType
        )
        .map((p: any) => String(p.vehicle_type_id))
    );

    return vehicleTypes.filter((vt: any) =>
      allowedVehicleTypeIds.has(String(vt.id))
    );
  }, [selected.serviceType, selected.rideType, profiles, vehicleTypes]);


  const handleServiceChange = (value: string) => {
    setSelected({
      serviceType: value,
      rideType: "",
      vehicleType: "",
    });
    setComboError(null);
  };

  const handleRideTypeChange = (value: string) => {
    setSelected((prev) => ({
      ...prev,
      rideType: value,
      vehicleType: "",
    }));
    setComboError(null);
  };

  const handleVehicleTypeChange = (value: string) => {
    setSelected((prev) => ({
      ...prev,
      vehicleType: value,
    }));
    setComboError(null);
  };

  // Helper to convert ISO → datetime-local input value
  const toDateTimeLocal = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
  };

  // When data loads / changes, sync edit fields
  useEffect(() => {
    if (!data) return;
    setEditNumOfPeople(String(data.numOfPeople ?? ""));
    setEditPickupAt(toDateTimeLocal(data.pickupAt));
  }, [data]);

  const handleStartEdit = () => {
    if (!data) return;
    if (data.status !== "Pending") {
      toast.error("You can only edit a pending request.");
      return;
    }

    setEditDraft({
      numOfPeople: data.numOfPeople,
      pickupAt: toDateTimeLocal(data.pickupAt),

      rideProfileId: data.rideProfileId,
      serviceTypeName: data.serviceTypeName,
      rideTypeName: data.rideTypeName,
      vehicleTypeName: data.vehicleTypeName,
    });

    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditDraft(null);
  };

  const isChanged = (oldVal: any, newVal: any) => {
    return String(oldVal) !== String(newVal);
  };

  const handleSaveEdit = async () => {
    if (!data || !editDraft) return;

    // basic local validation
    if (editDraft.numOfPeople <= 0) {
      toast.error("Passengers must be at least 1.");
      return;
    }
    if (!editDraft.pickupAt) {
      toast.error("Pickup time is required.");
      return;
    }

    // 🔹 Determine if the user is actually changing the ride config
    const hasAnySelection =
      !!selected.serviceType || !!selected.rideType || !!selected.vehicleType;

    let rideProfileId: string | undefined;

    if (hasAnySelection) {
      if (!selected.serviceType || !selected.rideType || !selected.vehicleType) {
        toast.error("Please select service, ride and vehicle type.");
        return;
      }

      const profile = profiles.find(
        (p) =>
          String(p.service_type_id) === selected.serviceType &&
          String(p.ride_type_id) === selected.rideType &&
          String(p.vehicle_type_id) === selected.vehicleType
      );

      if (!profile) {
        toast.error("Ride configuration not available for selected options.");
        return;
      }

      rideProfileId =
        profile.ride_profile_id ?? profile.profile_id ?? profile.id;

      if (!rideProfileId) {
        console.error("Profile object:", profile);
        toast.error("Internal error: ride profile id not found for this combo.");
        return;
      }
    }
    // else: user didn't touch service/ride/vehicle → keep existing profile in DB

    // 2) Build *diff* payload – only changed fields
    const payload: {
      numOfPeople?: number;
      pickupAt?: string;
      rideProfileId?: string;
    } = {};

    // numOfPeople
    if (isChanged(data.numOfPeople, editDraft.numOfPeople)) {
      payload.numOfPeople = editDraft.numOfPeople;
    }

    // pickupAt (compare using ISO)
    const newPickupIso = new Date(editDraft.pickupAt).toISOString();
    if (isChanged(data.pickupAt, newPickupIso)) {
      payload.pickupAt = newPickupIso;
    }

    // ride profile: only if user selected a combo *and* it actually changed
    if (rideProfileId && isChanged(data.rideProfileId, rideProfileId)) {
      payload.rideProfileId = rideProfileId;
    }

    // If nothing changed at all, don't hit the API
    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    try {
      setSaving(true);
      const res = await updateRideRequest(data.requestId, payload);

      if (!res.success) {
        toast.error(res.error || "Failed to update ride request.");
        return;
      }

      toast.success("Ride request updated.");
      setEditMode(false);
      setEditDraft(null);
      await loadDetails(false);
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };


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
        return "bg-black/10 text-black border-black/60";
      case "Cancelled":
        return "bg-red-500/10 text-red-400 border-red-500/60";
      default:
        return "bg-gray-300/30 text-gray-700 border-neutral-600";
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

  // Calculate total price from rides
  const totalPrice = useMemo(() => {
    if (!data?.rides) return 0;
    return data.rides.reduce((sum, ride) => sum + (ride.priceFinal || 0), 0);
  }, [data?.rides]);

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

  // Calculate map center as midpoint between pickup and dropoff
  const mapCenter: [number, number] = useMemo(() => {
    if (hasPickupCoords && hasDropoffCoords && data) {
      const pickupLat = (data as any).pickup.latitude as number;
      const pickupLng = (data as any).pickup.longitude as number;
      const dropoffLat = (data as any).dropoff.latitude as number;
      const dropoffLng = (data as any).dropoff.longitude as number;
      
      // Return midpoint
      return [
        (pickupLat + dropoffLat) / 2,
        (pickupLng + dropoffLng) / 2
      ];
    }
    
    if (hasPickupCoords && data) {
      return [
        (data as any).pickup.latitude as number,
        (data as any).pickup.longitude as number,
      ];
    }

    return DEFAULT_MAP_CENTER as [number, number];
  }, [hasPickupCoords, hasDropoffCoords, data]);

  // Calculate appropriate zoom level based on distance between points
  const mapZoom = useMemo(() => {
    if (hasPickupCoords && hasDropoffCoords && data) {
      const pickupLat = (data as any).pickup.latitude as number;
      const pickupLng = (data as any).pickup.longitude as number;
      const dropoffLat = (data as any).dropoff.latitude as number;
      const dropoffLng = (data as any).dropoff.longitude as number;
      
      // Calculate distance (rough approximation)
      const latDiff = Math.abs(pickupLat - dropoffLat);
      const lngDiff = Math.abs(pickupLng - dropoffLng);
      const maxDiff = Math.max(latDiff, lngDiff);
      
      // Adjust zoom based on distance
      if (maxDiff > 1) return 8;
      if (maxDiff > 0.5) return 9;
      if (maxDiff > 0.2) return 10;
      if (maxDiff > 0.1) return 11;
      return 12;
    }
    return 12;
  }, [hasPickupCoords, hasDropoffCoords, data]);

  const markers = useMemo(() => {
    const m: {
      position: [number, number];
      icon?: "default" | "pickup" | "dropoff" | "station" | "vehicle" | "taxi";
      popup?: string;
      onClick?: () => void;
    }[] = [];

    if (hasPickupCoords && data) {
      const { pickup } = data as any;
      console.log("Adding pickup marker:", pickup.latitude, pickup.longitude);
      m.push({
        position: [pickup.latitude as number, pickup.longitude as number],
        icon: "pickup",
        popup: `Pickup: ${pickup.name} (Zone ${pickup.zoneId})`,
      });
    }

    if (hasDropoffCoords && data) {
      const { dropoff } = data as any;
      console.log("Adding dropoff marker:", dropoff.latitude, dropoff.longitude);
      m.push({
        position: [dropoff.latitude as number, dropoff.longitude as number],
        icon: "dropoff",
        popup: `Dropoff: ${dropoff.name} (Zone ${dropoff.zoneId})`,
      });
    }
    
    console.log("Total markers:", m.length);

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
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 overflow-y-auto">
      <header className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight">OSRH | Ride</span>
        </div>
      </header>

      <main className="flex flex-col flex-1">
        {/* One big card that contains BOTH details + map */}
        {/* <section className="w-full bg-gray-50 px-4 py-6"> */}
        <section className="w-full bg-gray-50 px-4 py-6 pb-24">
          <Card className="w-full border border-gray-200 bg-gray-100/80 shadow-lg overflow-hidden">
            <div className="flex flex-col lg:flex-row w-full">
              {/* LEFT: details (everything that was inside your Card before) */}
              <div className="w-full lg:w-[420px] border-b lg:border-b-0 lg:border-r border-gray-200 p-6 space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-600">
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
                      className="border-gray-300 text-gray-900"
                    >
                      Try again
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h1 className="text-lg font-semibold text-gray-900">
                          Ride request #{data.requestId}
                        </h1>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Status Badge */}
                        <Badge
                          variant="outline"
                          className={`text-xs border px-2 py-1 ${statusColor(data.status)}`}
                        >
                          {data.status}
                        </Badge>

                        {/* Edit icon (Pending only) */}
                        {data.status === "Pending" && (
                          <button
                            onClick={() => (editMode ? handleCancelEdit() : handleStartEdit())}
                            className="p-1 rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                            title={editMode ? "Cancel editing" : "Edit request"}
                          >
                            {editMode ? (
                              <X className="h-4 w-4 text-red-400" />
                            ) : (
                              <Pencil className="h-4 w-4 text-gray-700" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 space-y-3 text-sm">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-9000 mb-1">
                          Current Ride configuration
                        </div>

                        {/* View badges */}
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className="border-gray-300 bg-gray-100 text-gray-800 flex items-center gap-1"
                          >
                            <CarTaxiFront className="h-3 w-3 text-black" />
                            <span>
                              {formatName(
                                (data as any).serviceTypeName ??
                                services.find((s: any) => String(s.id) === selected.serviceType)?.name ??
                                "Service type"
                              )}
                            </span>
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-gray-300 bg-gray-100 text-gray-800 flex items-center gap-1"
                          >
                            <Bot className="h-3 w-3 text-black" />
                            <span>
                              {formatName(
                                (data as any).rideTypeName ??
                                rideTypes.find((rt: any) => String(rt.id) === selected.rideType)?.name ??
                                "Ride type"
                              )}
                            </span>
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-gray-300 bg-gray-100 text-gray-800 flex items-center gap-1"
                          >
                            <Car className="h-3 w-3 text-black" />
                            <span>
                              {formatName(
                                (data as any).vehicleTypeName ??
                                vehicleTypes.find((vt: any) => String(vt.id) === selected.vehicleType)?.name ??
                                "Vehicle type"
                              )}
                            </span>
                          </Badge>
                        </div>

                        {/* Edit controls (only visible in editMode) */}
                        {editMode && (
                          <div className="mt-3 space-y-2">
                            <div>
                              <label className="text-xs font-medium uppercase tracking-wide text-gray-600">
                                Service type
                              </label>
                              <div className="relative">
                                <select
                                  className="w-full rounded-lg border border-gray-200 bg-gray-100 pl-3 pr-10 py-2 text-gray-900 appearance-none outline-none"
                                  value={selected.serviceType}
                                  onChange={(e) => handleServiceChange(e.target.value)}
                                >
                                  <option value="">Choose service type</option>
                                  {services.map((s: any) => (
                                    <option key={s.id} value={String(s.id)}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black">
                                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                                    <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </span>
                              </div>
                            </div>

                            {selected.serviceType && (
                              <div>
                                <label className="text-xs font-medium uppercase tracking-wide text-gray-600">
                                  Ride type
                                </label>
                                <div className="relative">
                                  <select
                                    className="w-full rounded-lg border border-gray-200 bg-gray-100 pl-3 pr-10 py-2 text-gray-900 appearance-none outline-none"
                                    value={selected.rideType}
                                    onChange={(e) => handleRideTypeChange(e.target.value)}
                                  >
                                    <option value="">Select ride</option>
                                    {filteredRideTypes.map((rt: any) => (
                                      <option key={rt.id} value={String(rt.id)}>
                                        {rt.name}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black">
                                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                                      <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </span>
                                </div>
                              </div>
                            )}

                            {selected.rideType && (
                              <div>
                                <label className="text-xs font-medium uppercase tracking-wide text-gray-600">
                                  Vehicle type
                                </label>
                                <div className="relative">
                                  <select
                                    className="w-full rounded-lg border border-gray-200 bg-gray-100 pl-3 pr-10 py-2 text-gray-900 appearance-none outline-none"
                                    value={selected.vehicleType}
                                    onChange={(e) => handleVehicleTypeChange(e.target.value)}
                                  >
                                    <option value="">Select vehicle</option>
                                    {filteredVehicleTypes.map((vt: any) => (
                                      <option key={vt.id} value={String(vt.id)}>
                                        {vt.name}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black">
                                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                                      <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </span>
                                </div>
                              </div>
                            )}

                            {comboError && (
                              <p className="text-xs text-red-400">{comboError}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-9000 mb-1">
                          From
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2">
                          <MapPin className="h-4 w-4 text-black" />
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-900">
                              {data.pickup.name}
                            </span>
                            <span className="text-xs text-gray-9000">
                              Zone {data.pickup.zoneId}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-9000 mb-1">
                          To
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2">
                          <Navigation2 className="h-4 w-4 text-black" />
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-900">
                              {data.dropoff.name}
                            </span>
                            <span className="text-xs text-gray-9000">
                              Zone {data.dropoff.zoneId}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-9000 mb-1">
                          Pickup time
                        </div>

                        {editMode ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-black" />
                              <Input
                                type="datetime-local"
                                value={editPickupAt}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setEditPickupAt(value);
                                  setEditDraft((prev) =>
                                    prev ? { ...prev, pickupAt: value } : prev
                                  );
                                }}
                                className="h-9 bg-gray-100 border-gray-300 text-gray-900 text-sm"
                              />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2">
                            <Clock className="h-4 w-4 text-black" />
                            <span className="text-sm text-gray-900">
                              {formattedPickupTime}
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-9000 mb-1">
                          Passengers
                        </div>

                        {editMode ? (
                          <div className="flex items-center gap-2">
                            <User2 className="h-4 w-4 text-black" />
                              <Input
                                type="number"
                                min={1}
                                value={editNumOfPeople}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setEditNumOfPeople(value);
                                  setEditDraft((prev) =>
                                    prev
                                      ? { ...prev, numOfPeople: Number(value || 0) }
                                      : prev
                                  );
                                }}
                                className="h-9 bg-gray-100 border-gray-300 text-gray-900 text-sm"
                              />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2">
                            <User2 className="h-4 w-4 text-black" />
                            <span className="text-sm text-gray-900">
                              {data.numOfPeople}{" "}
                              {data.numOfPeople === 1 ? "person" : "people"}
                            </span>
                          </div>
                        )}
                      </div>

                    </div>

                    {editMode && (
                    <div className="mt-4 rounded-xl border border-black/40 bg-black/5 px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className="text-xs text-gray-800">
                        You are editing this ride request. Changes will apply only while the request remains pending.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-neutral-600 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800"
                          onClick={handleCancelEdit}
                          disabled={saving}
                        >
                          Discard
                        </Button>
                        <Button
                          size="sm"
                          className="bg-black hover:bg-black text-xs text-white"
                          onClick={handleSaveEdit}
                          disabled={saving}
                        >
                          {saving ? "Saving…" : "Save changes"}
                        </Button>
                      </div>
                    </div>
                  )}


                    {/* Waiting-for-drivers block */}
                    <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-100/90 px-4 py-5">
                      {data.progressStatus === "AllAccepted" ||
                      data.progressStatus === "RidesCreated" ||
                      data.progressStatus === "Completed" ? (
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/20">
                            <Car className="h-5 w-5 text-black" />
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-black">
                              All rides have been accepted!
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                              Drivers have accepted your ride. Your trip will begin soon.
                            </p>
                          </div>
                        </div>
                      ) : data.progressStatus === "Failed" ||
                          data.status === "Cancelled" ? (
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                            <Car className="h-5 w-5 text-red-400" />
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-400">
                              Ride request has been cancelled.
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                              You have cancelled this ride request.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10">
                            <span className="absolute inset-0 rounded-full bg-black/20 animate-ping" />
                            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/20">
                              <Car className="h-5 w-5 text-black" />
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              Waiting for drivers…
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
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
                            className="border-gray-300 text-xs text-white bg-gray-900 hover:bg-black hover:text-gray-900"
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
                    className="border-gray-300 text-xs text-white bg-gray-900 hover:bg-black hover:text-gray-900"
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
                    zoom={mapZoom}
                    markers={markers}
                    polyline={polyline}
                    className="rounded-none"
                    />
                  </div>
                </div>
            </div>
          </Card>

          {/* Payment Summary Card - Show when rides are completed */}
          {allRidesCompleted && totalPrice > 0 && (
            <Card className="mx-4 my-4 border border-gray-200 bg-white">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Payment Summary</h3>
                    <p className="text-sm text-gray-600">Your ride is complete</p>
                  </div>
                  {canProceedToPayment ? (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/60">
                      Payment Pending
                    </Badge>
                  ) : (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/60">
                      Paid
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {data?.rides?.map((ride, idx) => (
                    <div key={ride.rideId} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Leg {ride.legIndex}: {ride.fromName} → {ride.toName}
                      </span>
                      <span className="font-medium text-gray-900">
                        €{ride.priceFinal?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  ))}

                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-black">
                        €{totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {canProceedToPayment && (
                    <div className="mt-4">
                      <Button
                        size="lg"
                        className="w-full bg-black hover:bg-black/90 text-white flex items-center justify-center gap-2 group"
                        onClick={handleGoToPayment}
                      >
                        <CreditCard className="h-5 w-5" />
                        <span>Continue to Payment</span>
                        <span className="transition-transform duration-200 group-hover:translate-x-1 text-xl">→</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* BOTTOM: Rides */}
          <div className="w-full px-4 py-4">
            {/* If accepted → show rides */}
            {(data?.progressStatus === "AllAccepted" || data?.progressStatus === "RidesCreated" || data?.progressStatus === "Completed") &&
              data?.rides && data.rides.length > 0 ? (
              <>
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                Your rides
                </h2>

                <div className="flex gap-4 overflow-x-auto pb-4 items-center">
                  {data.rides.map((ride, idx) => (
                    <div key={ride.rideId} className="flex items-center">
                      <div
                        className="min-w-[240px] rounded-xl border border-gray-200 bg-gray-100 p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs uppercase text-gray-600">
                            Leg {ride.legIndex}
                          </span>
                          <Badge className="text-[10px] px-2 py-0.5">
                            {ride.status}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-black" />
                            <span>{ride.fromName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Navigation2 className="h-4 w-4 text-black" />
                            <span>{ride.toName}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <User2 className="h-4 w-4 text-black" />
                            <span className="text-gray-700">
                              {ride.driverName}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 w-full border-gray-300 bg-gray-200 text-gray-900 hover:bg-gray-300 hover:text-black flex items-center gap-1"
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
                          <MessageCircle className="h-4 w-4 text-gray-900" />
                          <span className="text-gray-900 font-semibold">Chat</span>
                        </Button>
                        { data.status === "Completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-3 w-full border-gray-800 bg-gray-900 text-white hover:bg-gray-800 hover:text-white"
                              onClick={() => {
                                setReviewRideId(ride.rideId);
                                setReviewOpen(true);
                              }}
                            >
                              <Star className="h-4 w-4 mr-2 text-white" />
                              <span className="text-white font-semibold">Leave a review</span>
                            </Button>
                        )}
                      </div>
                      {/* Arrow between legs, except after last leg */}
                      {idx < data.rides.length - 1 && (
                        <div className="flex items-center mx-2">
                          <span className="text-black text-2xl select-none">{'→'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
              {/* WAITING PLACEHOLDER */}
              <div className="flex flex-col items-center justify-center py-10 text-gray-9000">
                <Car className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm">Waiting for drivers to accept your ride...</p>
              </div>
            </>
            )}
          </div>

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
        <DialogContent className="bg-gray-100 border border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Leave a review</DialogTitle>
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
            className="bg-gray-200 border-gray-300 text-gray-900"
          />

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              className="bg-gray-200 border-neutral-600 text-white hover:bg-gray-300 hover:text-black"
              onClick={() => setReviewOpen(false)}
            >
              Cancel
            </Button>

            <Button
              disabled={rating === 0 || submittingReview}
              className="bg-black hover:bg-black text-white"
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
