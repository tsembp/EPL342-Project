import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ServiceTypesTable, { ServiceTypeRow } from "./ServiceTypesTable";
import AllowedProfilesTable, { AllowedProfileRow } from "./AllowedProfilesTable";
import { useState } from "react";

const demoServiceTypes: ServiceTypeRow[] = [
  { id: "1", name: "Simple Passenger Ride", description: "Standard ride for up to 4 passengers.", active: true },
  { id: "2", name: "Luxury Ride", description: "Premium vehicles for luxury rides.", active: true },
  { id: "3", name: "Light Cargo", description: "Small van for light cargo.", active: false },
];

const demoAllowedProfiles: AllowedProfileRow[] = [
  { id: "1", serviceType: "Simple Passenger Ride", rideType: "vehicle_with_driver", vehicleType: "Sedan", minPrice: 5.0, notes: "Standard" },
  { id: "2", serviceType: "Luxury Ride", rideType: "vehicle_with_driver", vehicleType: "Luxury Car", minPrice: 15.0 },
  { id: "3", serviceType: "Light Cargo", rideType: "vehicle_with_driver", vehicleType: "Van", minPrice: 10.0 },
];

export default function ServiceTypesProfiles() {
  const [tab, setTab] = useState("service-types");
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
            <Button>Add Service Type</Button>
          </div>
          <ServiceTypesTable data={demoServiceTypes} />
        </TabsContent>

        <TabsContent value="allowed-profiles">
          <div className="flex items-center justify-between my-4">
            <h2 className="text-lg font-semibold">Allowed Ride Profiles</h2>
            <Button>Add Allowed Profile</Button>
          </div>
          <AllowedProfilesTable data={demoAllowedProfiles} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
