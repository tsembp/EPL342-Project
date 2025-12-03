import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/MapView";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";
import type { Station } from "@/types/api";
import { toast } from "sonner";
import {
  MapPin,
  Navigation2,
  Clock,
  Search as SearchIcon,
  Car,
  Bot,
  Loader2,
  AlertCircle
} from "lucide-react";
import {
  requestRide,
  getRideRequestAlternatives,
  type RideRequestAlternative,
  selectRideRequestAlternative,
  getRideRequests
} from "@/features/passenger/api";

// A visual component to show the current step
const Stepper = ({ currentStep }: { currentStep: number }) => {
  const steps = ["Plan Ride", "Choose Route"];
  return (
    <div className="flex w-full items-center justify-center pb-6">
      <div className="flex w-full max-w-md items-center">
        {steps.map((label, index) => {
          const step = index + 1;
          const isActive = currentStep === step;
          const isCompleted = currentStep > step;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center text-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    isActive
                      ? "bg-black text-white"
                      : isCompleted
                      ? "bg-black text-white"
                      : "border-2 border-gray-300 bg-white text-gray-400"
                  }`}
                >
                  {step}
                </div>
                <div
                  className={`mt-2 w-20 text-xs transition-colors ${
                    isActive || isCompleted
                      ? "font-semibold text-gray-900"
                      : "text-gray-500"
                  }`}
                >
                  {label}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 ${isCompleted ? 'bg-black' : 'bg-gray-300'}`}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default function PassengerHome() {
  const navigate = useNavigate();

  const [isCalculatingAlternatives, setIsCalculatingAlternatives] =
    useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [pickup, setPickup] = useState<Station | null>(null);
  const [dropoff, setDropoff] = useState<Station | null>(null);

  // Date/time picker state
  const [pickupDateTime, setPickupDateTime] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    // Format to yyyy-MM-ddTHH:mm
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const [numOfPeople, setNumOfPeople] = useState(1);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [requestId, setRequestId] = useState<number | null>(null);
  const [alternatives, setAlternatives] = useState<RideRequestAlternative[]>(
    []
  );
  const [selectedAlternativeNo, setSelectedAlternativeNo] = useState<
    number | null
  >(null);

  useEffect(() => {
    async function fetchMetaAndStations() {
      setIsLoadingStations(true);
      try {
        const metaRes = await fetch("/api/meta/enums");
        const meta = await metaRes.json();
        setProfiles(meta.combo_specs || []);
        setServices(meta.services || []);
        setRideTypes(meta.ride_types || []);
        setVehicleTypes(meta.veh_types || []);

        const params = new URLSearchParams({ pointType: "S" });
        const stationRes = await fetch(`/api/stations?${params.toString()}`);
        const stationData = await stationRes.json();
        setStations(stationData.stations as Station[]);
      } catch (err) {
        toast.error("Failed to load initial ride data. Please try again.");
      } finally {
        setIsLoadingStations(false);
      }
    }
    fetchMetaAndStations();
  }, []);

  const markers = stations.map((station) => ({
    position: [station.latitude, station.longitude] as [number, number],
    icon: (
      pickup?.pointId === station.pointId
        ? "pickup"
        : dropoff?.pointId === station.pointId
        ? "dropoff"
        : "station"
    ) as any,
    popup: `${station.name} (${station.zoneName})`,
    onClick: () => {
      if (!pickup) setPickup(station);
      else if (!dropoff) setDropoff(station);
      else {
        if (
          station.pointId !== pickup.pointId &&
          station.pointId !== dropoff.pointId
        ) {
          setPickup(station);
          setDropoff(null);
        } else if (station.pointId === pickup.pointId) setPickup(null);
        else if (station.pointId === dropoff.pointId) setDropoff(null);
      }
    },
  }));

  // Ride requests loading/error state
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [errorRequests, setErrorRequests] = useState(false);
  const [rideRequestsData, setRideRequestsData] = useState<any>(null);

  useEffect(() => {
    async function fetchRideRequests() {
      setLoadingRequests(true);
      setErrorRequests(false);
      try {
        const data = await getRideRequests('Pending');
        setRideRequestsData(data);
      } catch (err) {
        setErrorRequests(true);
      } finally {
        setLoadingRequests(false);
      }
    }
    fetchRideRequests();
  }, []);

  const pendingRequests = rideRequestsData?.requests ?? [];
  const topPendingRequest =
  !loadingRequests && !errorRequests && pendingRequests.length > 0
    ? pendingRequests[0]
    : null;

  // Always just start → end
  const polyline: [number, number][] =
    pickup && dropoff
      ? [
          [pickup.latitude, pickup.longitude],
          [dropoff.latitude, dropoff.longitude],
        ]
      : [];

  const mapCenter: [number, number] = pickup
    ? [pickup.latitude, pickup.longitude]
    : dropoff
    ? [dropoff.latitude, dropoff.longitude]
    : (DEFAULT_MAP_CENTER as [number, number]);

  const filteredRideTypeIds = selected.serviceType
    ? Array.from(
        new Set(
          profiles
            .filter(
              (p) => String(p.service_type_id) === selected.serviceType
            )
            .map((p) => p.ride_type_id)
        )
      )
    : [];
  const filteredRideTypes = filteredRideTypeIds.map((id) => {
    const rideType = Array.isArray(rideTypes)
      ? rideTypes.find((rt) => String(rt[0]) === String(id))
      : null;
    return rideType ? { id: rideType[0], name: rideType[1] } : { id, name: id };
  });

  const filteredVehicleTypeIds =
    selected.serviceType && selected.rideType
      ? Array.from(
          new Set(
            profiles
              .filter(
                (p) =>
                  String(p.service_type_id) === selected.serviceType &&
                  String(p.ride_type_id) === selected.rideType
              )
              .map((p) => p.vehicle_type_id)
          )
        )
      : [];
  const filteredVehicleTypes = filteredVehicleTypeIds.map((id) => {
    const vehicleType = Array.isArray(vehicleTypes)
      ? vehicleTypes.find((vt) => String(vt[0]) === String(id))
      : null;
    return vehicleType
      ? { id: vehicleType[0], name: vehicleType[1] }
      : { id, name: id };
  });

  useEffect(() => {
    if (selected.serviceType && selected.rideType && selected.vehicleType) {
      const valid = profiles.find(
        (p) =>
          String(p.service_type_id) === selected.serviceType &&
          String(p.ride_type_id) === selected.rideType &&
          String(p.vehicle_type_id) === selected.vehicleType
      );
      setComboError(valid ? null : "This combination is not available.");
    } else {
      setComboError(null);
    }
  }, [selected, profiles]);

  const maxSeats =
    selected.serviceType && selected.rideType && selected.vehicleType
      ? (() => {
          const profile = profiles.find(
            (p) =>
              String(p.service_type_id) === selected.serviceType &&
              String(p.ride_type_id) === selected.rideType &&
              String(p.vehicle_type_id) === selected.vehicleType
          );
          return profile?.num_seats || 4;
        })()
      : 4;

  function computePickupAtISO(): string {
    // Use pickupDateTime from input
    if (!pickupDateTime) {
      // fallback to now
      return new Date().toISOString().slice(0, 19);
    }
    // Convert to ISO string (yyyy-MM-ddTHH:mm:ss)
    const d = new Date(pickupDateTime);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}T${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:00`;
  }

  async function handleSearch() {
    if (!pickup || !dropoff) {
      toast.error("Select both pickup and dropoff locations.");
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

    const rideProfileId: string | undefined =
      profile.ride_profile_id ?? profile.profile_id ?? profile.id;

    if (!rideProfileId) {
      console.error("Profile object:", profile);
      toast.error("Internal error: ride profile id not found for this combo.");
      return;
    }

    setIsSubmitting(true);
    setIsCalculatingAlternatives(true);

    try {
      const payload = {
        pickupPointId: pickup.pointId,
        dropoffPointId: dropoff.pointId,
        rideProfileId,
        numOfPeople,
        pickupAt: computePickupAtISO(),
      };

      const rideReqData = await requestRide(payload);

      if (!rideReqData.success || !rideReqData.requestId) {
        toast.error(rideReqData.error || "Failed to request ride.");
        return;
      }

      const newRequestId = rideReqData.requestId;
      setRequestId(newRequestId);

      const altRes = await getRideRequestAlternatives(newRequestId);

      if (
        !altRes.success ||
        !altRes.alternatives ||
        altRes.alternatives.length === 0
      ) {
        toast.error(
          altRes.error || "No route alternatives found for this request."
        );
        return;
      }

      setAlternatives(altRes.alternatives);
      setSelectedAlternativeNo(altRes.alternatives[0]?.alternativeNo ?? null);
      setCurrentStep(2);
      toast.success("We found some route alternatives for you!");
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.message || "An error occurred while searching for rides."
      );
    } finally {
      setIsSubmitting(false);
      setIsCalculatingAlternatives(false);
    }
  }

  async function handleConfirmAlternative() {
    if (!requestId) {
      toast.error("No ride request found.");
      return;
    }
    if (!selectedAlternativeNo) {
      toast.error("Please select an alternative route first.");
      return;
    }

    const alt = alternatives.find(
      (a) => a.alternativeNo === selectedAlternativeNo
    );
    if (!alt) {
      toast.error("Selected alternative not found.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await selectRideRequestAlternative(requestId, {
        alternativeNo: selectedAlternativeNo,
        legs: alt.legs,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to confirm route alternative.");
        return;
      }

      toast.success("Route confirmed. Looking for drivers…");
      navigate(`/passenger/rides/${requestId}/details`);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.message || "An error occurred while confirming the alternative."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  
  const CarLoadingAnimation = () => (
    <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl p-8">
      <div className="relative w-32 h-16">
        <div className="absolute left-0 top-1/2 animate-car-move">
          <Car className="w-16 h-16 text-black" />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
      </div>
      <div className="mt-4 text-gray-900 text-sm font-medium">
        Finding the best routes for you...
      </div>
      <style>{`@keyframes car-move { 0% { left: 0; } 100% { left: 8rem; } } .animate-car-move { animation: car-move 2s linear infinite alternate; }`}</style>
    </div>
  );

  return (
  <div className="flex h-full bg-white text-gray-900">
      {isCalculatingAlternatives && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <CarLoadingAnimation />
        </div>
      )}
      
      {/* Left Sidebar - Booking Form */}
      <aside className="w-[440px] flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-6">
          {/* Pending Request Card */}
          {!loadingRequests && !errorRequests && topPendingRequest && (
            <Card className="mb-6 bg-amber-50 border-amber-200">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-amber-700">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                    </span>
                    <span className="font-semibold uppercase tracking-wide">
                      Active Request
                    </span>
                  </div>
                  <span className="text-[11px] rounded-full bg-white px-2 py-1 text-gray-600">
                    #{topPendingRequest.RequestId}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>
                      {new Date(topPendingRequest.PickupAt).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-gray-700">
                    <MapPin className="w-3 h-3 mt-0.5 text-amber-600" />
                    <div className="space-y-1">
                      <p>
                        <span className="font-semibold">From</span> #{topPendingRequest.pickupPointId}
                      </p>
                      <p>
                        <span className="font-semibold">To</span> #{topPendingRequest.dropOffPointId}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
          
          <div className="flex-1 min-w-0">

          <Stepper currentStep={currentStep} />

                  {currentStep === 1 && (
                    <>
                      <h2 className="mb-6 text-2xl font-bold text-gray-900">
                        Request a ride
                      </h2>
                      <div className="space-y-4 text-sm">
                        <div>
                          <label className="text-sm font-medium text-gray-900 mb-2 block">
                            Service Type
                          </label>
                          <div className="relative">
                            <select
                              className="w-full h-12 rounded-lg border border-gray-200 bg-gray-50 pl-4 pr-10 py-2 text-gray-900 appearance-none outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                              value={selected.serviceType}
                              onChange={(e) =>
                                setSelected({
                                  serviceType: e.target.value,
                                  rideType: "",
                                  vehicleType: "",
                                })
                              }
                            >
                              <option value="">Choose service type</option>
                              {services.map((item) => (
                                <option key={item[0]} value={item[0]}>
                                  {item[1]
                                    .replace(/_/g, " ")
                                    .replace(
                                      /\b\w/g,
                                      (c: string) => c.toUpperCase()
                                    )}
                                </option>
                              ))}
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg
                                width="20"
                                height="20"
                                fill="none"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  d="M6 8l4 4 4-4"
                                  stroke="#000"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          </div>
                        </div>
                        {selected.serviceType && (
                          <div>
                            <label className="text-sm font-medium text-gray-900 mb-2 block">
                              Ride Type
                            </label>
                            <div className="relative">
                              <select
                                className="w-full h-12 rounded-lg border border-gray-200 bg-gray-50 pl-4 pr-10 py-2 text-gray-900 appearance-none outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors disabled:opacity-50"
                                value={selected.rideType}
                                onChange={(e) =>
                                  setSelected((s) => ({
                                    ...s,
                                    rideType: e.target.value,
                                    vehicleType: "",
                                  }))
                                }
                                disabled={!selected.serviceType}
                              >
                                <option value="">Choose ride type</option>
                                {filteredRideTypes.length > 0 ? (
                                  filteredRideTypes.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name
                                        .replace(/_/g, " ")
                                        .replace(
                                          /\b\w/g,
                                          (c: string) => c.toUpperCase()
                                        )}
                                    </option>
                                  ))
                                ) : (
                                  <option value="" disabled>
                                    No ride types available
                                  </option>
                                )}
                              </select>
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg
                                  width="20"
                                  height="20"
                                  fill="none"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    d="M6 8l4 4 4-4"
                                    stroke="#000"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            </div>
                          </div>
                        )}
                        {selected.serviceType && selected.rideType && (
                          <div>
                            <label className="text-sm font-medium text-gray-900 mb-2 block">
                              Vehicle Type
                            </label>
                            <div className="relative">
                              <select
                                className="w-full h-12 rounded-lg border border-gray-200 bg-gray-50 pl-4 pr-10 py-2 text-gray-900 appearance-none outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors disabled:opacity-50"
                                value={selected.vehicleType}
                                onChange={(e) => {
                                  setSelected((s) => ({
                                    ...s,
                                    vehicleType: e.target.value,
                                  }));
                                  setNumOfPeople(1);
                                }}
                                disabled={
                                  !selected.serviceType || !selected.rideType
                                }
                              >
                                <option value="">Choose vehicle type</option>
                                {filteredVehicleTypes.length > 0 ? (
                                  filteredVehicleTypes.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name
                                        .replace(/_/g, " ")
                                        .replace(
                                          /\b\w/g,
                                          (c: string) => c.toUpperCase()
                                        )}
                                    </option>
                                  ))
                                ) : (
                                  <option value="" disabled>
                                    No vehicle types available
                                  </option>
                                )}
                              </select>
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg
                                  width="20"
                                  height="20"
                                  fill="none"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    d="M6 8l4 4 4-4"
                                    stroke="#000"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            </div>
                          </div>
                        )}
                        {selected.serviceType &&
                          selected.rideType &&
                          selected.vehicleType && (
                            <div>
                              <label className="text-sm font-medium text-gray-900 mb-2 block">
                                Number of Passengers
                              </label>
                              <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <button
                                  type="button"
                                  className="w-10 h-10 rounded-full border-2 border-gray-300 bg-white hover:bg-gray-50 transition disabled:opacity-30 text-gray-900 font-bold text-lg flex items-center justify-center"
                                  disabled={numOfPeople <= 1}
                                  onClick={() => setNumOfPeople(numOfPeople - 1)}
                                  aria-label="Decrease"
                                >
                                  −
                                </button>
                                <div className="flex-1 text-center">
                                  <span className="font-bold text-2xl text-gray-900 block">
                                    {numOfPeople}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Max {maxSeats}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="w-10 h-10 rounded-full border-2 border-gray-300 bg-white hover:bg-gray-50 transition disabled:opacity-30 text-gray-900 font-bold text-lg flex items-center justify-center"
                                  disabled={numOfPeople >= maxSeats}
                                  onClick={() => setNumOfPeople(numOfPeople + 1)}
                                  aria-label="Increase"
                                >
                                  +
                                </button>
                              </div>
                              {numOfPeople > maxSeats && (
                                <p className="mt-2 text-sm text-red-600">
                                  Too many people for this vehicle type!
                                </p>
                              )}
                            </div>
                          )}
                        {comboError && (
                          <p className="mt-2 text-sm text-red-600">
                            {comboError}
                          </p>
                        )}
                      </div>
                      <div className="space-y-4 text-sm mt-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-900">
                            Pickup location
                          </label>
                          <div className="relative flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer hover:border-gray-300 transition-colors">
                            <MapPin className="h-5 w-5 text-gray-700" />
                            <span className="flex-1 text-sm text-gray-900">
                              {pickup
                                ? `ZonePointId: ${pickup.pointId}`
                                : "Choose pickup point"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-900">
                            Dropoff location
                          </label>
                          <div className="relative flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer hover:border-gray-300 transition-colors">
                            <Navigation2 className="h-5 w-5 text-gray-700" />
                            <span className="flex-1 text-sm text-gray-900">
                              {dropoff
                                ? `ZonePointId: ${dropoff.pointId}`
                                : "Choose dropoff point"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-900">
                            Pickup date & time
                          </label>
                          <div className="relative flex items-center gap-2">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <Clock className="h-5 w-5 text-gray-700" />
                            </span>
                            <input
                              type="datetime-local"
                              className="w-full h-12 rounded-lg border border-gray-200 bg-gray-50 pl-11 pr-3 py-2 text-gray-900 appearance-none outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                              value={pickupDateTime}
                              min={(() => {
                                const now = new Date();
                                const pad = (n: number) => n.toString().padStart(2, "0");
                                return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                              })()}
                              onChange={e => setPickupDateTime(e.target.value)}
                            />
                          </div>
                        </div>
                        {pickup && dropoff && (
                          <div className="pt-1 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <span>Route from </span>
                            <Badge
                              variant="outline"
                              className="mr-1 border-gray-300 bg-white text-gray-900"
                            >
                              {pickup.zoneName}
                            </Badge>
                            <span>to </span>
                            <Badge
                              variant="outline"
                              className="border-gray-300 bg-white text-gray-900"
                            >
                              {dropoff.zoneName}
                            </Badge>
                          </div>
                        )}
                        <Button
                          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3 h-12 text-base font-medium text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400"
                          disabled={
                            isSubmitting ||
                            isLoadingStations ||
                            !pickup ||
                            !dropoff ||
                            !selected.serviceType ||
                            !selected.rideType ||
                            !selected.vehicleType ||
                            !!comboError
                          }
                          onClick={handleSearch}
                        >
                          {isSubmitting ? (
                            "Searching for rides…"
                          ) : (
                            <>
                              Search for rides
                              <SearchIcon className="h-5 w-5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}

                  {currentStep === 2 && (
                    <>
                      <h2 className="mb-6 text-2xl font-bold text-gray-900">
                        Choose your route
                      </h2>
                      <div className="space-y-3 text-sm">
                        {alternatives.map((alt) => {
                          const isSelected = alt.alternativeNo === selectedAlternativeNo;
                          return (
                            <div
                              key={alt.alternativeNo}
                              onClick={() => setSelectedAlternativeNo(alt.alternativeNo)}
                              className={
                                "rounded-lg border p-4 cursor-pointer transition-all " +
                                (isSelected
                                  ? "border-black bg-gray-50 shadow-sm"
                                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm")
                              }
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-base font-semibold text-gray-900">
                                  Route #{alt.alternativeNo}
                                </span>
                                <div className="flex items-center gap-2">
                                  {isSelected && (
                                    <Badge
                                      variant="outline"
                                      className="border-black bg-black text-white"
                                    >
                                      Selected
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className="border-gray-300 text-gray-700"
                                  >
                                    {alt.legs.length} {alt.legs.length === 1 ? 'leg' : 'legs'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-2 text-xs text-gray-600">
                                {alt.legs.map((leg: any) => (
                                  <div
                                    key={leg.seqNo}
                                    className="flex items-center gap-2 pl-2"
                                  >
                                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs font-medium">
                                      {leg.seqNo}
                                    </span>
                                    <span>
                                      Zone {leg.fromZoneId} → Zone {leg.toZoneId}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {alternatives.length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-8">
                            No alternatives loaded.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
        </div>
      </aside>

      {/* Right: Full-screen Map */}
      <main className="flex-1 relative bg-gray-100">
        <MapView center={mapCenter} markers={markers} polyline={polyline} />
        
        {currentStep === 2 && (
          <Button
            className="absolute bottom-8 right-8 z-50 rounded-lg bg-black py-3 px-8 h-14 text-base font-medium text-white shadow-xl hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 flex items-center gap-3 group"
            disabled={isSubmitting || !requestId || !selectedAlternativeNo}
            onClick={handleConfirmAlternative}
          >
            {isSubmitting ? (
              "Confirming route…"
            ) : (
              <>
                Confirm and continue
                <span className="inline-block transition-transform duration-300 ease-in-out group-hover:translate-x-2">
                  →
                </span>
              </>
            )}
          </Button>
        )}
      </main>
    </div>
);
}
