import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  getDriverVehicles,
  getDriverServiceEnrollments,
  getDriverServiceTypes,
  getAllowedRideProfilesByRole,
  getAllowedRideTypesByRole,
  getValidCombinationsByVehicle,
  createServiceEnrollment,
  cancelDriverServiceEnrollment,
  type Vehicle,
  type DriverServiceEnrollment,
  type ServiceTypeRow,
  type AllowedRideProfileRow,
  type RideTypeRow,
} from "@/features/driver/api";
import { useAuthStore } from "@/lib/store";

import { ClipboardList, CarFront, PlusCircle, Info } from "lucide-react";
import { toast } from "sonner";

export function DriverServicesSection() {
  const queryClient = useQueryClient();
  const { userRole } = useAuthStore();

  // Queries
  const { data: vehiclesData, isLoading: loadingVehicles } = useQuery({
    queryKey: ["driver", "vehicles"],
    queryFn: getDriverVehicles,
  });

  const { data: enrollData, isLoading: loadingEnrollments } = useQuery({
    queryKey: ["driver", "service-enrollments"],
    queryFn: getDriverServiceEnrollments,
  });

  const { data: serviceTypeData, isLoading: loadingServiceTypes } = useQuery({
    queryKey: ["driver", "service-types"],
    queryFn: getDriverServiceTypes,
  });

  // NEW: Get role-based ride profiles
  const { data: rideProfilesData, isLoading: loadingRideProfiles } = useQuery({
    queryKey: ["driver", "allowed-ride-profiles", userRole],
    queryFn: getAllowedRideProfilesByRole,
  });

  const vehicles: Vehicle[] = vehiclesData ?? [];
  const enrollments: DriverServiceEnrollment[] = enrollData?.enrollments ?? [];
  const serviceTypes: ServiceTypeRow[] = serviceTypeData?.serviceTypes ?? [];
  const rideProfiles: AllowedRideProfileRow[] = rideProfilesData?.profiles ?? [];

  // Filter: only approved vehicles with all required docs
  const eligibleVehicles = useMemo(
    () =>
      vehicles.filter(
        (v) => v.IsApproved && v.HasAllRequiredDocsSubmitted
      ),
    [vehicles],
  );

  const [showForm, setShowForm] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string>("");
  const [selectedRideTypeId, setSelectedRideTypeId] = useState<string>("");

  // Get valid combinations when a vehicle is selected
  const { data: validCombosData, isLoading: loadingValidCombos } = useQuery({
    queryKey: ["driver", "valid-combinations", selectedVehicleId],
    queryFn: () => getValidCombinationsByVehicle(selectedVehicleId),
    enabled: !!selectedVehicleId,
  });

  // Extract filtered service types and ride types based on vehicle
  const filteredServiceTypes = validCombosData?.serviceTypes ?? [];
  const filteredRideTypes = validCombosData?.rideTypes ?? [];
  const validCombinations = validCombosData?.validCombinations ?? [];

  // Check if a combination is valid
  const isValidCombination = (serviceTypeId: string, rideTypeId: string) => {
    if (!serviceTypeId || !rideTypeId) return false;
    return validCombinations.some(
      (combo) =>
        combo.serviceTypeId === Number(serviceTypeId) &&
        combo.rideTypeId === Number(rideTypeId)
    );
  };

  const createMutation = useMutation({
    mutationFn: (payload: { vehicleId: string; serviceTypeId: number; rideTypeId: number }) =>
      createServiceEnrollment({
        vehicleId: payload.vehicleId,
        serviceTypeId: payload.serviceTypeId,
        rideTypeId: payload.rideTypeId,
      }),
    onSuccess: () => {
      toast.success("Service enrollment request submitted.");
      setSelectedVehicleId("");
      setSelectedServiceTypeId("");
      setSelectedRideTypeId("");
      setShowForm(false);
      queryClient.invalidateQueries({
        queryKey: ["driver", "service-enrollments"],
      });
    },
    onError: (err: any) => {
      const msg =
        (err?.error as string) ??
        (err?.message as string) ??
        "Failed to submit enrollment.";
      toast.error(msg);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (enrollId: number) => cancelDriverServiceEnrollment(enrollId),
    onSuccess: () => {
      toast.success("Enrollment cancelled.");
      queryClient.invalidateQueries({
        queryKey: ["driver", "service-enrollments"],
      });
    },
    onError: () => {
      toast.error("Unable to cancel this enrollment.");
    },
  });

  const isLoading =
    loadingVehicles || loadingEnrollments || loadingServiceTypes || loadingRideProfiles;

  // Get unique ride type names allowed for this role (from ride profiles)
  const allowedRideTypes = useMemo(() => {
    const types = new Set(rideProfiles.map((p) => p.RideTypeName));
    return Array.from(types).sort();
  }, [rideProfiles]);

  // Reset dependent selections when vehicle changes
  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setSelectedServiceTypeId("");
    setSelectedRideTypeId("");
  };

  // Reset ride type when service type changes
  const handleServiceTypeChange = (serviceTypeId: string) => {
    setSelectedServiceTypeId(serviceTypeId);
    // Clear ride type if the current combination becomes invalid
    if (selectedRideTypeId && !isValidCombination(serviceTypeId, selectedRideTypeId)) {
      setSelectedRideTypeId("");
    }
  };

  const handleSubmit = () => {
    if (!selectedVehicleId || !selectedServiceTypeId || !selectedRideTypeId) {
      toast.error("Please select vehicle, service type, and ride type.");
      return;
    }

    if (!isValidCombination(selectedServiceTypeId, selectedRideTypeId)) {
      toast.error("Invalid combination of service type and ride type for this vehicle.");
      return;
    }

    createMutation.mutate({
      vehicleId: selectedVehicleId,
      serviceTypeId: Number(selectedServiceTypeId),
      rideTypeId: Number(selectedRideTypeId),
    });
  };

  const pending = enrollments.filter((e) => e.Status === "Pending");
  const approved = enrollments.filter((e) => e.Status === "Approved");
  const rejected = enrollments.filter((e) => e.Status === "Rejected");

  return (
    <div className="space-y-4">
      {/* Header / intro card (like your existing My services card) */}
      <Card className="border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
              <ClipboardList className="h-5 w-5 text-black" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                My services
              </h2>
              <p className="mt-1 text-xs text-gray-600">
                Register new services for your approved vehicles and see the
                status of each enrollment.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden rounded-xl border-gray-300 bg-white text-xs font-semibold text-gray-900 hover:bg-gray-50 sm:inline-flex"
            onClick={() => setShowForm((s) => !s)}
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            {showForm ? "Close" : "Add new service"}
          </Button>
        </div>

        <div className="mt-3 flex sm:hidden">
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl border-gray-300 bg-white text-xs font-semibold text-gray-900 hover:bg-gray-50"
            onClick={() => setShowForm((s) => !s)}
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            {showForm ? "Close" : "Add new service"}
          </Button>
        </div>
      </Card>

      {/* Add new service form */}
      {showForm && (
        <Card className="border border-gray-200 bg-white p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
              <CarFront className="h-4 w-4 text-black" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Enroll a vehicle to a service
              </h3>
              <p className="text-xs text-gray-600">
                Only vehicles with all required documents approved can be
                enrolled.
              </p>
            </div>
          </div>

          {/* Role-based ride type info */}
          {allowedRideTypes.length > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-900/30 bg-blue-950/20 p-3">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
              <div className="text-xs text-gray-700">
                <span className="font-medium text-blue-400">
                  {userRole === "company_representative"
                    ? "Company Representatives"
                    : "Drivers"}
                </span>{" "}
                can only enroll vehicles for:{" "}
                <span className="font-semibold text-gray-900">
                  {allowedRideTypes.join(", ")}
                </span>
              </div>
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-gray-600">Loading…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[1fr,1fr,1fr,auto]">
              {/* Vehicle select */}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  Vehicle
                </p>
                <Select
                  value={selectedVehicleId}
                  onValueChange={handleVehicleChange}
                >
                  <SelectTrigger className="h-9 w-full bg-gray-100 text-sm text-gray-900">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-100 text-sm text-gray-900">
                    {eligibleVehicles.length === 0 && (
                      <div className="px-2 py-1 text-xs text-gray-600">
                        No approved vehicles yet.
                      </div>
                    )}
                    {eligibleVehicles.map((v) => (
                      <SelectItem key={v.VehicleId} value={v.VehicleId}>
                        {v.PlateNumber} • {v.Brand} {v.Model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Service type select */}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  Service type
                </p>
                <Select
                  value={selectedServiceTypeId}
                  onValueChange={handleServiceTypeChange}
                  disabled={!selectedVehicleId || loadingValidCombos}
                >
                  <SelectTrigger className="h-9 w-full bg-gray-100 text-sm text-gray-900">
                    <SelectValue placeholder={selectedVehicleId ? "Select service type" : "Select vehicle first"} />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-100 text-sm text-gray-900">
                    {filteredServiceTypes.length === 0 && (
                      <div className="px-2 py-1 text-xs text-gray-600">
                        No valid service types for this vehicle.
                      </div>
                    )}
                    {filteredServiceTypes.map((st) => {
                      const baseFareNumber = Number(st.BaseFare);
                      const baseFareLabel = Number.isFinite(baseFareNumber)
                        ? baseFareNumber.toFixed(2)
                        : String(st.BaseFare);

                      return (
                        <SelectItem
                          key={st.ServiceTypeId}
                          value={String(st.ServiceTypeId)}
                        >
                          {st.Name} (base {baseFareLabel})
                        </SelectItem>
                      );
                    })}

                  </SelectContent>
                </Select>
              </div>

              {/* Ride type select */}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  Ride type
                </p>
                <Select
                  value={selectedRideTypeId}
                  onValueChange={setSelectedRideTypeId}
                  disabled={!selectedVehicleId || !selectedServiceTypeId || loadingValidCombos}
                >
                  <SelectTrigger className="h-9 w-full bg-gray-100 text-sm text-gray-900">
                    <SelectValue placeholder={
                      !selectedVehicleId ? "Select vehicle first" :
                      !selectedServiceTypeId ? "Select service type first" :
                      "Select ride type"
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-100 text-sm text-gray-900">
                    {filteredRideTypes.length === 0 && (
                      <div className="px-2 py-1 text-xs text-gray-600">
                        No valid ride types for this combination.
                      </div>
                    )}
                    {filteredRideTypes
                      .filter((rt) => isValidCombination(selectedServiceTypeId, String(rt.RideTypeId)))
                      .map((rt) => (
                        <SelectItem
                          key={rt.RideTypeId}
                          value={String(rt.RideTypeId)}
                        >
                          {rt.Name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Submit button */}
              <div className="flex items-end">
                <Button
                  className="w-full rounded-xl bg-black text-sm font-semibold text-gray-900 hover:bg-black"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || isLoading}
                >
                  {createMutation.isPending ? "Submitting…" : "Enroll"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Enrollments list */}
      <Card className="border border-gray-200 bg-white p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Current enrollments
          </h3>
          <p className="text-[11px] text-gray-600">
            Pending • Approved • Rejected
          </p>
        </div>

        {enrollments.length === 0 ? (
          <p className="text-xs text-gray-500">
            You have no service enrollments yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {enrollments.map((e) => (
              <li
                key={e.EnrollId}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-100 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {e.ServiceTypeName ?? "Service"} • {e.VehiclePlate}
                  </p>
                  <p className="text-[11px] text-gray-600">
                    {e.RideTypeName ?? "Ride type"} · Enrollment #{e.EnrollId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={e.Status} />
                  {e.Status === "Pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-lg border-gray-300 bg-gray-100 px-2 text-[11px] text-gray-800 hover:bg-gray-200"
                      onClick={() => cancelMutation.mutate(e.EnrollId)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let classes =
    "border-gray-300 bg-gray-100 text-gray-800 border px-2 py-0.5 text-[11px]";
  if (status === "Approved") {
    classes =
      "border-black/40 bg-black/10 text-black border px-2 py-0.5 text-[11px]";
  } else if (status === "Pending") {
    classes =
      "border-amber-500/40 bg-amber-500/10 text-amber-300 border px-2 py-0.5 text-[11px]";
  } else if (status === "Rejected") {
    classes =
      "border-rose-500/40 bg-rose-500/10 text-rose-300 border px-2 py-0.5 text-[11px]";
  }

  return (
    <Badge variant="outline" className={classes}>
      {status}
    </Badge>
  );
}
