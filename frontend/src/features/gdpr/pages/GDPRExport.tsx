// src/pages/GDPRExport.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Download, RefreshCw } from "lucide-react";

type GdprExportData = {
  UserId?: string;
  Role?: string;
  FirstName?: string;
  LastName?: string;
  Dob?: string;
  Gender?: string;
  Email?: string;
  Phone?: string;
  Address?: string;
  Username?: string;
  Verified?: boolean | number;
  CreatedAt?: string;
  [key: string]: any; // allow extra fields in case you extend the JSON later
};

export default function GDPRExport() {
  const navigate = useNavigate();
  const [data, setData] = useState<GdprExportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const fetchExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gdpr/export", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to fetch GDPR export");
      }

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExport();
  }, []);

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const handleDownloadJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gdpr-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const fullName =
    (data?.FirstName || data?.LastName) &&
    `${data?.FirstName ?? ""} ${data?.LastName ?? ""}`.trim();

  const verified =
    typeof data?.Verified === "boolean"
      ? data?.Verified
      : data?.Verified === 1;

  return (
    <div className="min-h-screen bg-background">
      <Header title="My GDPR Data Export" showBack />

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Status / Info card */}
        <Card className="p-4 flex items-start gap-3">
          <div className="mt-1">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="font-semibold text-base">
              Your personal data snapshot
            </h2>
            <p className="text-sm text-muted-foreground">
              This page shows the main information our system currently stores
              about your account. You can review it, or download it as a JSON
              file for your records.
            </p>
          </div>
        </Card>

        {/* Error / loading */}
        {error && (
          <Card className="p-4 border-destructive/50 bg-destructive/5 text-destructive text-sm">
            {error}
          </Card>
        )}

        {loading && (
          <Card className="p-4 text-sm text-muted-foreground flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Fetching your latest data export...
          </Card>
        )}

        {/* Main content */}
        {data && !loading && (
          <div className="space-y-4">
            {/* Top summary */}
            <Card className="p-4 flex flex-wrap items-center gap-4 justify-between">
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Account
                </div>
                <div className="font-semibold text-lg">
                  {fullName || data.Username || "User"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {data.Email || "No email stored"}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  {data.Role && (
                    <Badge variant="secondary">
                      {data.Role === "D"
                        ? "Driver"
                        : data.Role === "P"
                        ? "Passenger"
                        : data.Role === "C"
                        ? "Company Representative"
                        : data.Role}
                    </Badge>
                  )}
                  <Badge variant={verified ? "default" : "outline"}>
                    {verified ? "Verified" : "Not verified"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Created at: {formatDateTime(data.CreatedAt)}
                </div>
              </div>
            </Card>

            {/* Personal details */}
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Personal details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <Field label="First name" value={data.FirstName} />
                <Field label="Last name" value={data.LastName} />
                <Field label="Date of birth" value={data.Dob} />
                <Field label="Gender" value={data.Gender} />
              </div>
            </Card>

            {/* Contact info */}
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Contact information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <Field label="Email" value={data.Email} />
                <Field label="Phone" value={data.Phone} />
              </div>
              <div className="mt-2">
                <Field label="Address" value={data.Address} fullWidth />
              </div>
            </Card>

            {/* Account metadata */}
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Account details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <Field label="Username" value={data.Username} />
                <Field label="User ID" value={data.UserId} />
              </div>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleDownloadJson}>
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
              <Button
                variant="outline"
                onClick={fetchExport}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh export
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setShowRaw((s) => !s)}
              >
                {showRaw ? "Hide raw data" : "Show raw JSON"}
              </Button>
            </div>

            {/* Raw JSON (optional) */}
            {showRaw && (
              <Card className="p-4">
                <div className="text-xs mb-2 text-muted-foreground">
                  Raw export (JSON)
                </div>
                <pre className="text-xs bg-muted/70 p-3 rounded-md overflow-x-auto">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </Card>
            )}
          </div>
        )}

        {!loading && !data && !error && (
          <Card className="p-4 text-sm text-muted-foreground">
            No export data available for your account.
          </Card>
        )}
      </div>
    </div>
  );
}

// Small helper component for label/value rows
function Field({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value?: string | number | boolean | null;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "col-span-1 md:col-span-2" : ""}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
        {label}
      </div>
      <div className="text-sm">
        {value === undefined || value === null || value === ""
          ? "-"
          : String(value)}
      </div>
    </div>
  );
}
