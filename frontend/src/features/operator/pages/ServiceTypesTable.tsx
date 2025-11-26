import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// ServiceTypesTable.tsx

export type ServiceTypeRow = {
  id: string;
  name: string;
  description: string;
  baseFare: number;
  perKm: number;
  perMin: number;
  active: boolean;
};

export default function ServiceTypesTable({
  data,
  onEdit,
}: {
  data: ServiceTypeRow[];
  onEdit?: (row: ServiceTypeRow) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-neutral-800">
          <TableHead className="text-xs font-medium text-neutral-400">
            Name
          </TableHead>
          <TableHead className="text-xs font-medium text-neutral-400">
            Description
          </TableHead>
          <TableHead className="text-xs font-medium text-neutral-400">
            Base Fare
          </TableHead>
          <TableHead className="text-xs font-medium text-neutral-400">
            Per Km
          </TableHead>
          <TableHead className="text-xs font-medium text-neutral-400">
            Per Min
          </TableHead>
          <TableHead className="text-xs font-medium text-neutral-400">
            Status
          </TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow
            key={row.id}
            className="border-b border-neutral-900/60 last:border-b-0 hover:bg-neutral-800/60"
          >
            <TableCell className="text-sm text-neutral-100">
              {row.name}
            </TableCell>
            <TableCell className="text-sm text-neutral-300">
              {row.description}
            </TableCell>
            <TableCell className="text-sm text-neutral-100">
              {row.baseFare.toFixed(2)}
            </TableCell>
            <TableCell className="text-sm text-neutral-100">
              {row.perKm.toFixed(2)}
            </TableCell>
            <TableCell className="text-sm text-neutral-100">
              {row.perMin.toFixed(2)}
            </TableCell>
            <TableCell>
              <Badge
                variant={row.active ? "default" : "secondary"}
                className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              >
                {row.active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <button
                className="text-emerald-400 hover:text-emerald-300 text-xs font-medium"
                onClick={() => onEdit?.(row)}
              >
                Edit
              </button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
