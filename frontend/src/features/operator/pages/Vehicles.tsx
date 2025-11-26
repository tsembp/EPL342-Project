import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import VehiclesTable, { VehicleRow } from "./VehiclesTable";

const demoVehicles: VehicleRow[] = [
  {
    id: "1",
    owner: "D. Papadopoulos",
    plate: "KAA123",
    type: "Sedan",
    seats: 4,
    cargo: "300L",
    status: "verified",
    enrollments: 2,
    motExpiry: "2026-01-10",
    docsStatus: "ok",
  },
  {
    id: "2",
    owner: "A. Ioannou",
    plate: "ZBB456",
    type: "SUV",
    seats: 5,
    cargo: "500L",
    status: "pending",
    enrollments: 1,
    motExpiry: "2025-12-01",
    docsStatus: "expiring",
  },
  {
    id: "3",
    owner: "M. Christou",
    plate: "XCC789",
    type: "Van",
    seats: 2,
    cargo: "1200L",
    status: "rejected",
    enrollments: 0,
    motExpiry: "2024-11-20",
    docsStatus: "expired",
  },
];

export default function Vehicles() {
  const [search, setSearch] = useState("");

  const filteredAll = demoVehicles.filter(
    (v) =>
      v.owner.toLowerCase().includes(search.toLowerCase()) ||
      v.plate.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-neutral-950 text-neutral-50 px-6 py-6">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50 mb-2">
            Vehicles &amp; Fleet
          </h1>
          <p className="text-sm text-neutral-400">
            Monitor vehicle verification status, document health, and service enrollments.
          </p>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="bg-neutral-900/80 border border-neutral-800 rounded-full p-1 inline-flex">
            <TabsTrigger
              value="all"
              className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
            >
              All Vehicles
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
            >
              Pending Verification
            </TabsTrigger>
            <TabsTrigger
              value="risk"
              className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
            >
              At Risk / Expiring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search by owner or plate…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500/40"
              />
              {/* Future filters (vehicle type, status, docs) can go here */}
            </div>

            <VehiclesTable data={filteredAll} />
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            <VehiclesTable
              data={demoVehicles.filter((v) => v.status === "pending")}
            />
          </TabsContent>

          <TabsContent value="risk" className="mt-4">
            <VehiclesTable
              data={demoVehicles.filter((v) => v.docsStatus !== "ok")}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
