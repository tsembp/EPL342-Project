import { useEffect, useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ServiceTypesTable, { ServiceTypeRow } from "./ServiceTypesTable";
import AllowedProfilesTable, {
  AllowedProfileRow,
} from "./AllowedProfilesTable";
import {
  getServiceTypes,
  getAllowedRideProfiles,
  createServiceType,
  updateServiceType,
  createAllowedRideProfile,
} from "@/features/operator/api";
import { useToast } from "@/hooks/use-toast";
import ServiceTypeDialog from "./ServiceTypeDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ServiceTypesProfiles() {
  const [tab, setTab] = useState("service-types");

  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRow[]>([]);
  const [serviceTypesLoading, setServiceTypesLoading] = useState(false);

  const [allowedProfiles, setAllowedProfiles] = useState<AllowedProfileRow[]>(
    [],
  );
  const [allowedProfilesLoading, setAllowedProfilesLoading] =
    useState(false);

  const [stDialogOpen, setStDialogOpen] = useState(false);
  const [stDialogInitial, setStDialogInitial] =
    useState<ServiceTypeRow | null>(null);

  const [apDialogOpen, setApDialogOpen] = useState(false);

  const { toast } = useToast();

  // ─────────────────────────────────────────────
  // Load service types
  // ─────────────────────────────────────────────
  const loadServiceTypes = async () => {
    try {
      setServiceTypesLoading(true);
      const rows = await getServiceTypes();

      const mapped: ServiceTypeRow[] = rows.map((row: any) => ({
        id: String(row.ServiceTypeId ?? row.serviceTypeId ?? row.id),
        name: row.Name ?? row.name ?? "",
        description: row.Description ?? row.description ?? "",
        baseFare: Number(row.BaseFare ?? row.baseFare ?? 0),
        perKm: Number(row.PerKm ?? row.perKm ?? 0),
        perMin: Number(row.PerMin ?? row.perMin ?? 0),
        active:
          row.IsActive === true ||
          row.IsActive === 1 ||
          row.Active === true ||
          row.Active === 1 ||
          row.active === true,
      }));

      setServiceTypes(mapped);
    } catch (err) {
      console.error("Failed to load service types", err);
      toast({
        variant: "destructive",
        title: "Failed to load service types",
        description: "Please try again or contact an administrator.",
      });
    } finally {
      setServiceTypesLoading(false);
    }
  };

  useEffect(() => {
    loadServiceTypes();
  }, [toast]);

  // ─────────────────────────────────────────────
  // Load allowed ride profiles
  // ─────────────────────────────────────────────
  const loadAllowedProfiles = async () => {
    try {
      setAllowedProfilesLoading(true);
      const rows = await getAllowedRideProfiles();

      const mapped: AllowedProfileRow[] = rows.map((row: any) => ({
        id: String(
          row.AllowedProfileId ??
            row.allowedProfileId ??
            row.AllowedRideProfileId ??
            row.id,
        ),
        serviceTypeId: Number(
          row.ServiceTypeId ??
            row.serviceTypeId ??
            row.serviceTypeID ??
            0,
        ),
        rideTypeId: Number(
          row.RideTypeId ??
            row.rideTypeId ??
            row.rideTypeID ??
            0,
        ),
        vehicleTypeId: Number(
          row.VehicleTypeId ??
            row.vehicleTypeId ??
            row.vehicleTypeID ??
            0,
        ),
        serviceType:
          row.ServiceTypeName ??
          row.serviceType ??
          row.ServiceType ??
          "",
        rideType: row.RideTypeName ?? row.rideType ?? "",
        vehicleType:
          row.VehicleTypeName ??
          row.vehicleType ??
          row.VehicleType ??
          "",
        minPrice: Number(
          row.MinBasePrice ?? row.MinPrice ?? row.minPrice ?? 0,
        ),
        notes: row.Notes ?? row.notes ?? undefined,
      }));

      setAllowedProfiles(mapped);
    } catch (err) {
      console.error("Failed to load allowed ride profiles", err);
      toast({
        variant: "destructive",
        title: "Failed to load allowed ride profiles",
        description: "Please try again or contact an administrator.",
      });
    } finally {
      setAllowedProfilesLoading(false);
    }
  };

  useEffect(() => {
    loadAllowedProfiles();
  }, [toast]);

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────
  const handleAddServiceTypeClick = () => {
    setStDialogInitial(null);
    setStDialogOpen(true);
  };

  const handleEditServiceTypeClick = (row: ServiceTypeRow) => {
    setStDialogInitial(row);
    setStDialogOpen(true);
  };

  const handleSaveServiceType = async (values: {
    id?: string;
    name: string;
    description: string;
    baseFare: number;
    perKm: number;
    perMin: number;
    active: boolean;
  }) => {
    if (values.id) {
      await updateServiceType(
        values.id!,
        {
          name: values.name,
          description: values.description,
          baseFare: values.baseFare,
          perKm: values.perKm,
          perMin: values.perMin,
          active: values.active,
        }
      );
      toast({ title: "Service type updated" });
    } else {
      await createServiceType({
        name: values.name,
        description: values.description,
        baseFare: values.baseFare,
        perKm: values.perKm,
        perMin: values.perMin,
        active: values.active,
        validFrom: null,
        validTo: null,
      });
      toast({ title: "Service type created" });
    }

    await loadServiceTypes();
  };

  const handleAddAllowedProfileClick = () => {
    setApDialogOpen(true);
  };

  const handleSaveAllowedProfile = async (values: {
    serviceTypeId: number;
    rideTypeId: number;
    vehicleTypeId: number;
    profileName?: string;
  }) => {
    await createAllowedRideProfile(values);
    toast({ title: "Allowed ride profile created" });
    await loadAllowedProfiles();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-neutral-950 text-neutral-50 px-6 py-6">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50 mb-2">
            Service Types &amp; Profiles
          </h1>
          <p className="text-sm text-neutral-400">
            Configure ride service types and allowed combinations between
            services, ride types, and vehicle types.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-neutral-900/80 border border-neutral-800 rounded-full p-1 inline-flex">
            <TabsTrigger
              value="service-types"
              className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
            >
              Service Types
            </TabsTrigger>
            <TabsTrigger
              value="allowed-profiles"
              className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
            >
              Allowed Ride Profiles
            </TabsTrigger>
          </TabsList>

          {/* Service Types tab */}
          <TabsContent value="service-types" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-50">
                Service Types
              </h2>
              <Button
                onClick={handleAddServiceTypeClick}
                className="bg-emerald-500 text-neutral-950 hover:bg-emerald-400 rounded-full px-4 py-2 border-0"
              >
                Add Service Type
              </Button>
            </div>

            {serviceTypesLoading ? (
              <div className="text-sm text-neutral-400">
                Loading service types…
              </div>
            ) : (
              <ServiceTypesTable
                data={serviceTypes}
                onEdit={handleEditServiceTypeClick}
              />
            )}

            <ServiceTypeDialog
              open={stDialogOpen}
              onOpenChange={setStDialogOpen}
              initial={stDialogInitial}
              onSave={handleSaveServiceType}
            />
          </TabsContent>

          {/* Allowed Ride Profiles tab */}
          <TabsContent
            value="allowed-profiles"
            className="mt-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-50">
                Allowed Ride Profiles
              </h2>
              <Button
                onClick={handleAddAllowedProfileClick}
                className="bg-emerald-500 text-neutral-950 hover:bg-emerald-400 rounded-full px-4 py-2 border-0"
              >
                Add Allowed Profile
              </Button>
            </div>

            {allowedProfilesLoading ? (
              <div className="text-sm text-neutral-400">
                Loading allowed profiles…
              </div>
            ) : (
              <AllowedProfilesTable data={allowedProfiles} />
            )}

            <AllowedProfileDialog
              open={apDialogOpen}
              onOpenChange={setApDialogOpen}
              serviceTypes={serviceTypes}
              onSave={handleSaveAllowedProfile}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Inline dialog for creating Allowed Ride Profile
// ─────────────────────────────────────────────

function AllowedProfileDialog({
  open,
  onOpenChange,
  serviceTypes,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceTypes: ServiceTypeRow[];
  onSave: (values: {
    serviceTypeId: number;
    rideTypeId: number;
    vehicleTypeId: number;
    profileName?: string;
  }) => Promise<void>;
}) {
  const [serviceTypeId, setServiceTypeId] = useState<number | "">("");
  const [rideTypeId, setRideTypeId] = useState<number | "">("");
  const [vehicleTypeId, setVehicleTypeId] = useState<number | "">("");
  const [profileName, setProfileName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setServiceTypeId("");
      setRideTypeId("");
      setVehicleTypeId("");
      setProfileName("");
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (serviceTypeId === "" || rideTypeId === "" || vehicleTypeId === "") {
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        serviceTypeId: Number(serviceTypeId),
        rideTypeId: Number(rideTypeId),
        vehicleTypeId: Number(vehicleTypeId),
        profileName: profileName.trim() || undefined,
      });
      handleClose(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg border border-neutral-800 bg-neutral-900 text-neutral-50 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Add Allowed Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label
              htmlFor="ap-service-type"
              className="text-neutral-200"
            >
              Service Type
            </Label>
            <select
              id="ap-service-type"
              className="w-full border border-neutral-700 rounded-md px-2.5 py-2 text-sm bg-neutral-900 text-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              value={serviceTypeId}
              onChange={(e) =>
                setServiceTypeId(
                  e.target.value ? Number(e.target.value) : "",
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
            <div className="space-y-1">
              <Label
                htmlFor="ap-ride-type"
                className="text-neutral-200"
              >
                Ride Type ID
              </Label>
              <Input
                id="ap-ride-type"
                type="number"
                min={1}
                value={rideTypeId}
                onChange={(e) =>
                  setRideTypeId(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
                placeholder="e.g. 1"
                className="border-neutral-700 bg-neutral-900 text-neutral-50 focus-visible:ring-emerald-500/40"
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="ap-vehicle-type"
                className="text-neutral-200"
              >
                Vehicle Type ID
              </Label>
              <Input
                id="ap-vehicle-type"
                type="number"
                min={1}
                value={vehicleTypeId}
                onChange={(e) =>
                  setVehicleTypeId(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
                placeholder="e.g. 3"
                className="border-neutral-700 bg-neutral-900 text-neutral-50 focus-visible:ring-emerald-500/40"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="ap-profile-name"
              className="text-neutral-200"
            >
              Profile Name (optional)
            </Label>
            <Input
              id="ap-profile-name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. bridged_route – hatchback"
              className="border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500/40"
            />
          </div>
        </div>

        <DialogFooter className="mt-2 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
            className="border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 rounded-lg px-4 py-2"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              serviceTypeId === "" ||
              rideTypeId === "" ||
              vehicleTypeId === ""
            }
            className="bg-emerald-500 text-neutral-950 hover:bg-emerald-400 rounded-full px-4 py-2"
          >
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
