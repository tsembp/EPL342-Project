
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
// import { getOperatorReports } from "@/lib/api";

const demoKPIs = [
  { label: "Pending user documents", value: 8, status: "warning" },
  { label: "Pending vehicle documents", value: 3, status: "warning" },
  { label: "Pending service enrollments", value: 5, status: "warning" },
  { label: "Pending GDPR requests", value: 2, status: "warning" },
  { label: "Active rides right now", value: 12, status: "success" },
];

const demoActivity = [
  { type: "Document Approved", user: "D. Papadopoulos", time: "2m ago" },
  { type: "GDPR Request Rejected", user: "A. Ioannou", time: "10m ago" },
  { type: "Enrollment Approved", user: "M. Christou", time: "20m ago" },
  { type: "Vehicle Verified", user: "S. Georgiou", time: "30m ago" },
];

export default function Overview() {
  const navigate = useNavigate();
  const [loading] = useState(false);
  // Placeholder for future API integration
  // const [kpis, setKpis] = useState([]);
  // const [activity, setActivity] = useState([]);

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {demoKPIs.map((kpi) => (
          <Card key={kpi.label} className="p-4 flex flex-col items-start justify-center">
            <span className="text-sm text-muted-foreground mb-1">{kpi.label}</span>
            <span className="text-2xl font-bold">{kpi.value}</span>
            <Badge variant={kpi.status === "success" ? "default" : "secondary"} className="mt-2">
              {kpi.status === "success" ? "Active" : "Pending"}
            </Badge>
          </Card>
        ))}
      </div>

      {/* Quick Shortcuts */}
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => navigate("/operator/documents")}>Review pending documents</Button>
        <Button onClick={() => navigate("/operator/enrollments")}>Review pending enrollments</Button>
        <Button onClick={() => navigate("/operator/gdpr")}>View GDPR queue</Button>
        <Button onClick={() => navigate("/operator/rides")}>View live rides</Button>
      </div>

      {/* Recent Activity Feed */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3}><Skeleton className="h-4 w-full" /></TableCell>
                  </TableRow>
                ))
              : demoActivity.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>{item.user}</TableCell>
                    <TableCell>{item.time}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
