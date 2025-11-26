import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ServiceTypeRow } from "./ServiceTypesTable";
import type { AllowedProfileRow } from "./AllowedProfilesTable";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: AllowedProfileRow | null;
  serviceTypes: ServiceTypeRow[];
  onSave: (values: {
    id?: string;
    serviceTypeId: number;
    rideTypeId: number;
    vehicleTypeId: number;
    profileName?: string;
  }) => Promise<void>;
};

export default function AllowedProfileDialog({
  open,
  onOpenChange,
  initial,
  serviceTypes,
  onSave,
}: Props) {
  const [serviceTypeId, setServiceTypeId] = useState<number | undefined>();
  const [rideTypeId, setRideTypeId] = useState<number | undefined>();
  const [vehicleTypeId, setVehicleTypeId] = useState<number | undefined>();
  const [profileName, setProfileName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initial) {
      setServiceTypeId(initial.serviceTypeId);
      setRideTypeId(initial.rideTypeId);
      setVehicleTypeId(initial.vehicleTypeId);
      setProfileName(initial.profileName ?? "");
    } else {
      setServiceTypeId(undefined);
      setRideTypeId(undefined);
      setVehicleTypeId(undefined);
      setProfileName("");
    }
  }, [initial, open]);

  const handleSubmit = async () => {
    if (
      serviceTypeId === undefined ||
      rideTypeId === undefined ||
      vehicleTypeId === undefined
    ) {
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        id: initial?.id,
        serviceTypeId,
        rideTypeId,
        vehicleTypeId,
        profileName: profileName.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border border-neutral-800 bg-neutral-900 text-neutral-50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {initial ? "Edit Allowed Profile" : "Add Allowed Profile"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ap-service-type">Service Type</Label>
            <select
              id="ap-service-type"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none ring-0 placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
              value={serviceTypeId ?? ""}
              onChange={(e) =>
                setServiceTypeId(
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            >
              <option value="">Select service type</option>
              {serviceTypes.map((st) => (
                <option key={st.id} value={Number(st.id)}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ap-ride-type">Ride Type ID</Label>
              <Input
                id="ap-ride-type"
                type="number"
                min={1}
                value={rideTypeId ?? ""}
                onChange={(e) =>
                  setRideTypeId(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                placeholder="e.g. 1"
                className="border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-vehicle-type">Vehicle Type ID</Label>
              <Input
                id="ap-vehicle-type"
                type="number"
                min={1}
                value={vehicleTypeId ?? ""}
                onChange={(e) =>
                  setVehicleTypeId(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                placeholder="e.g. 3"
                className="border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500/40"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ap-profile-name">Profile Name (optional)</Label>
            <Input
              id="ap-profile-name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. 'bridged_route – hatchback'"
              className="border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500/40"
            />
          </div>
        </div>

        <DialogFooter className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              serviceTypeId === undefined ||
              rideTypeId === undefined ||
              vehicleTypeId === undefined
            }
            className="bg-emerald-500 text-neutral-950 hover:bg-emerald-400"
          >
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
