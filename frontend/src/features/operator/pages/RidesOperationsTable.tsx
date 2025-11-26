import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export type RideRow = {
  id: string;
  passenger: string;
  driver: string;
  vehicle: string;
  status: "active" | "completed" | "cancelled";
  startedAt: string;
  completedAt?: string;
  price: string;
};

type Props = {
  data: RideRow[];
  onDetails?: (row: RideRow) => void;
};

export default function RidesOperationsTable({ data, onDetails }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-neutral-800">
          <TableHead className="text-xs font-medium text-neutral-400">
            Passenger
          </TableHead>
          <TableHead className="text-xs font-medium text-neutral-400">
            Driver
          </TableHead>
          <TableHead className="text-xs font-medium text-neutral-400">
            Vehicle
          </TableHead>
          <TableHead className="text-xs font-medium text-neutral-400">
            Status
          </TableHead>
          <TableHead className="text-xs font-medium text-neutral-400">
            Started At
          </TableHead>
          <TableHead className="text-xs font-medium text-neutral-400">
            Completed At
          </TableHead>
          <TableHead className="text-xs font-medium text-neutral-400">
            Price
          </TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow
            key={row.id}
            className="border-b border-neutral-900/60 last:border-b-0 hover:bg-neutral-800/60"
          >
            <TableCell className="text-sm text-neutral-100">
              {row.passenger}
            </TableCell>
            <TableCell className="text-sm text-neutral-100">
              {row.driver}
            </TableCell>
            <TableCell className="text-sm text-neutral-100">
              {row.vehicle}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  row.status === "completed"
                    ? "default"
                    : row.status === "active"
                    ? "secondary"
                    : "destructive"
                }
                className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              >
                {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-neutral-300">
              {row.startedAt}
            </TableCell>
            <TableCell className="text-sm text-neutral-300">
              {row.completedAt || "-"}
            </TableCell>
            <TableCell className="text-sm text-neutral-100">
              {row.price}
            </TableCell>
            <TableCell className="text-right">
              {onDetails ? (
                <button
                  className="text-emerald-400 hover:text-emerald-300 text-xs font-medium"
                  onClick={() => onDetails(row)}
                >
                  Details
                </button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
