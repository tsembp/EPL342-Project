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
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white/80 shadow-sm">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-gray-200 bg-white">
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">User</TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">Type</TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">Submitted At</TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">Status</TableHead>
            {onReview && <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600 text-right">Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id} className="border-b border-gray-200/70 bg-white/40 hover:bg-gray-100/80 transition-colors">
              <TableCell className="px-4 py-3 text-gray-900">{row.user}</TableCell>
              <TableCell className="px-4 py-3 text-gray-900">{row.type}</TableCell>
              <TableCell className="px-4 py-3 text-gray-900">{row.submittedAt}</TableCell>
              <TableCell className="px-4 py-3">
                <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${
                  row.status === 'pending' 
                    ? 'border border-amber-500/40 bg-amber-500/10 text-amber-300'
                    : row.status === 'approved'
                    ? 'border border-gray-200 bg-black/10 text-gray-900'
                    : 'border border-red-500/40 bg-red-500/10 text-red-300'
                }`}>
                  {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                </span>
              </TableCell>
              {onReview && (
                <TableCell className="px-4 py-3 text-right">
                  <button
                    onClick={() => onReview(row)}
                    className="text-xs font-medium text-gray-400 hover:text-gray-900 hover:underline"
                    aria-label={`Review document for ${row.user}`}
                  >
                    Review
                  </button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}