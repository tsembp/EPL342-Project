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
        <Badge className="rounded-lg bg-gray-600/80 text-gray-50 border border-gray-500/70 text-xs">
          Verified
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="rounded-lg bg-rose-700/80 text-rose-50 border border-rose-500/70 text-xs">
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge className="rounded-lg bg-amber-600/80 text-amber-50 border border-amber-500/70 text-xs">
          Pending
        </Badge>
      );
  }
}

function docsBadge(docsStatus: VehicleRow["docsStatus"]) {
  switch (docsStatus) {
    case "expiring":
      return (
        <Badge className="rounded-lg bg-amber-600/80 text-amber-50 border border-amber-500/70 text-xs">
          At risk
        </Badge>
      );
    case "expired":
      return (
        <Badge className="rounded-lg bg-rose-700/80 text-rose-50 border border-rose-500/70 text-xs">
          Expired
        </Badge>
      );
    default:
      return (
        <Badge className="rounded-lg bg-gray-700/80 text-gray-50 border border-gray-500/70 text-xs">
          Ok
        </Badge>
      );
  }
}

export default function VehiclesTable({ data }: VehiclesTableProps) {
  const navigate = useNavigate();

  if (!data.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white/60 px-6 py-10 text-center text-sm text-gray-600">
        No vehicles found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white/60">
      <table className="min-w-full text-sm text-gray-800">
        <thead className="border-b border-gray-200 bg-white/80 text-xs uppercase tracking-wide text-gray-9000">
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
              className="border-b border-gray-200/70 hover:bg-gray-100/40 transition-colors"
            >
              <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                {row.owner}
              </td>
              <td className="px-4 py-3 font-mono text-sm text-gray-900">
                {row.plate}
              </td>
              <td className="px-4 py-3 text-gray-700">{row.type}</td>
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
              <td className="px-4 py-3 text-gray-700">
                {row.motExpiry || "—"}
              </td>
              <td className="px-4 py-3">{docsBadge(row.docsStatus)}</td>
              <td className="px-4 py-3 text-right">
                <Button
                  size="sm"
                  className="h-8 px-3 rounded-lg bg-black hover:bg-gray-800 text-xs font-medium text-white border border-black shadow-sm flex items-center gap-1 ml-auto"
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
