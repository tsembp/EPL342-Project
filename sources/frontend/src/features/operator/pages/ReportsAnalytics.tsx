import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Users,
  Car,
  DollarSign,
  Clock,
  Loader2,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import {
  getAverageCostByCategory,
  getHighLowCostTrips,
  getDriverVehicleEarnings,
  getDriverVehiclePerformance,
  getTripCount,
  getTripTrends,
  getHighActivityPeriods,
  getServiceTypes,
} from "@/features/operator/api";

type ReportType =
  | "trip-count"
  | "trip-trends"
  | "average-cost"
  | "high-low-cost"
  | "driver-earnings"
  | "driver-performance"
  | "high-activity";

const REPORT_INFO: Record<
  ReportType,
  { label: string; description: string; icon: React.ReactNode }
> = {
  "trip-count": {
    label: "Trip Count Analysis",
    description: "Count of trips grouped by time period and service type",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  "trip-trends": {
    label: "Ride Service Trends",
    description: "Trends showing percentage distribution across service types",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  "average-cost": {
    label: "Average Cost by Category",
    description: "Average trip costs broken down by service and ride type",
    icon: <DollarSign className="h-4 w-4" />,
  },
  "high-low-cost": {
    label: "High/Low Cost Trips",
    description: "Top highest and lowest cost trips",
    icon: <DollarSign className="h-4 w-4" />,
  },
  "driver-earnings": {
    label: "Driver/Vehicle Earnings",
    description: "Earnings breakdown by driver or vehicle with monthly details",
    icon: <Users className="h-4 w-4" />,
  },
  "driver-performance": {
    label: "Driver/Vehicle Performance",
    description: "Performance metrics including ratings and trip statistics",
    icon: <Car className="h-4 w-4" />,
  },
  "high-activity": {
    label: "High Activity Periods",
    description: "Identify peak activity periods compared to average",
    icon: <Clock className="h-4 w-4" />,
  },
};

type Frequency = "day" | "week" | "month" | "quarter" | "year";
type GroupBy = "DRIVER" | "VEHICLE" | "BOTH";
type OrderBy = "TRIPS" | "RATING";

export default function ReportsAnalytics() {
  const [activeReport, setActiveReport] = useState<ReportType>("trip-count");
  const [showFilters, setShowFilters] = useState(true);

  // Common filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("month");
  const [serviceTypeId, setServiceTypeId] = useState<string>("");

  // Advanced filters
  const [groupBy, setGroupBy] = useState<GroupBy>("DRIVER");
  const [orderBy, setOrderBy] = useState<OrderBy>("TRIPS");
  const [topN, setTopN] = useState<string>("10");
  const [minTrips, setMinTrips] = useState<string>("");
  const [minRating, setMinRating] = useState<string>("");
  const [minEarnings, setMinEarnings] = useState<string>("");

  // Fetch service types for filter dropdown
  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["operator", "service-types"],
    queryFn: getServiceTypes,
  });

  // Build params based on active report
  const reportParams = useMemo(() => {
    const base: any = {};
    if (fromDate) base.fromDate = fromDate;
    if (toDate) base.toDate = toDate;
    if (serviceTypeId) base.serviceTypeId = Number(serviceTypeId);

    switch (activeReport) {
      case "trip-count":
        return { ...base, frequency };
      case "trip-trends":
        return { ...base, frequency };
      case "average-cost":
        return { ...base, frequency };
      case "high-low-cost":
        return { ...base, topN: topN ? Number(topN) : 10 };
      case "driver-earnings":
        return {
          ...base,
          groupBy,
          minTrips: minTrips ? Number(minTrips) : undefined,
          minEarnings: minEarnings ? Number(minEarnings) : undefined,
        };
      case "driver-performance":
        return {
          ...base,
          periodGranularity: frequency,
          groupBy,
          orderBy,
          topN: topN ? Number(topN) : undefined,
          minTrips: minTrips ? Number(minTrips) : undefined,
          minRating: minRating ? Number(minRating) : undefined,
        };
      case "high-activity":
        return {
          ...base,
          frequency,
          topN: topN ? Number(topN) : undefined,
        };
      default:
        return base;
    }
  }, [
    activeReport,
    fromDate,
    toDate,
    frequency,
    serviceTypeId,
    groupBy,
    orderBy,
    topN,
    minTrips,
    minRating,
    minEarnings,
  ]);

  // Fetch report data
  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["operator", "report", activeReport, reportParams],
    queryFn: async () => {
      switch (activeReport) {
        case "trip-count":
          return getTripCount(reportParams);
        case "trip-trends":
          return getTripTrends(reportParams);
        case "average-cost":
          return getAverageCostByCategory(reportParams);
        case "high-low-cost":
          return getHighLowCostTrips(reportParams);
        case "driver-earnings":
          return getDriverVehicleEarnings(reportParams);
        case "driver-performance":
          return getDriverVehiclePerformance(reportParams);
        case "high-activity":
          return getHighActivityPeriods(reportParams);
        default:
          return [];
      }
    },
  });

  // Export to CSV
  const handleExport = () => {
    if (!reportData || reportData.length === 0) return;

    const headers = Object.keys(reportData[0]);
    const csvContent = [
      headers.join(","),
      ...reportData.map((row) =>
        headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeReport}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasDateFilter = ["trip-count", "trip-trends", "average-cost", "high-low-cost", "driver-performance"].includes(activeReport);
  const hasFrequencyFilter = ["trip-count", "trip-trends", "average-cost", "high-activity", "driver-performance"].includes(activeReport);
  const hasGroupByFilter = ["driver-earnings", "driver-performance"].includes(activeReport);
  const hasTopNFilter = ["high-low-cost", "driver-performance", "high-activity"].includes(activeReport);
  const hasMinTripsFilter = ["driver-earnings", "driver-performance"].includes(activeReport);
  const hasOrderByFilter = activeReport === "driver-performance";
  const hasMinRatingFilter = activeReport === "driver-performance";
  const hasMinEarningsFilter = activeReport === "driver-earnings";

  return (
    <div className="min-h-full w-full max-w-full bg-gray-50 text-gray-900 px-6 py-6 overflow-x-hidden">
      <div className="w-full max-w-full space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="mb-2 text-2xl font-semibold text-gray-900">
              Analytics &amp; Reports
            </h1>
            <p className="text-sm text-gray-600">
              Generate detailed reports from stored procedures with customizable parameters.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <RefreshCw className={`mr-1 h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={!reportData || reportData.length === 0}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Download className="mr-1 h-3 w-3" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Report Type Selector */}
        <Card className="border border-gray-200 bg-white p-4">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
            Select Report Type
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {(Object.keys(REPORT_INFO) as ReportType[]).map((key) => {
              const info = REPORT_INFO[key];
              const isActive = activeReport === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveReport(key)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors ${
                    isActive
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {info.icon}
                  <span className="text-[11px] font-medium leading-tight">
                    {info.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Active Report Info */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-gray-300 bg-gray-100 text-gray-700">
            {REPORT_INFO[activeReport].icon}
            <span className="ml-1">{REPORT_INFO[activeReport].label}</span>
          </Badge>
          <span className="text-sm text-gray-500">
            {REPORT_INFO[activeReport].description}
          </span>
        </div>

        {/* Filters Panel */}
        <Card className="border border-gray-200 bg-white">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <Filter className="h-4 w-4" />
              Parameters & Filters
            </div>
            {showFilters ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {showFilters && (
            <div className="border-t border-gray-200 px-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* Date Range */}
                {hasDateFilter && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">
                        From Date
                      </label>
                      <Input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="border-gray-300 bg-white text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">
                        To Date
                      </label>
                      <Input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="border-gray-300 bg-white text-sm"
                      />
                    </div>
                  </>
                )}

                {/* Frequency */}
                {hasFrequencyFilter && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      {activeReport === "driver-performance" ? "Period Granularity" : "Frequency"}
                    </label>
                    <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                      <SelectTrigger className="border-gray-300 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Daily</SelectItem>
                        <SelectItem value="week">Weekly</SelectItem>
                        <SelectItem value="month">Monthly</SelectItem>
                        <SelectItem value="quarter">Quarterly</SelectItem>
                        <SelectItem value="year">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Service Type */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">
                    Service Type
                  </label>
                  <Select value={serviceTypeId || "all"} onValueChange={(v) => setServiceTypeId(v === "all" ? "" : v)}>
                    <SelectTrigger className="border-gray-300 bg-white">
                      <SelectValue placeholder="All services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      {serviceTypes.map((st: any) => (
                        <SelectItem key={st.ServiceTypeId} value={String(st.ServiceTypeId)}>
                          {st.Name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Group By */}
                {hasGroupByFilter && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      Group By
                    </label>
                    <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                      <SelectTrigger className="border-gray-300 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRIVER">Driver</SelectItem>
                        <SelectItem value="VEHICLE">Vehicle</SelectItem>
                        <SelectItem value="BOTH">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Order By */}
                {hasOrderByFilter && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      Order By
                    </label>
                    <Select value={orderBy} onValueChange={(v) => setOrderBy(v as OrderBy)}>
                      <SelectTrigger className="border-gray-300 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRIPS">Trips</SelectItem>
                        <SelectItem value="RATING">Rating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Top N */}
                {hasTopNFilter && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      Top N Results
                    </label>
                    <Input
                      type="number"
                      value={topN}
                      onChange={(e) => setTopN(e.target.value)}
                      placeholder="10"
                      className="border-gray-300 bg-white text-sm"
                    />
                  </div>
                )}

                {/* Min Trips */}
                {hasMinTripsFilter && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      Min Trips
                    </label>
                    <Input
                      type="number"
                      value={minTrips}
                      onChange={(e) => setMinTrips(e.target.value)}
                      placeholder="No minimum"
                      className="border-gray-300 bg-white text-sm"
                    />
                  </div>
                )}

                {/* Min Rating */}
                {hasMinRatingFilter && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      Min Rating
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={minRating}
                      onChange={(e) => setMinRating(e.target.value)}
                      placeholder="0.0 - 5.0"
                      className="border-gray-300 bg-white text-sm"
                    />
                  </div>
                )}

                {/* Min Earnings */}
                {hasMinEarningsFilter && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      Min Earnings (€)
                    </label>
                    <Input
                      type="number"
                      value={minEarnings}
                      onChange={(e) => setMinEarnings(e.target.value)}
                      placeholder="No minimum"
                      className="border-gray-300 bg-white text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

{/* Results */}
        <Card className="border border-gray-200 bg-white overflow-hidden min-w-0">
          {/* Fixed Header */}
          <div className="border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                Results
              </span>
              {reportData && (
                <span className="text-xs text-gray-500">
                  {reportData.length} row{reportData.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Scrollable Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500 px-4">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading report data...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 mx-4 my-4 text-center">
              <p className="text-sm font-medium text-gray-700">
                Failed to load report
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </div>
          ) : !reportData || reportData.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-12 mx-4 my-4 text-center">
              <BarChart3 className="mx-auto mb-3 h-8 w-8 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">No data found</p>
              <p className="mt-1 text-xs text-gray-500">
                Try adjusting your filters or date range
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <ReportTable data={reportData} reportType={activeReport} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// Dynamic table component that adapts to report data
function ReportTable({ data, reportType }: { data: any[]; reportType: ReportType }) {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);

  // Format cell values
  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return "—";

    // Date formatting
    if (key.toLowerCase().includes("date") || key.toLowerCase().includes("period") || key === "PeriodStart") {
      if (typeof value === "string" && value.includes("T")) {
        return new Date(value).toLocaleDateString();
      }
      return value;
    }

    // Currency formatting
    if (
      key.toLowerCase().includes("cost") ||
      key.toLowerCase().includes("earnings") ||
      key.toLowerCase().includes("revenue") ||
      key.toLowerCase().includes("price") ||
      key.toLowerCase().includes("payout")
    ) {
      const num = Number(value);
      if (!isNaN(num)) return `€${num.toFixed(2)}`;
    }

    // Percentage formatting
    if (key.toLowerCase().includes("percent")) {
      const num = Number(value);
      if (!isNaN(num)) return `${num.toFixed(1)}%`;
    }

    // Rating formatting
    if (key.toLowerCase().includes("rating") && !key.toLowerCase().includes("count")) {
      const num = Number(value);
      if (!isNaN(num)) return num.toFixed(2);
    }

    // Distance formatting
    if (key.toLowerCase().includes("distance") || key.toLowerCase().includes("km")) {
      const num = Number(value);
      if (!isNaN(num)) return `${num.toFixed(1)} km`;
    }

    // Duration formatting
    if (key.toLowerCase().includes("duration") || key.toLowerCase().includes("minutes")) {
      const num = Number(value);
      if (!isNaN(num)) return `${Math.round(num)} min`;
    }

    return String(value);
  };

  // Highlight important columns
  const getColumnStyle = (key: string) => {
    if (
      key.toLowerCase().includes("total") ||
      key.toLowerCase().includes("count") ||
      key === "TripCount" ||
      key === "CompletedTrips"
    ) {
      return "font-semibold";
    }
    if (key === "ActivityLevel" || key === "PerformanceCategory" || key === "CostCategory") {
      return "font-medium";
    }
    return "";
  };

  // Badge for special values
  const renderBadge = (key: string, value: any) => {
    if (key === "ActivityLevel") {
      const colors: Record<string, string> = {
        "High Activity": "bg-black text-white",
        "Above Average": "bg-gray-200 text-gray-800",
        Normal: "bg-gray-100 text-gray-600",
      };
      return (
        <Badge className={colors[value] || "bg-gray-100 text-gray-600"}>
          {value}
        </Badge>
      );
    }
    if (key === "CostCategory") {
      return (
        <Badge className={value === "HIGHEST" ? "bg-black text-white" : "bg-gray-200 text-gray-700"}>
          {value}
        </Badge>
      );
    }
    if (key === "PerformanceCategory") {
      const colors: Record<string, string> = {
        "Top Performer": "bg-black text-white",
        "Above Average": "bg-gray-200 text-gray-800",
        Average: "bg-gray-100 text-gray-600",
        "Below Average": "bg-gray-100 text-gray-500",
      };
      return (
        <Badge className={colors[value] || "bg-gray-100 text-gray-600"}>
          {value}
        </Badge>
      );
    }
    return null;
  };

  // Filter out internal/less important columns for cleaner display
  const displayColumns = columns.filter((col) => {
    // Hide some verbose columns
    if (col === "PeriodGranularity") return false;
    if (col === "SortOrder") return false;
    return true;
  });

  return (
    <table className="min-w-max w-full text-left text-sm">
      <thead className="sticky top-0 bg-white z-10">
        <tr className="border-b border-gray-200">
          {displayColumns.map((col) => (
            <th
              key={col}
              className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 bg-white"
            >
              {col.replace(/([A-Z])/g, " $1").trim()}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr
            key={idx}
            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            {displayColumns.map((col) => (
              <td key={col} className={`whitespace-nowrap px-3 py-2 text-gray-900 ${getColumnStyle(col)}`}>
                {renderBadge(col, row[col]) || formatValue(col, row[col])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
