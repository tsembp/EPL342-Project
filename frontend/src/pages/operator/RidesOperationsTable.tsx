import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
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
        <TableRow>
          <TableHead>Passenger</TableHead>
          <TableHead>Driver</TableHead>
          <TableHead>Vehicle</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Started At</TableHead>
          <TableHead>Completed At</TableHead>
          <TableHead>Price</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.passenger}</TableCell>
            <TableCell>{row.driver}</TableCell>
            <TableCell>{row.vehicle}</TableCell>
            <TableCell>
              <Badge variant={row.status === "completed" ? "default" : row.status === "active" ? "secondary" : "destructive"}>
                {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
              </Badge>
            </TableCell>
            <TableCell>{row.startedAt}</TableCell>
            <TableCell>{row.completedAt || "-"}</TableCell>
            <TableCell>{row.price}</TableCell>
            <TableCell>
              {onDetails ? (
                <button className="text-primary underline text-xs" onClick={() => onDetails(row)}>
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
