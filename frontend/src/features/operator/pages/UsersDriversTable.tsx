import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export type DriverRow = {
  id: string;
  name: string;
  email: string;
  age: number;
  country: string;
  verification: "verified" | "pending" | "rejected";
  vehicles: number;
  rating: number;
};

export default function UsersDriversTable({ data }: { data: DriverRow[] }) {
  return (
    <div className="w-full rounded-xl border border-neutral-800/70 bg-neutral-950/50 shadow-lg overflow-hidden">
      <Table className="w-full">
        <TableHeader className="bg-neutral-900/80">
          <TableRow className="border-b border-neutral-800/80">
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Name
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Email
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Age
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Country
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Verification
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              # Vehicles
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Avg. Rating
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
                {row.name}
              </TableCell>
              <TableCell className="text-sm text-neutral-300">
                {row.email}
              </TableCell>
              <TableCell className="text-sm text-neutral-200">
                {row.age}
              </TableCell>
              <TableCell className="text-sm text-neutral-200">
                {row.country}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium border " +
                    (row.verification === "verified"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                      : row.verification === "pending"
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/40"
                      : "bg-rose-500/10 text-rose-300 border-rose-500/40")
                  }
                >
                  {row.verification.charAt(0).toUpperCase() +
                    row.verification.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-neutral-200">
                {row.vehicles}
              </TableCell>
              <TableCell className="text-sm text-neutral-100">
                {row.rating.toFixed(1)}
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
                colSpan={8}
                className="py-6 text-center text-sm text-neutral-500"
              >
                No drivers found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
