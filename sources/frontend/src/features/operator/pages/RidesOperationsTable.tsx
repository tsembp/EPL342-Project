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
        <TableRow className="border-b border-gray-200">
          <TableHead className="text-xs font-medium text-gray-600">
            Passenger
          </TableHead>
          <TableHead className="text-xs font-medium text-gray-600">
            Driver
          </TableHead>
          <TableHead className="text-xs font-medium text-gray-600">
            Vehicle
          </TableHead>
          <TableHead className="text-xs font-medium text-gray-600">
            Status
          </TableHead>
          <TableHead className="text-xs font-medium text-gray-600">
            Started At
          </TableHead>
          <TableHead className="text-xs font-medium text-gray-600">
            Completed At
          </TableHead>
          <TableHead className="text-xs font-medium text-gray-600">
            Price
          </TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow
            key={row.id}
            className="border-b border-gray-200/60 last:border-b-0 hover:bg-gray-100/60"
          >
            <TableCell className="text-sm text-gray-900">
              {row.passenger}
            </TableCell>
            <TableCell className="text-sm text-gray-900">
              {row.driver}
            </TableCell>
            <TableCell className="text-sm text-gray-900">
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
                className="rounded-lg px-2.5 py-0.5 text-[11px] font-medium"
              >
                {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-gray-700">
              {row.startedAt}
            </TableCell>
            <TableCell className="text-sm text-gray-700">
              {row.completedAt || "-"}
            </TableCell>
            <TableCell className="text-sm text-gray-900">
              {row.price}
            </TableCell>
            <TableCell className="text-right">
              {onDetails ? (
                <button
                  className="text-gray-400 hover:text-gray-900 text-xs font-medium"
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
