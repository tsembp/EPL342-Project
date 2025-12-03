import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface DashboardData {
  pendingPersonDocuments: number;
  pendingVehicleDocuments: number;
  pendingEnrollments: number;
  pendingGdpr: number;
  activeRides: number;
  recentActivity: Array<{
    type: string;
    user: string;
    time: string;
  }>;
}

export default function Overview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/operator/dashboard", {
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error("Error fetching dashboard:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const kpis = dashboardData ? [
    { label: "Pending user documents", value: dashboardData.pendingPersonDocuments, status: "warning" },
    { label: "Pending vehicle documents", value: dashboardData.pendingVehicleDocuments, status: "warning" },
    { label: "Pending service enrollments", value: dashboardData.pendingEnrollments, status: "warning" },
    { label: "Pending GDPR requests", value: dashboardData.pendingGdpr, status: "warning" },
    { label: "Active rides right now", value: dashboardData.activeRides, status: "success" },
  ] : [];

  return (
    <div className="min-h-full w-full bg-gray-50 text-gray-900 px-6 py-6">
      <div className="w-full space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Operator Overview</h1>
          <p className="text-sm text-gray-600">
            Monitor key metrics and jump into critical queues in real time.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 border border-gray-200 bg-white shadow-sm">
                <Skeleton className="h-4 w-24 bg-gray-200 mb-2" />
                <Skeleton className="h-8 w-16 bg-gray-200 mb-3" />
                <Skeleton className="h-5 w-20 bg-gray-200" />
              </Card>
            ))
          ) : (
            kpis.map((kpi) => (
            <Card
              key={kpi.label}
              className="p-4 border border-gray-200 bg-white shadow-sm flex flex-col items-start justify-center"
            >
              <span className="text-xs font-medium text-gray-600 mb-1">
                {kpi.label}
              </span>
              <span className="text-2xl font-semibold text-gray-900">
                {kpi.value}
              </span>
              <Badge
                className={[
                  "mt-3 px-2.5 py-0.5 text-[11px] font-medium border transition-colors",
                  kpi.status === "success"
                    ? "bg-gray-50 text-gray-900 border-gray-200 hover:bg-gray-100"
                    : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
                ].join(" ")}
              >
                {kpi.status === "success" ? "Active" : "Pending"}
              </Badge>
            </Card>
          ))
          )}
        </div>

        {/* Quick Shortcuts */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => navigate("/operator/documents")}
            className="bg-black text-white hover:bg-gray-800 px-4 py-2"
          >
            Review pending documents
          </Button>
          <Button
            onClick={() => navigate("/operator/enrollments")}
            variant="outline"
            className="border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-black px-4 py-2"
          >
            Review pending enrollments
          </Button>
          <Button
            onClick={() => navigate("/operator/gdpr-data-correction")}
            variant="outline"
            className="border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-black px-4 py-2"
          >
            View GDPR queue
          </Button>
          <Button
            onClick={() => navigate("/operator/reports")}
            variant="outline"
            className="border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-black px-4 py-2"
          >
            View reports
          </Button>
        </div>

        {/* Recent Activity Feed */}
        <Card className="p-4 border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200">
                <TableHead className="text-xs font-medium text-gray-600">
                  Type
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-600">
                  User
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-600">
                  Time
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-gray-200">
                    <TableCell colSpan={3}>
                      <Skeleton className="h-4 w-full bg-gray-200" />
                    </TableCell>
                  </TableRow>
                ))
              ) : dashboardData && dashboardData.recentActivity.length > 0 ? (
                dashboardData.recentActivity.map((item, i) => (
                    <TableRow
                      key={i}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <TableCell className="text-sm text-gray-900">
                        {item.type}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {item.user}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {item.time}
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                    No recent activity
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
