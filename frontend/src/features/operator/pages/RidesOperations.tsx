import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import RidesOperationsTable, { RideRow } from "./RidesOperationsTable";

const demoRides: RideRow[] = [
  {
    id: "1",
    passenger: "Alice Blue",
    driver: "John Doe",
    vehicle: "ABC-1234",
    status: "active",
    startedAt: "2025-11-26 15:30",
    completedAt: undefined,
    price: "€12.50",
  },
  {
    id: "2",
    passenger: "Bob Green",
    driver: "Jane Smith",
    vehicle: "XYZ-9876",
    status: "completed",
    startedAt: "2025-11-26 14:10",
    completedAt: "2025-11-26 14:35",
    price: "€18.20",
  },
  {
    id: "3",
    passenger: "Chris Red",
    driver: "George Brown",
    vehicle: "LMN-4567",
    status: "cancelled",
    startedAt: "2025-11-26 13:00",
    completedAt: undefined,
    price: "€0.00",
  },
];

export default function RidesOperations() {
  const [tab, setTab] =
    useState<"all" | "active" | "completed" | "cancelled">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RideRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = demoRides.filter(
    (r) =>
      (tab === "all" || r.status === tab) &&
      (r.passenger.toLowerCase().includes(search.toLowerCase()) ||
        r.driver.toLowerCase().includes(search.toLowerCase()) ||
        r.vehicle.toLowerCase().includes(search.toLowerCase())),
  );

  function handleDetails(row: RideRow) {
    setSelected(row);
    setModalOpen(true);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-neutral-950 text-neutral-50 px-6 py-6">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50 mb-2">
            Rides &amp; Operations
          </h1>
          <p className="text-sm text-neutral-400">
            Monitor live rides, completed trips, and operational status in real
            time.
          </p>
        </div>

        {/* Filters + table */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Tabs
              value={tab}
              onValueChange={(v) =>
                setTab(v as "all" | "active" | "completed" | "cancelled")
              }
              className="w-full md:w-auto"
            >
              <TabsList className="bg-neutral-900/80 border border-neutral-800 rounded-full p-1 inline-flex">
                <TabsTrigger
                  value="all"
                  className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="active"
                  className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
                >
                  Active
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
                >
                  Completed
                </TabsTrigger>
                <TabsTrigger
                  value="cancelled"
                  className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
                >
                  Cancelled
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Input
              placeholder="Search by passenger, driver, or vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500/40"
            />
          </div>

          <Card className="p-0 rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-lg">
            <RidesOperationsTable data={filtered} onDetails={handleDetails} />
          </Card>
        </div>

        {/* Details dialog */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-lg border border-neutral-800 bg-neutral-900 text-neutral-50 shadow-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Ride Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-neutral-400">Passenger:</span>{" "}
                <span className="text-neutral-100 font-medium">
                  {selected?.passenger}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">Driver:</span>{" "}
                <span className="text-neutral-100 font-medium">
                  {selected?.driver}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">Vehicle:</span>{" "}
                <span className="text-neutral-100 font-medium">
                  {selected?.vehicle}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">Status:</span>{" "}
                <span className="text-neutral-100 font-medium">
                  {selected?.status}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">Started At:</span>{" "}
                <span className="text-neutral-100">
                  {selected?.startedAt}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">Completed At:</span>{" "}
                <span className="text-neutral-100">
                  {selected?.completedAt || "-"}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">Price:</span>{" "}
                <span className="text-neutral-100">{selected?.price}</span>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 rounded-full px-4 py-2"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
