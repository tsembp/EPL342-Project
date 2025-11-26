import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

export default function VehiclesTable({ data }: { data: VehicleRow[] }) {
  return (
    <div className="w-full rounded-xl border border-neutral-800/70 bg-neutral-950/50 shadow-lg overflow-hidden">
      <Table className="w-full">
        <TableHeader className="bg-neutral-900/80">
          <TableRow className="border-b border-neutral-800/80">
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Owner
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Plate
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Type
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Seats
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Cargo
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Status
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              #Enrollments
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              MOT Expiry
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Docs
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400 text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-neutral-950/40">
          {data.map((row) => (
            <TableRow
              key={row.id}
              className="border-b border-neutral-900/80 last:border-0 hover:bg-neutral-900/70 transition-colors"
            >
              <TableCell className="text-sm text-neutral-100">
                {row.owner}
              </TableCell>
              <TableCell className="text-sm text-neutral-100 font-medium">
                {row.plate}
              </TableCell>
              <TableCell className="text-sm text-neutral-200">
                {row.type}
              </TableCell>
              <TableCell className="text-sm text-neutral-200">
                {row.seats}
              </TableCell>
              <TableCell className="text-sm text-neutral-200">
                {row.cargo}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium border " +
                    (row.status === "verified"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                      : row.status === "pending"
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/40"
                      : "bg-rose-500/10 text-rose-300 border-rose-500/40")
                  }
                >
                  {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-neutral-200">
                {row.enrollments}
              </TableCell>
              <TableCell className="text-sm text-neutral-300">
                {row.motExpiry}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium border " +
                    (row.docsStatus === "ok"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                      : row.docsStatus === "expiring"
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/40"
                      : "bg-rose-500/10 text-rose-300 border-rose-500/40")
                  }
                >
                  {row.docsStatus.charAt(0).toUpperCase() +
                    row.docsStatus.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <button className="text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline">
                  View
                </button>
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={10}
                className="py-6 text-center text-sm text-neutral-500"
              >
                No vehicles found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
