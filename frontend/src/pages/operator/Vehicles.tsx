import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import VehiclesTable, { VehicleRow } from "./VehiclesTable";
import { useState } from "react";

const demoVehicles: VehicleRow[] = [
  { id: "1", owner: "D. Papadopoulos", plate: "KAA123", type: "Sedan", seats: 4, cargo: "300L", status: "verified", enrollments: 2, motExpiry: "2026-01-10", docsStatus: "ok" },
  { id: "2", owner: "A. Ioannou", plate: "ZBB456", type: "SUV", seats: 5, cargo: "500L", status: "pending", enrollments: 1, motExpiry: "2025-12-01", docsStatus: "expiring" },
  { id: "3", owner: "M. Christou", plate: "XCC789", type: "Van", seats: 2, cargo: "1200L", status: "rejected", enrollments: 0, motExpiry: "2024-11-20", docsStatus: "expired" },
];

export default function Vehicles() {
  const [search, setSearch] = useState("");
  // TODO: Add filters and API integration
  return (
    <div className="space-y-6">
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Vehicles</TabsTrigger>
          <TabsTrigger value="pending">Pending Verification</TabsTrigger>
          <TabsTrigger value="risk">At Risk / Expiring</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="flex items-center gap-4 my-4">
            <Input placeholder="Search vehicles..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
            {/* Add filters here */}
          </div>
          <VehiclesTable data={demoVehicles.filter(v => v.owner.toLowerCase().includes(search.toLowerCase()) || v.plate.toLowerCase().includes(search.toLowerCase()))} />
        </TabsContent>
        <TabsContent value="pending">
          <VehiclesTable data={demoVehicles.filter(v => v.status === "pending")} />
        </TabsContent>
        <TabsContent value="risk">
          <VehiclesTable data={demoVehicles.filter(v => v.docsStatus !== "ok")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
