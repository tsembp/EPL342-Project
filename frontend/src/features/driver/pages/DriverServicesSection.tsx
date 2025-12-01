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
  createServiceEnrollment,
  cancelDriverServiceEnrollment,
  type Vehicle,
  type DriverServiceEnrollment,
  type ServiceTypeRow,
} from "@/features/driver/api";

import { ClipboardList, CarFront, PlusCircle } from "lucide-react";
import { toast } from "sonner";

export function DriverServicesSection() {
  const queryClient = useQueryClient();

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

  const vehicles: Vehicle[] = vehiclesData ?? [];
  const enrollments: DriverServiceEnrollment[] = enrollData?.enrollments ?? [];
  const serviceTypes: ServiceTypeRow[] = serviceTypeData?.serviceTypes ?? [];

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

  const createMutation = useMutation({
    mutationFn: (payload: { vehicleId: string; serviceTypeId: number }) =>
      createServiceEnrollment({
        vehicleId: payload.vehicleId,
        serviceTypeId: payload.serviceTypeId,
      }),
    onSuccess: () => {
      toast.success("Service enrollment request submitted.");
      setSelectedVehicleId("");
      setSelectedServiceTypeId("");
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
    loadingVehicles || loadingEnrollments || loadingServiceTypes;

  const handleSubmit = () => {
    if (!selectedVehicleId || !selectedServiceTypeId) {
      toast.error("Select both a vehicle and a service type.");
      return;
    }

    createMutation.mutate({
      vehicleId: selectedVehicleId,
      serviceTypeId: Number(selectedServiceTypeId),
    });
  };

  const pending = enrollments.filter((e) => e.Status === "Pending");
  const approved = enrollments.filter((e) => e.Status === "Approved");
  const rejected = enrollments.filter((e) => e.Status === "Rejected");

  return (
    <div className="space-y-4">
      {/* Header / intro card (like your existing My services card) */}
      <Card className="border border-neutral-800 bg-neutral-900/80 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900">
              <ClipboardList className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-50">
                My services
              </h2>
              <p className="mt-1 text-xs text-neutral-400">
                Register new services for your approved vehicles and see the
                status of each enrollment.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden rounded-xl border-neutral-700 bg-neutral-900 text-xs font-semibold text-neutral-100 hover:bg-neutral-800 sm:inline-flex"
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
            className="w-full rounded-xl border-neutral-700 bg-neutral-900 text-xs font-semibold text-neutral-100 hover:bg-neutral-800"
            onClick={() => setShowForm((s) => !s)}
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            {showForm ? "Close" : "Add new service"}
          </Button>
        </div>
      </Card>

      {/* Add new service form */}
      {showForm && (
        <Card className="border border-neutral-800 bg-neutral-900/80 p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900">
              <CarFront className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-50">
                Enroll a vehicle to a service
              </h3>
              <p className="text-xs text-neutral-400">
                Only vehicles with all required documents approved can be
                enrolled.
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-neutral-400">Loading…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[1.5fr,1.5fr,auto]">
              {/* Vehicle select */}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Vehicle
                </p>
                <Select
                  value={selectedVehicleId}
                  onValueChange={setSelectedVehicleId}
                >
                  <SelectTrigger className="h-9 w-full bg-neutral-900 text-sm text-neutral-50">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 text-sm text-neutral-50">
                    {eligibleVehicles.length === 0 && (
                      <div className="px-2 py-1 text-xs text-neutral-400">
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
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Service type
                </p>
                <Select
                  value={selectedServiceTypeId}
                  onValueChange={setSelectedServiceTypeId}
                >
                  <SelectTrigger className="h-9 w-full bg-neutral-900 text-sm text-neutral-50">
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 text-sm text-neutral-50">
                    {serviceTypes.length === 0 && (
                      <div className="px-2 py-1 text-xs text-neutral-400">
                        No active service types configured.
                      </div>
                    )}
                    {serviceTypes.map((st) => {
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

              {/* Submit button */}
              <div className="flex items-end">
                <Button
                  className="w-full rounded-xl bg-emerald-500 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
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
      <Card className="border border-neutral-800 bg-neutral-900/80 p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-50">
            Current enrollments
          </h3>
          <p className="text-[11px] text-neutral-400">
            Pending • Approved • Rejected
          </p>
        </div>

        {enrollments.length === 0 ? (
          <p className="text-xs text-neutral-500">
            You have no service enrollments yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {enrollments.map((e) => (
              <li
                key={e.EnrollId}
                className="flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-50">
                    {e.ServiceTypeName ?? "Service"} • {e.VehiclePlate}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {e.RideTypeName ?? "Ride type"} · Enrollment #{e.EnrollId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={e.Status} />
                  {e.Status === "Pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-lg border-neutral-700 bg-neutral-900 px-2 text-[11px] text-neutral-200 hover:bg-neutral-800"
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
    "border-neutral-700 bg-neutral-900 text-neutral-200 border px-2 py-0.5 text-[11px]";
  if (status === "Approved") {
    classes =
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 border px-2 py-0.5 text-[11px]";
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
