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
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-lg">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-neutral-800 bg-neutral-900">
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">User</TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Type</TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Submitted At</TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Status</TableHead>
            {onReview && <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400 text-right">Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id} className="border-b border-neutral-800/70 bg-neutral-900/40 hover:bg-neutral-800/80 transition-colors">
              <TableCell className="px-4 py-3 text-neutral-100">{row.user}</TableCell>
              <TableCell className="px-4 py-3 text-neutral-100">{row.type}</TableCell>
              <TableCell className="px-4 py-3 text-neutral-100">{row.submittedAt}</TableCell>
              <TableCell className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  row.status === 'pending' 
                    ? 'border border-amber-500/40 bg-amber-500/10 text-amber-300'
                    : row.status === 'approved'
                    ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border border-red-500/40 bg-red-500/10 text-red-300'
                }`}>
                  {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                </span>
              </TableCell>
              {onReview && (
                <TableCell className="px-4 py-3 text-right">
                  <button
                    onClick={() => onReview(row)}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
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