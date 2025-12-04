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
  getRideTypes,
  getVehicleTypes,
  type RideType,
  type VehicleType,
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
    active: boolean;
  }) => {
    if (values.id) {
      await updateServiceType(
        values.id!,
        {
          name: values.name,
          description: values.description,
          baseFare: values.baseFare,
          active: values.active,
        }
      );
      toast({ title: "Service type updated" });
    } else {
      await createServiceType({
        name: values.name,
        description: values.description,
        baseFare: values.baseFare,
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
    <div className="min-h-full w-full bg-gray-50 text-gray-900 px-6 py-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Service Types &amp; Profiles
          </h1>
          <p className="text-sm text-gray-600">
            Configure ride service types and allowed combinations between
            services, ride types, and vehicle types.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/80 border border-gray-200 rounded-lg p-1 inline-flex">
            <TabsTrigger
              value="service-types"
              className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 data-[state=active]:bg-black data-[state=active]:text-white transition-colors"
            >
              Service Types
            </TabsTrigger>
            <TabsTrigger
              value="allowed-profiles"
              className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 data-[state=active]:bg-black data-[state=active]:text-white transition-colors"
            >
              Allowed Ride Profiles
            </TabsTrigger>
          </TabsList>

          {/* Service Types tab */}
          <TabsContent value="service-types" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Service Types
              </h2>
              <Button
                onClick={handleAddServiceTypeClick}
                className="bg-black text-white hover:bg-gray-800 rounded-lg px-4 py-2 border-0"
              >
                Add Service Type
              </Button>
            </div>

            {serviceTypesLoading ? (
              <div className="text-sm text-gray-600">
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
              <h2 className="text-lg font-semibold text-gray-900">
                Allowed Ride Profiles
              </h2>
              <Button
                onClick={handleAddAllowedProfileClick}
                className="bg-black text-white hover:bg-gray-800 rounded-lg px-4 py-2 border-0"
              >
                Add Allowed Profile
              </Button>
            </div>

            {allowedProfilesLoading ? (
              <div className="text-sm text-gray-600">
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
  
  const [rideTypes, setRideTypes] = useState<RideType[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(false);

  // Load ride types and vehicle types when dialog opens
  useEffect(() => {
    if (open) {
      const loadData = async () => {
        setLoading(true);
        try {
          const [rideTypesData, vehicleTypesData] = await Promise.all([
            getRideTypes(),
            getVehicleTypes(),
          ]);
          setRideTypes(rideTypesData);
          setVehicleTypes(vehicleTypesData);
        } catch (error) {
          console.error("Failed to load ride types or vehicle types", error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [open]);

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
      <DialogContent className="max-w-lg border border-gray-200 bg-white text-gray-900 shadow-2xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Add Allowed Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label
              htmlFor="ap-service-type"
              className="text-gray-800"
            >
              Service Type
            </Label>
            <select
              id="ap-service-type"
              className="w-full border border-gray-300 rounded-md px-2.5 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500/40"
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
                className="text-gray-800"
              >
                Ride Type
              </Label>
              <select
                id="ap-ride-type"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-0 placeholder:text-gray-9000 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/40"
                value={rideTypeId}
                onChange={(e) =>
                  setRideTypeId(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
                disabled={loading}
              >
                <option value="">Select ride type</option>
                {rideTypes.map((rt) => (
                  <option key={rt.RideTypeId} value={rt.RideTypeId}>
                    {rt.Name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="ap-vehicle-type"
                className="text-gray-800"
              >
                Vehicle Type
              </Label>
              <select
                id="ap-vehicle-type"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-0 placeholder:text-gray-9000 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/40"
                value={vehicleTypeId}
                onChange={(e) =>
                  setVehicleTypeId(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
                disabled={loading}
              >
                <option value="">Select vehicle type</option>
                {vehicleTypes.map((vt) => (
                  <option key={vt.VehicleTypeId} value={vt.VehicleTypeId}>
                    {vt.Name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="ap-profile-name"
              className="text-gray-800"
            >
              Profile Name (optional)
            </Label>
            <Input
              id="ap-profile-name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. bridged_route – hatchback"
              className="border-gray-300 bg-white text-gray-900 placeholder:text-gray-9000 focus-visible:ring-gray-500/40"
            />
          </div>
        </div>

        <DialogFooter className="mt-2 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
            className="border-gray-300 bg-white text-gray-800 hover:bg-gray-100 rounded-lg px-4 py-2"
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
            className="bg-black text-white hover:bg-gray-800 rounded-lg px-4 py-2"
          >
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
