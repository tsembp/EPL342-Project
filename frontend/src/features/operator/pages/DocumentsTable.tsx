import { Table, TableRow, TableCell, TableBody, TableHead, TableHeader } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export interface DocumentRow {
  id: string;
  user: string;
  type: string;
  submittedAt: string;
  status: string;
}

interface DocumentsTableProps {
  data: DocumentRow[];
  onReview?: (row: DocumentRow) => void;
}

export default function DocumentsTable({ data, onReview }: DocumentsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Submitted At</TableHead>
          <TableHead>Status</TableHead>
          {onReview && <TableHead>Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.user}</TableCell>
            <TableCell>{row.type}</TableCell>
            <TableCell>{row.submittedAt}</TableCell>
            <TableCell>
              <span className={`badge badge-${row.status}`}>{row.status}</span>
            </TableCell>
            {onReview && (
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReview(row)}
                  className="rounded-full px-4"
                  aria-label={`Review document for ${row.user}`}
                >
                  Review
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
