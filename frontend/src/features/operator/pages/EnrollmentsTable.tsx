import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatLabel } from "@/lib/formatLabel";

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
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
      <Table className="text-gray-800">
        <TableHeader className="bg-white/80">
          <TableRow className="border-gray-200">
            <TableHead className="text-gray-600">Driver</TableHead>
            <TableHead className="text-gray-600">Vehicle</TableHead>
            <TableHead className="text-gray-600">Service Type</TableHead>
            <TableHead className="text-gray-600">Ride Type</TableHead>
            <TableHead className="text-gray-600">Requested At</TableHead>
            {onReview && (
              <TableHead className="text-right text-gray-600">
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
                className="py-6 text-center text-gray-9000"
              >
                No enrollments found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow
                key={row.id}
                className="border-gray-200 hover:bg-gray-100/40 transition-colors"
              >
                <TableCell className="font-medium text-gray-900">
                  {row.driver}
                </TableCell>
                <TableCell className="text-gray-700">
                  {row.vehicle}
                </TableCell>
                <TableCell className="text-gray-700">
                  {formatLabel(row.serviceType)}
                </TableCell>
                <TableCell className="text-gray-700">
                  {formatLabel(row.rideType)}
                </TableCell>
                <TableCell className="text-gray-600 text-sm">
                  {row.requestedAt}
                </TableCell>

                {onReview && (
                  <TableCell className="text-right">
                    <Button
                      onClick={() => onReview(row)}
                      className="rounded-lg bg-black text-white hover:bg-gray-800 px-3 py-1 text-xs font-medium"
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
