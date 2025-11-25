import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export type GDPRRow = {
  id: string;
  user: string;
  requestType: string;
  requestedAt: string;
  status: "pending" | "completed" | "rejected";
};

type Props = {
  data: GDPRRow[];
  onReview?: (row: GDPRRow) => void;
};

export default function GDPRPrivacyTable({ data, onReview }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Request Type</TableHead>
          <TableHead>Requested At</TableHead>
          <TableHead>Status</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.user}</TableCell>
            <TableCell>{row.requestType}</TableCell>
            <TableCell>{row.requestedAt}</TableCell>
            <TableCell>
              <Badge variant={row.status === "completed" ? "default" : row.status === "pending" ? "secondary" : "destructive"}>
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
