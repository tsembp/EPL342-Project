
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {demoKPIs.map((kpi) => (
          <Card key={kpi.label} className="p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">{kpi.label}</div>
            <div className="text-2xl font-bold">{kpi.value}</div>
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold">Rides per Day (This Week)</div>
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
        <div className="w-full h-48 flex items-end gap-2">
          {demoChartData.map((d) => (
            <div key={d.day} className="flex flex-col items-center flex-1">
              <div
                className="bg-primary/70 rounded-t w-6"
                style={{ height: `${d.rides / 3}px`, minHeight: 8 }}
                title={`${d.rides} rides`}
              ></div>
              <div className="text-xs mt-1 text-muted-foreground">{d.day}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
