import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import UsersDriversTable, { DriverRow } from "./UsersDriversTable";
import { useState } from "react";

const demoDrivers: DriverRow[] = [
  { id: "1", name: "D. Papadopoulos", email: "d.papadopoulos@email.com", age: 34, country: "CY", verification: "verified", vehicles: 2, rating: 4.8 },
  { id: "2", name: "A. Ioannou", email: "a.ioannou@email.com", age: 29, country: "GR", verification: "pending", vehicles: 1, rating: 4.5 },
  { id: "3", name: "M. Christou", email: "m.christou@email.com", age: 41, country: "CY", verification: "rejected", vehicles: 0, rating: 3.9 },
];

export default function UsersDrivers() {
  const [search, setSearch] = useState("");
  // TODO: Add filters and API integration
  return (
    <div className="space-y-6">
      <Tabs defaultValue="drivers">
        <TabsList>
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="passengers">Passengers</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="my-4">All Users table – TODO</div>
        </TabsContent>
        <TabsContent value="drivers">
          <div className="flex items-center gap-4 my-4">
            <Input placeholder="Search drivers..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
            {/* Add filters here */}
          </div>
          <UsersDriversTable data={demoDrivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))} />
        </TabsContent>
        <TabsContent value="passengers">
          <div className="my-4">Passengers table – TODO</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
