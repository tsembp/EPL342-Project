import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Demo report data
const reportData = {
  trip_counts: [
    { label: "Mon", value: 45 },
    { label: "Tue", value: 52 },
    { label: "Wed", value: 48 },
    { label: "Thu", value: 61 },
    { label: "Fri", value: 73 },
    { label: "Sat", value: 85 },
    { label: "Sun", value: 67 },
  ],
  category_share: [
    { label: "Simple route", value: 65 },
    { label: "Luxury route", value: 20 },
    { label: "Cargo", value: 15 },
  ],
  peak_hours: [
    { label: "08:00", value: 23 },
    { label: "09:00", value: 45 },
    { label: "17:00", value: 52 },
    { label: "18:00", value: 61 },
  ],
};

export default function Operator() {
  const [reportType, setReportType] = useState("trip_counts");

  const currentData = reportType === "trip_counts" 
    ? reportData.trip_counts 
    : reportType === "category_share"
    ? reportData.category_share
    : reportData.peak_hours;

  return (
    <div className="min-h-screen bg-background">
      <Header title="Operator Panel" showBack />
      
      <div className="max-w-4xl mx-auto p-4 space-y-4 pb-8">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Reports</h2>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trip_counts">Trip counts</SelectItem>
                <SelectItem value="category_share">Category share</SelectItem>
                <SelectItem value="peak_hours">Peak hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="label" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total trips</p>
            <p className="text-2xl font-bold mt-1">431</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Active drivers</p>
            <p className="text-2xl font-bold mt-1">87</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Avg. rating</p>
            <p className="text-2xl font-bold mt-1">4.8</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
