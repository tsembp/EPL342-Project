import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export type EnrollmentRow = {
  id: string;
  driver: string;
  vehicle: string;
  serviceType: string;
  rideType: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
};

export default function EnrollmentsTable({
  data,
  onReview,
}: {
  data: EnrollmentRow[];
  onReview?: (row: EnrollmentRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl">
      <Table className="text-neutral-200">
        <TableHeader className="bg-neutral-900/80">
          <TableRow className="border-neutral-800">
            <TableHead className="text-neutral-400">Driver</TableHead>
            <TableHead className="text-neutral-400">Vehicle</TableHead>
            <TableHead className="text-neutral-400">Service Type</TableHead>
            <TableHead className="text-neutral-400">Ride Type</TableHead>
            <TableHead className="text-neutral-400">Requested At</TableHead>
            {onReview && (
              <TableHead className="text-right text-neutral-400">
                Action
              </TableHead>
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-6 text-center text-neutral-500"
              >
                No enrollments found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow
                key={row.id}
                className="border-neutral-800 hover:bg-neutral-800/40 transition-colors"
              >
                <TableCell className="font-medium text-neutral-100">
                  {row.driver}
                </TableCell>
                <TableCell className="text-neutral-300">
                  {row.vehicle}
                </TableCell>
                <TableCell className="text-neutral-300">
                  {row.serviceType}
                </TableCell>
                <TableCell className="text-neutral-300">
                  {row.rideType}
                </TableCell>
                <TableCell className="text-neutral-400 text-sm">
                  {row.requestedAt}
                </TableCell>

                {onReview && (
                  <TableCell className="text-right">
                    <Button
                      onClick={() => onReview(row)}
                      className="rounded-full bg-emerald-500 text-neutral-950 hover:bg-emerald-400 px-3 py-1 text-xs font-medium"
                    >
                      Review
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
