
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import RidesOperationsTable, { RideRow } from "./RidesOperationsTable";

const demoRides: RideRow[] = [
  {
    id: "1",
    passenger: "Alice Blue",
    driver: "John Doe",
    vehicle: "ABC-1234",
    status: "active",
    startedAt: "2025-11-23 09:00",
    price: "€12.00",
  },
  {
    id: "2",
    passenger: "Bob Green",
    driver: "Jane Smith",
    vehicle: "XYZ-5678",
    status: "completed",
    startedAt: "2025-11-22 15:30",
    completedAt: "2025-11-22 16:00",
    price: "€8.50",
  },
  {
    id: "3",
    passenger: "Chris Red",
    driver: "Alex Brown",
    vehicle: "LMN-4321",
    status: "cancelled",
    startedAt: "2025-11-21 12:10",
    price: "€0.00",
  },
  {
    id: "4",
    passenger: "Dana White",
    driver: "Maria Green",
    vehicle: "QRS-8765",
    status: "completed",
    startedAt: "2025-11-20 10:45",
    completedAt: "2025-11-20 11:10",
    price: "€6.75",
  },
];

export default function RidesOperations() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RideRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = demoRides.filter((r) =>
    (tab === "all" || r.status === tab) &&
    (r.passenger.toLowerCase().includes(search.toLowerCase()) ||
      r.driver.toLowerCase().includes(search.toLowerCase()) ||
      r.vehicle.toLowerCase().includes(search.toLowerCase()))
  );

  function handleDetails(row: RideRow) {
    setSelected(row);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Tabs value={tab} onValueChange={setTab} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search by passenger, driver, or vehicle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <Card className="p-0">
        <RidesOperationsTable data={filtered} onDetails={handleDetails} />
      </Card>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ride Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div><b>Passenger:</b> {selected?.passenger}</div>
            <div><b>Driver:</b> {selected?.driver}</div>
            <div><b>Vehicle:</b> {selected?.vehicle}</div>
            <div><b>Status:</b> {selected?.status}</div>
            <div><b>Started At:</b> {selected?.startedAt}</div>
            <div><b>Completed At:</b> {selected?.completedAt || "-"}</div>
            <div><b>Price:</b> {selected?.price}</div>
          </div>
          <DialogFooter>
            <Button onClick={() => setModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
