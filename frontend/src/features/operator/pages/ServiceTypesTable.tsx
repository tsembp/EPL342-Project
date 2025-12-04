import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatLabel } from "@/lib/formatLabel";

// ServiceTypesTable.tsx

export type ServiceTypeRow = {
  id: string;
  name: string;
  description: string;
  baseFare: number;
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
        <TableRow className="border-b border-gray-200">
          <TableHead className="text-xs font-medium text-gray-600">
            Name
          </TableHead>
          <TableHead className="text-xs font-medium text-gray-600">
            Description
          </TableHead>
          <TableHead className="text-xs font-medium text-gray-600">
            Base Fare
          </TableHead>
          <TableHead className="text-xs font-medium text-gray-600">
            Status
          </TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow
            key={row.id}
            className="border-b border-gray-200/60 last:border-b-0 hover:bg-gray-100/60"
          >
            <TableCell className="text-sm text-gray-900">
              {formatLabel(row.name)}
            </TableCell>
            <TableCell className="text-sm text-gray-700">
              {row.description}
            </TableCell>
            <TableCell className="text-sm text-gray-900">
              {row.baseFare.toFixed(2)}
            </TableCell>
            <TableCell>
              <Badge
                variant={row.active ? "default" : "secondary"}
                className="rounded-lg px-2.5 py-0.5 text-[11px] font-medium"
              >
                {row.active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <button
                className="text-gray-400 hover:text-gray-900 text-xs font-medium"
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
