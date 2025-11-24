import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export type EnrollmentRow = {
  id: string;
  driver: string;
  vehicle: string;
  serviceType: string;
  rideType: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
};

type Props = {
  data: EnrollmentRow[];
  onReview?: (row: EnrollmentRow) => void;
};

export default function EnrollmentsTable({ data, onReview }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Driver</TableHead>
          <TableHead>Vehicle</TableHead>
          <TableHead>Service Type</TableHead>
          <TableHead>Ride Type</TableHead>
          <TableHead>Requested At</TableHead>
          <TableHead>Status</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.driver}</TableCell>
            <TableCell>{row.vehicle}</TableCell>
            <TableCell>{row.serviceType}</TableCell>
            <TableCell>{row.rideType}</TableCell>
            <TableCell>{row.requestedAt}</TableCell>
            <TableCell>
              <Badge variant={row.status === "approved" ? "default" : row.status === "pending" ? "secondary" : "destructive"}>
                {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
              </Badge>
            </TableCell>
            <TableCell>
              {onReview && row.status === "pending" ? (
                <button className="text-primary underline text-xs" onClick={() => onReview(row)}>
                  Review
                </button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
