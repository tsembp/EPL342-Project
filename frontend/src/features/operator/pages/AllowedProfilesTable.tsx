import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export type AllowedProfileRow = {
  id: string;
  serviceType: string;
  rideType: string;
  vehicleType: string;
  minPrice: number;
  notes?: string;
};

export default function AllowedProfilesTable({ data }: { data: AllowedProfileRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service Type</TableHead>
          <TableHead>Ride Type</TableHead>
          <TableHead>Vehicle Type</TableHead>
          <TableHead>Min Price</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.serviceType}</TableCell>
            <TableCell>{row.rideType}</TableCell>
            <TableCell>{row.vehicleType}</TableCell>
            <TableCell>€{row.minPrice.toFixed(2)}</TableCell>
            <TableCell>{row.notes || "-"}</TableCell>
            <TableCell>
              <button className="text-primary underline text-xs">Edit</button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
