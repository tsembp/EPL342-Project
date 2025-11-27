import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/MapView";
import { BottomNav } from "@/components/BottomNav";
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
} from "lucide-react";
import {
  requestRide,
  getRideRequestAlternatives,
  type RideRequestAlternative,
  selectRideRequestAlternative,
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
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center text-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    isActive
                      ? "border-2 border-emerald-500 bg-neutral-900 text-emerald-500"
                      : "border-2 border-neutral-700 bg-neutral-800 text-neutral-500"
                  }`}
                >
                  {step}
                </div>
                <div
                  className={`mt-2 w-20 text-xs transition-colors ${
                    isActive
                      ? "font-semibold text-emerald-400"
                      : "text-neutral-400"
                  }`}
                >
                  {label}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 bg-neutral-700"></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default function CreateRide() {
  const navigate = useNavigate();

  const [isCalculatingAlternatives, setIsCalculatingAlternatives] =
    useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [pickup, setPickup] = useState<Station | null>(null);
  const [dropoff, setDropoff] = useState<Station | null>(null);

  const pickupOptions = [
    { label: "In 5 minutes", value: 5 },
    { label: "In 15 minutes", value: 15 },
    { label: "In 30 minutes", value: 30 },
    { label: "In 1 hour", value: 60 },
    { label: "In 2 hours", value: 120 },
    { label: "In 3 hours", value: 180 },
  ];

  const [pickupTimeMinutes, setPickupTimeMinutes] = useState<number>(5);
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
    const now = new Date();
    now.setMinutes(now.getMinutes() + pickupTimeMinutes);
    return now.toISOString().slice(0, 19);
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
      navigate(`/passenger/rides/${requestId}`);
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
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-32 h-16">
        <div className="absolute left-0 top-1/2 animate-car-move">
          <Car className="w-16 h-16 text-emerald-500" />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-neutral-700 to-neutral-900 rounded-full" />
      </div>
      <div className="mt-4 text-neutral-400 text-sm">
        Calculating possible routes...
      </div>
      <style>{`@keyframes car-move { 0% { left: 0; } 100% { left: 8rem; } } .animate-car-move { animation: car-move 2s linear infinite alternate; }`}</style>
    </div>
  );

  return (
  <div className="flex min-h-screen h-screen flex-col bg-neutral-950 text-neutral-50 overflow-hidden">
      {isCalculatingAlternatives && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <CarLoadingAnimation />
        </div>
      )}
      <header className="flex items-center justify-between border-b border-neutral-900 bg-neutral-950 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight">Ride</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-300">
          <button className="rounded-full border border-neutral-700 px-4 py-1 text-xs text-neutral-200 hover:bg-neutral-900">
            Login
          </button>
          <button className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-medium text-neutral-950 hover:bg-emerald-400">
            Sign up
          </button>
        </div>
      </header>
  <main className="flex flex-1 flex-col lg:flex-row h-full overflow-hidden">
  <section className="flex w-full justify-center border-b border-neutral-900 bg-neutral-950 px-4 py-6 pb-24 lg:w-[380px] lg:flex-shrink-0 lg:border-b-0 lg:border-r overflow-y-auto h-full max-h-full">
          <Card className="w-full max-w-md border border-neutral-800 bg-neutral-900/80 p-6 shadow-lg">
            <Stepper currentStep={currentStep} />

            {currentStep === 1 && (
              <>
                <h2 className="mb-4 text-xl font-semibold text-neutral-50">
                  Get a ride
                </h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                      Service Type
                    </label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Car className="h-5 w-5 text-emerald-500" />
                      </span>
                      <select
                        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-10 pr-10 py-2 text-neutral-50 appearance-none outline-none"
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
                            stroke="#10B981"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                  {selected.serviceType && (
                    <div className="mt-4">
                      <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                        Ride Type
                      </label>
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Bot className="h-5 w-5 text-emerald-500" />
                        </span>
                        <select
                          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-10 pr-10 py-2 text-neutral-50 appearance-none outline-none"
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
                              stroke="#10B981"
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
                    <div className="mt-4">
                      <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                        Vehicle Type
                      </label>
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Car className="h-5 w-5 text-emerald-500" />
                        </span>
                        <select
                          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-10 pr-10 py-2 text-neutral-50 appearance-none outline-none"
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
                              stroke="#10B981"
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
                      <div className="mt-4">
                        <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                          Number of People
                        </label>
                        <div className="flex items-center gap-4 mt-2">
                          <button
                            type="button"
                            className="p-2 rounded-full border bg-neutral-800 hover:bg-primary/10 transition disabled:opacity-50 text-emerald-400 font-bold"
                            disabled={numOfPeople <= 1}
                            onClick={() => setNumOfPeople(numOfPeople - 1)}
                            aria-label="Decrease"
                          >
                            -
                          </button>
                          <span className="font-bold text-lg w-10 text-center text-emerald-400">
                            {numOfPeople}
                          </span>
                          <button
                            type="button"
                            className="p-2 rounded-full border bg-neutral-800 hover:bg-primary/10 transition disabled:opacity-50 text-emerald-400 font-bold"
                            disabled={numOfPeople >= maxSeats}
                            onClick={() => setNumOfPeople(numOfPeople + 1)}
                            aria-label="Increase"
                          >
                            +
                          </button>
                          <span className="text-muted-foreground text-xs">
                            (Max {maxSeats} for this vehicle)
                          </span>
                        </div>
                        {numOfPeople > maxSeats && (
                          <Badge variant="destructive" className="mt-2">
                            Too many people for this vehicle type!
                          </Badge>
                        )}
                      </div>
                    )}
                  {comboError && (
                    <Badge variant="destructive" className="mt-2">
                      {comboError}
                    </Badge>
                  )}
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex flex-col gap-1 mt-6">
                    <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                      Pickup location
                    </label>
                    <div className="relative flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 cursor-pointer">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                      <span className="flex-1 text-sm text-neutral-50">
                        {pickup
                          ? `${pickup.name} (${pickup.zoneName})`
                          : "Choose pickup point"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                      Dropoff location
                    </label>
                    <div className="relative flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 cursor-pointer">
                      <Navigation2 className="h-4 w-4 text-emerald-500" />
                      <span className="flex-1 text-sm text-neutral-50">
                        {dropoff
                          ? `${dropoff.name} (${dropoff.zoneName})`
                          : "Choose dropoff point"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                      Pickup time
                    </label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Clock className="h-5 w-5 text-emerald-500" />
                      </span>
                      <select
                        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-10 pr-10 py-2 text-neutral-50 appearance-none outline-none"
                        value={pickupTimeMinutes}
                        onChange={(e) =>
                          setPickupTimeMinutes(Number(e.target.value))
                        }
                      >
                        {pickupOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
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
                            stroke="#10B981"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                  {pickup && dropoff && (
                    <div className="pt-1 text-xs text-neutral-400">
                      <span>Route from </span>
                      <Badge
                        variant="outline"
                        className="mr-1 border-neutral-700 bg-neutral-900 text-neutral-200"
                      >
                        {pickup.zoneName}
                      </Badge>
                      <span>to </span>
                      <Badge
                        variant="outline"
                        className="border-neutral-700 bg-neutral-900 text-neutral-200"
                      >
                        {dropoff.zoneName}
                      </Badge>
                    </div>
                  )}
                  <Button
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-medium text-neutral-950 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500"
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
                      "Submitting…"
                    ) : (
                      <>
                        <SearchIcon className="h-4 w-4" />
                        Submit
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                <h2 className="mb-4 text-xl font-semibold text-neutral-50">
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
                          "rounded-2xl border p-3 cursor-pointer transition-colors " +
                          (isSelected
                            ? "border-emerald-500 bg-neutral-800"
                            : "border-neutral-700 bg-neutral-800/80 hover:border-emerald-500/60")
                        }
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-neutral-50">
                            Alternative #{alt.alternativeNo}
                          </span>
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <Badge
                                variant="outline"
                                className="border-emerald-500 bg-emerald-500/10 text-emerald-400"
                              >
                                Selected
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="border-emerald-500 text-emerald-400"
                            >
                              {alt.legs.length} legs
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-neutral-300">
                          {alt.legs.map((leg: any) => (
                            <div
                              key={leg.seqNo}
                              className="flex items-center gap-2"
                            >
                              <span className="font-mono text-neutral-400">
                                #{leg.seqNo}
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
                    <p className="text-xs text-neutral-400">
                      No alternatives loaded.
                    </p>
                  )}
                </div>
              </>
            )}
          </Card>
        </section>
  <section className="relative flex-1 border-t border-neutral-900 bg-neutral-900 lg:border-t-0 lg:border-l overflow-hidden">
          <MapView center={mapCenter} markers={markers} polyline={polyline} />
          {currentStep === 2 && (
            <Button
              className="fixed bottom-24 right-8 z-50 rounded-2xl bg-emerald-500 py-4 px-8 text-base font-bold text-neutral-950 shadow-lg hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500 flex items-center gap-3 group"
              disabled={isSubmitting || !requestId || !selectedAlternativeNo}
              onClick={handleConfirmAlternative}
            >
              {isSubmitting ? (
                "Confirming…"
              ) : (
                <>
                  Continue
                  <span className="inline-block transition-transform duration-300 ease-in-out group-hover:translate-x-2">
                    &rarr;
                  </span>
                </>
              )}
            </Button>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
