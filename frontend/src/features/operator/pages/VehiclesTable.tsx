// src/features/operator/pages/VehiclesTable.tsx
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export type VehicleRow = {
  id: string;
  owner: string;
  plate: string;
  type: string;
  seats: number;
  cargo: string;
  status: "pending" | "verified" | "rejected";
  enrollments: number;
  motExpiry: string;
  docsStatus: "ok" | "expiring" | "expired";
};

interface VehiclesTableProps {
  data: VehicleRow[];
}

function statusBadge(status: VehicleRow["status"]) {
  switch (status) {
    case "verified":
      return (
        <Badge className="rounded-full bg-emerald-600/80 text-emerald-50 border border-emerald-500/70 text-xs">
          Verified
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="rounded-full bg-rose-700/80 text-rose-50 border border-rose-500/70 text-xs">
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge className="rounded-full bg-amber-600/80 text-amber-50 border border-amber-500/70 text-xs">
          Pending
        </Badge>
      );
  }
}

function docsBadge(docsStatus: VehicleRow["docsStatus"]) {
  switch (docsStatus) {
    case "expiring":
      return (
        <Badge className="rounded-full bg-amber-600/80 text-amber-50 border border-amber-500/70 text-xs">
          At risk
        </Badge>
      );
    case "expired":
      return (
        <Badge className="rounded-full bg-rose-700/80 text-rose-50 border border-rose-500/70 text-xs">
          Expired
        </Badge>
      );
    default:
      return (
        <Badge className="rounded-full bg-emerald-700/80 text-emerald-50 border border-emerald-500/70 text-xs">
          Ok
        </Badge>
      );
  }
}

export default function VehiclesTable({ data }: VehiclesTableProps) {
  const navigate = useNavigate();

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 px-6 py-10 text-center text-sm text-neutral-400">
        No vehicles found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/60">
      <table className="min-w-full text-sm text-neutral-200">
        <thead className="border-b border-neutral-800 bg-neutral-900/80 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3 text-left">Owner</th>
            <th className="px-4 py-3 text-left">Plate</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-right">Seats</th>
            <th className="px-4 py-3 text-right">Cargo</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">#Enrollments</th>
            <th className="px-4 py-3 text-left">MOT Expiry</th>
            <th className="px-4 py-3 text-left">Docs</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id}
              className="border-b border-neutral-800/70 hover:bg-neutral-800/40 transition-colors"
            >
              <td className="px-4 py-3 whitespace-nowrap text-neutral-100">
                {row.owner}
              </td>
              <td className="px-4 py-3 font-mono text-sm text-neutral-50">
                {row.plate}
              </td>
              <td className="px-4 py-3 text-neutral-300">{row.type}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {row.seats}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {row.cargo}
              </td>
              <td className="px-4 py-3">{statusBadge(row.status)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {row.enrollments}
              </td>
              <td className="px-4 py-3 text-neutral-300">
                {row.motExpiry || "—"}
              </td>
              <td className="px-4 py-3">{docsBadge(row.docsStatus)}</td>
              <td className="px-4 py-3 text-right">
                <Button
                  size="sm"
                  className="h-8 px-3 rounded-full bg-emerald-500/95 hover:bg-emerald-400 text-xs font-medium text-emerald-950 border border-emerald-300 shadow-sm flex items-center gap-1 ml-auto"
                  onClick={() =>
                    navigate(
                      `/operator/documents?vehicleId=${encodeURIComponent(
                        row.id,
                      )}`,
                    )
                  }
                >
                  <FileText className="h-3 w-3" />
                  <span>View docs</span>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
