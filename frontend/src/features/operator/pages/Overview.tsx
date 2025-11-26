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
    <div className="min-h-[calc(100vh-4rem)] w-full bg-neutral-950 text-neutral-50 px-6 py-6">
      <div className="w-full max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50 mb-2">Operator Overview</h1>
          <p className="text-sm text-neutral-400">
            Monitor key metrics and jump into critical queues in real time.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {demoKPIs.map((kpi) => (
            <Card
              key={kpi.label}
              className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-lg flex flex-col items-start justify-center"
            >
              <span className="text-xs font-medium text-neutral-400 mb-1">
                {kpi.label}
              </span>
              <span className="text-2xl font-semibold text-neutral-50">
                {kpi.value}
              </span>
              <Badge
                className={[
                  "mt-3 rounded-full px-2.5 py-0.5 text-[11px] font-medium border",
                  kpi.status === "success"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
                    : "bg-amber-500/10 text-amber-300 border-amber-500/40",
                ].join(" ")}
              >
                {kpi.status === "success" ? "Active" : "Pending"}
              </Badge>
            </Card>
          ))}
        </div>

        {/* Quick Shortcuts */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => navigate("/operator/documents")}
            className="bg-emerald-500 text-neutral-950 hover:bg-emerald-400 rounded-full px-4 py-2 border-0"
          >
            Review pending documents
          </Button>
          <Button
            onClick={() => navigate("/operator/enrollments")}
            variant="outline"
            className="rounded-full border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800 hover:text-neutral-50 px-4 py-2"
          >
            Review pending enrollments
          </Button>
          <Button
            onClick={() => navigate("/operator/gdpr")}
            variant="outline"
            className="rounded-full border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800 hover:text-neutral-50 px-4 py-2"
          >
            View GDPR queue
          </Button>
          <Button
            onClick={() => navigate("/operator/rides")}
            variant="outline"
            className="rounded-full border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800 hover:text-neutral-50 px-4 py-2"
          >
            View live rides
          </Button>
        </div>

        {/* Recent Activity Feed */}
        <Card className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-neutral-50">Recent Activity</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-neutral-800">
                <TableHead className="text-xs font-medium text-neutral-400">
                  Type
                </TableHead>
                <TableHead className="text-xs font-medium text-neutral-400">
                  User
                </TableHead>
                <TableHead className="text-xs font-medium text-neutral-400">
                  Time
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-neutral-900/60">
                      <TableCell colSpan={3}>
                        <Skeleton className="h-4 w-full bg-neutral-800" />
                      </TableCell>
                    </TableRow>
                  ))
                : demoActivity.map((item, i) => (
                    <TableRow
                      key={i}
                      className="border-b border-neutral-900/60 hover:bg-neutral-800/60"
                    >
                      <TableCell className="text-sm text-neutral-100">
                        {item.type}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-200">
                        {item.user}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-400">
                        {item.time}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
