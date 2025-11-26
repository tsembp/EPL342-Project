import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
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
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Base Fare</TableHead>
          <TableHead>Per Km</TableHead>
          <TableHead>Per Min</TableHead>
          <TableHead>Status</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.description}</TableCell>
            <TableCell>{row.baseFare.toFixed(2)}</TableCell>
            <TableCell>{row.perKm.toFixed(2)}</TableCell>
            <TableCell>{row.perMin.toFixed(2)}</TableCell>
            <TableCell>
              <Badge variant={row.active ? "default" : "secondary"}>
                {row.active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <button
                className="text-primary underline text-xs"
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
