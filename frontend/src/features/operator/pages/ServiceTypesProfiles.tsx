import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ServiceTypesTable, { ServiceTypeRow } from "./ServiceTypesTable";
import AllowedProfilesTable, { AllowedProfileRow } from "./AllowedProfilesTable";
import {
  getServiceTypes,
  getAllowedRideProfiles,
  createServiceType,
  updateServiceType,
} from "@/features/operator/api";
import { useToast } from "@/hooks/use-toast";
import ServiceTypeDialog from "./ServiceTypeDialog";

export default function ServiceTypesProfiles() {
  const [tab, setTab] = useState("service-types");

  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRow[]>([]);
  const [serviceTypesLoading, setServiceTypesLoading] = useState(false);

  const [allowedProfiles, setAllowedProfiles] = useState<AllowedProfileRow[]>([]);
  const [allowedProfilesLoading, setAllowedProfilesLoading] = useState(false);

  const [stDialogOpen, setStDialogOpen] = useState(false);
  const [stDialogInitial, setStDialogInitial] = useState<ServiceTypeRow | null>(null);

  const { toast } = useToast();

  // Load service types from backend
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

  const loadAllowedProfiles = async () => {
    try {
      setAllowedProfilesLoading(true);
      const rows = await getAllowedRideProfiles();

      const mapped: AllowedProfileRow[] = rows.map((row: any) => ({
        id: String(row.RideProfileId ?? row.rideProfileId ?? row.id),
        serviceType:
          row.ServiceTypeName ?? row.serviceType ?? row.ServiceType ?? "",
        rideType: row.RideTypeName ?? row.rideType ?? "",
        vehicleType:
          row.VehicleTypeName ?? row.vehicleType ?? row.VehicleType ?? "",
        minPrice: Number(row.MinBasePrice ?? row.MinPrice ?? row.minPrice ?? 0),
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

  const handleSaveServiceType = async (values: {
  id?: string;
  name: string;
  description: string;
  baseFare: number;
  perKm: number;
  perMin: number;
  active: boolean;
}) => {
  try {
    if (values.id) {
      await updateServiceType(values.id, {
        name: values.name,
        description: values.description,
        baseFare: values.baseFare,
        perKm: values.perKm,
        perMin: values.perMin,
        active: values.active,
      });
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
  } catch (err) {
    console.error("Failed to save service type", err);
    toast({
      variant: "destructive",
      title: "Failed to save service type",
      description: "Please try again or contact an administrator.",
    });
    throw err;
  }
};



  const handleAddClick = () => {
    setStDialogInitial(null);
    setStDialogOpen(true);
  };

  const handleEditClick = (row: ServiceTypeRow) => {
    setStDialogInitial(row);
    setStDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="service-types">Service Types</TabsTrigger>
          <TabsTrigger value="allowed-profiles">Allowed Ride Profiles</TabsTrigger>
        </TabsList>

        <TabsContent value="service-types">
          <div className="flex items-center justify-between my-4">
            <h2 className="text-lg font-semibold">Service Types</h2>
            <Button onClick={handleAddClick}>Add Service Type</Button>
          </div>

          {serviceTypesLoading ? (
            <div className="text-sm text-muted-foreground">Loading service types…</div>
          ) : (
            <ServiceTypesTable data={serviceTypes} onEdit={handleEditClick} />
          )}

          <ServiceTypeDialog
            open={stDialogOpen}
            onOpenChange={setStDialogOpen}
            initial={stDialogInitial}
            onSave={handleSaveServiceType}
          />
        </TabsContent>

        <TabsContent value="allowed-profiles">
          <div className="flex items-center justify-between my-4">
            <h2 className="text-lg font-semibold">Allowed Ride Profiles</h2>
            <Button disabled>Add Allowed Profile</Button>
          </div>

          {allowedProfilesLoading ? (
            <div className="text-sm text-muted-foreground">Loading allowed profiles…</div>
          ) : (
            <AllowedProfilesTable data={allowedProfiles} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
