import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const demoKPIs = [
  { label: "Total Rides", value: 1240 },
  { label: "Active Drivers", value: 87 },
  { label: "Revenue (This Month)", value: "€8,450" },
  { label: "Avg. Ride Rating", value: 4.7 },
];

const demoChartData = [
  { day: "Mon", rides: 120 },
  { day: "Tue", rides: 140 },
  { day: "Wed", rides: 180 },
  { day: "Thu", rides: 160 },
  { day: "Fri", rides: 210 },
  { day: "Sat", rides: 300 },
  { day: "Sun", rides: 230 },
];

export default function ReportsAnalytics() {
  const [exporting, setExporting] = useState(false);

  function handleExport() {
    setExporting(true);
    setTimeout(() => setExporting(false), 1200); // Simulate export
  }

  return (
    <div className="min-h-full w-full bg-gray-50 text-gray-900 px-6 py-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900">
            Analytics &amp; Reports
          </h1>
          <p className="text-sm text-gray-600">
            High-level overview of rides, drivers, and weekly performance.
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {demoKPIs.map((kpi) => (
            <Card
              key={kpi.label}
              className="border border-gray-200 bg-white/80 px-4 py-3 text-center shadow-md"
            >
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-600">
                {kpi.label}
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {kpi.value}
              </div>
            </Card>
          ))}
        </div>

        {/* Simple bar chart card */}
        <Card className="border border-gray-200 bg-white/80 p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">
              Rides per Day (This Week)
            </div>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="rounded-lg bg-black px-3 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          </div>

          <div className="flex h-52 w-full items-end gap-3">
            {demoChartData.map((d) => (
              <div
                key={d.day}
                className="flex flex-1 flex-col items-center justify-end"
              >
                <div
                  className="w-6 rounded-t-md bg-black/80"
                  style={{ height: `${d.rides / 3}px`, minHeight: 10 }}
                  title={`${d.rides} rides`}
                />
                <div className="mt-2 text-xs text-gray-600">
                  {d.day}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
