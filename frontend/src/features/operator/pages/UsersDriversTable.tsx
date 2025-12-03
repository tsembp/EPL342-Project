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
    <div className="w-full rounded-xl border border-gray-200/70 bg-white/50 shadow-sm overflow-hidden">
      <Table className="w-full">
        <TableHeader className="bg-white/80">
          <TableRow className="border-b border-gray-200/80">
            <TableHead className="text-xs font-medium uppercase tracking-wide text-gray-600">
              Name
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-gray-600">
              Email
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-gray-600">
              Age
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-gray-600">
              Country
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-gray-600">
              Verification
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-gray-600">
              # Vehicles
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-gray-600">
              Avg. Rating
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-gray-600 text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white/40">
          {data.map((row) => (
            <TableRow
              key={row.id}
              className="border-b border-gray-200/80 last:border-0 hover:bg-white/70 transition-colors"
            >
              <TableCell className="text-sm text-gray-900">
                {row.name}
              </TableCell>
              <TableCell className="text-sm text-gray-700">
                {row.email}
              </TableCell>
              <TableCell className="text-sm text-gray-800">
                {row.age}
              </TableCell>
              <TableCell className="text-sm text-gray-800">
                {row.country}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    "rounded-lg px-2.5 py-0.5 text-[11px] font-medium border " +
                    (row.verification === "verified"
                      ? "bg-gray-50 text-gray-900 border-gray-200"
                      : row.verification === "pending"
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/40"
                      : "bg-rose-500/10 text-rose-300 border-rose-500/40")
                  }
                >
                  {row.verification.charAt(0).toUpperCase() +
                    row.verification.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-800">
                {row.vehicles}
              </TableCell>
              <TableCell className="text-sm text-gray-900">
                {row.rating.toFixed(1)}
              </TableCell>
              <TableCell className="text-right">
                <button className="text-xs font-medium text-gray-400 hover:text-gray-900 hover:underline">
                  View
                </button>
              </TableCell>
            </TableRow>
          ))}

          {data.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={8}
                className="py-6 text-center text-sm text-gray-9000"
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
