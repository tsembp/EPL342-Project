import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export type DriverRow = {
  id: string;
  name: string;
  email: string;
  age: number;
  country: string;
  verification: "verified" | "pending" | "rejected";
  vehicles: number;
  rating: number;
};

export default function UsersDriversTable({ data }: { data: DriverRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Age</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Verification</TableHead>
          <TableHead># Vehicles</TableHead>
          <TableHead>Avg. Rating</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.email}</TableCell>
            <TableCell>{row.age}</TableCell>
            <TableCell>{row.country}</TableCell>
            <TableCell>
              <Badge variant={row.verification === "verified" ? "default" : row.verification === "pending" ? "secondary" : "destructive"}>
                {row.verification.charAt(0).toUpperCase() + row.verification.slice(1)}
              </Badge>
            </TableCell>
            <TableCell>{row.vehicles}</TableCell>
            <TableCell>{row.rating.toFixed(1)}</TableCell>
            <TableCell>
              {/* Row actions: View profile, documents, vehicles, enrollments */}
              <button className="text-primary underline text-xs">View</button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
