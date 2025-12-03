import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import VehiclesTable, { VehicleRow } from "./VehiclesTable";
import { fetchAPI } from "@/lib/apiClient";

function mapVehicleFromApi(row: any): VehicleRow {
  // Status mapping
  const rawStatus = String(row.VehicleStatus ?? row.Status ?? "").toLowerCase();
  let status: VehicleRow["status"] = "pending";
  if (rawStatus === "active" || rawStatus === "verified") {
    status = "verified";
  } else if (rawStatus === "rejected" || rawStatus === "inactive") {
    status = "rejected";
  }

  // Docs health mapping
  const rawDocs = String(row.DocsStatus ?? row.DocsHealth ?? "").toLowerCase();
  let docsStatus: VehicleRow["docsStatus"] = "ok";
  if (rawDocs.includes("expir")) {
    docsStatus = "expiring";
  }
  if (rawDocs.includes("expired") || rawDocs.includes("bad")) {
    docsStatus = "expired";
  }

  // MOT expiry formatting
  const motRaw = row.MotExpiry ?? row.MOTExpiry ?? row.NextMotExpiry ?? null;
  let motExpiry = "";
  if (motRaw) {
    const d = new Date(motRaw);
    if (!isNaN(d.getTime())) {
      motExpiry = d.toISOString().slice(0, 10); // YYYY-MM-DD
    }
  }

  return {
    id: String(row.VehicleId ?? row.Id ?? ""),
    owner: String(row.OwnerName ?? row.Owner ?? row.DriverName ?? "Unknown"),
    plate: String(row.PlateNumber ?? row.Plate ?? ""),
    type: String(row.VehicleType ?? row.Type ?? ""),
    seats: Number(row.Seats ?? row.SeatCount ?? 0),
    cargo:
      row.CargoVolume != null
        ? String(row.CargoVolume)
        : String(row.Cargo ?? ""),
    status,
    enrollments: Number(
      row.EnrollmentsCount ?? row.ActiveEnrollments ?? row.NumEnrollments ?? 0
    ),
    motExpiry,
    docsStatus,
  };
}

async function getVehiclesOverview(): Promise<VehicleRow[]> {
  const apiRows = await fetchAPI<any[]>("/operator/vehicles-overview");
  return apiRows.map(mapVehicleFromApi);
}

export default function Vehicles() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "pending" | "risk">("all");

  const {
    data: vehicles = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["operatorVehiclesOverview"],
    queryFn: getVehiclesOverview,
  });

  const matchesSearch = (v: VehicleRow) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      v.owner.toLowerCase().includes(q) ||
      v.plate.toLowerCase().includes(q)
    );
  };

  const filteredAll = vehicles.filter(matchesSearch);
  const pendingVehicles = vehicles.filter(
    (v) => v.status === "pending" && matchesSearch(v)
  );
  const riskVehicles = vehicles.filter(
    (v) => v.docsStatus !== "ok" && matchesSearch(v)
  );

  return (
    <div className="min-h-full w-full bg-gray-50 text-gray-900 px-6 py-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Vehicles &amp; Fleet
          </h1>
          <p className="text-sm text-gray-600">
            Monitor vehicle verification status, document health, and service enrollments.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="bg-white/80 border border-gray-200 rounded-lg p-1 inline-flex">
            <TabsTrigger
              value="all"
              className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 data-[state=active]:bg-black data-[state=active]:text-white transition-colors"
            >
              All Vehicles
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 data-[state=active]:bg-black data-[state=active]:text-white transition-colors"
            >
              Pending Verification
            </TabsTrigger>
            <TabsTrigger
              value="risk"
              className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 data-[state=active]:bg-black data-[state=active]:text-white transition-colors"
            >
              At Risk / Expiring
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search by owner or plate…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs border-gray-300 bg-white text-gray-900 placeholder:text-gray-9000 focus-visible:ring-gray-500/40"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-600 text-sm gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading vehicles…</span>
              </div>
            ) : isError ? (
              <div className="py-10 text-center text-sm text-red-400">
                Failed to load vehicles overview.
              </div>
            ) : (
              <>
                <TabsContent value="all" className="mt-0">
                  <VehiclesTable data={filteredAll} />
                </TabsContent>

                <TabsContent value="pending" className="mt-0">
                  <VehiclesTable data={pendingVehicles} />
                </TabsContent>

                <TabsContent value="risk" className="mt-0">
                  <VehiclesTable data={riskVehicles} />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
