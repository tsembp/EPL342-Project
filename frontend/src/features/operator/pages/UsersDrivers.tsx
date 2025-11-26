import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import UsersDriversTable, { DriverRow } from "./UsersDriversTable";

const demoDrivers: DriverRow[] = [
  {
    id: "1",
    name: "D. Papadopoulos",
    email: "d.papadopoulos@email.com",
    age: 34,
    country: "CY",
    verification: "verified",
    vehicles: 2,
    rating: 4.8,
  },
  {
    id: "2",
    name: "A. Ioannou",
    email: "a.ioannou@email.com",
    age: 29,
    country: "GR",
    verification: "pending",
    vehicles: 1,
    rating: 4.5,
  },
  {
    id: "3",
    name: "M. Christou",
    email: "m.christou@email.com",
    age: 41,
    country: "CY",
    verification: "rejected",
    vehicles: 0,
    rating: 3.9,
  },
];

export default function UsersDrivers() {
  const [search, setSearch] = useState("");

  const filteredDrivers = demoDrivers.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-neutral-950 text-neutral-50 px-6 py-6">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50 mb-2">
            Users &amp; Drivers
          </h1>
          <p className="text-sm text-neutral-400">
            Manage platform users, verify drivers, and review their activity.
          </p>
        </div>

        <Tabs defaultValue="drivers">
          <TabsList className="bg-neutral-900/80 border border-neutral-800 rounded-full p-1 inline-flex">
            <TabsTrigger
              value="all"
              className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
            >
              All Users
            </TabsTrigger>
            <TabsTrigger
              value="drivers"
              className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
            >
              Drivers
            </TabsTrigger>
            <TabsTrigger
              value="passengers"
              className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
            >
              Passengers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/50 px-4 py-6 text-sm text-neutral-500">
              All Users table – TODO
            </div>
          </TabsContent>

          <TabsContent value="drivers" className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search drivers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500/40"
              />
              {/* Future filters (country, verification, rating) */}
            </div>

            <UsersDriversTable data={filteredDrivers} />
          </TabsContent>

          <TabsContent value="passengers" className="mt-4">
            <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/50 px-4 py-6 text-sm text-neutral-500">
              Passengers table – TODO
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
