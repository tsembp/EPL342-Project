import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Owner</TableHead>
          <TableHead>Plate</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Seats</TableHead>
          <TableHead>Cargo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>#Enrollments</TableHead>
          <TableHead>MOT Expiry</TableHead>
          <TableHead>Docs</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.owner}</TableCell>
            <TableCell>{row.plate}</TableCell>
            <TableCell>{row.type}</TableCell>
            <TableCell>{row.seats}</TableCell>
            <TableCell>{row.cargo}</TableCell>
            <TableCell>
              <Badge variant={row.status === "verified" ? "default" : row.status === "pending" ? "secondary" : "destructive"}>
                {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
              </Badge>
            </TableCell>
            <TableCell>{row.enrollments}</TableCell>
            <TableCell>{row.motExpiry}</TableCell>
            <TableCell>
              <Badge variant={row.docsStatus === "ok" ? "default" : row.docsStatus === "expiring" ? "secondary" : "destructive"}>
                {row.docsStatus.charAt(0).toUpperCase() + row.docsStatus.slice(1)}
              </Badge>
            </TableCell>
            <TableCell>
              {/* Row actions: View, Verify, Reject */}
              <button className="text-primary underline text-xs">View</button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
