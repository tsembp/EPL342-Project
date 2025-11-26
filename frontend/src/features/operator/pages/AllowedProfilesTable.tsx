import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export type AllowedProfileRow = {
  id: string;
  serviceTypeId: number;
  serviceType: string;
  rideTypeId: number;
  rideType: string;
  vehicleTypeId: number;
  vehicleType: string;
  profileName?: string;
  minPrice: number;
  notes?: string;
};

function formatLabel(value: string): string {
  if (!value) return "";
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function AllowedProfilesTable({
  data,
  onEdit,
}: {
  data: AllowedProfileRow[];
  onEdit?: (row: AllowedProfileRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-lg">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-neutral-800 bg-neutral-900">
            <TableHead className="w-1/3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Service Type
            </TableHead>
            <TableHead className="w-1/3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Ride Type
            </TableHead>
            <TableHead className="w-1/3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Vehicle Type
            </TableHead>
            {onEdit && (
              <TableHead className="w-[80px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.id}
              className="border-b border-neutral-800/70 bg-neutral-900/40 hover:bg-neutral-800/80 transition-colors"
            >
              <TableCell className="whitespace-nowrap px-4 py-3 text-neutral-100">
                {formatLabel(row.serviceType)}
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-neutral-100">
                {formatLabel(row.rideType)}
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-3 text-neutral-100">
                {row.vehicleType}
              </TableCell>
              {onEdit && (
                <TableCell className="px-4 py-3 text-right">
                  <button
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
                    onClick={() => onEdit(row)}
                  >
                    Edit
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