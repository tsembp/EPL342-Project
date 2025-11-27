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
  [key: string]: any;
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
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <Header title="My GDPR Data Export" showBack />

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Status / Info card */}
        <Card className="p-4 flex items-start gap-3 border border-neutral-800 bg-neutral-900/80 shadow-lg">
          <div className="mt-1">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="font-semibold text-base text-neutral-50">
              Your personal data snapshot
            </h2>
            <p className="text-sm text-neutral-400">
              This page shows the main information our system currently stores
              about your account. You can review it or download it as a JSON
              file for your records.
            </p>
          </div>
        </Card>

        {/* Error / loading */}
        {error && (
          <Card className="p-4 border border-red-500/50 bg-red-950/40 text-red-300 text-sm">
            {error}
          </Card>
        )}

        {loading && (
          <Card className="p-4 text-sm text-neutral-400 flex items-center gap-2 border border-neutral-800 bg-neutral-900/80">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Fetching your latest data export...
          </Card>
        )}

        {/* Main content */}
        {data && !loading && (
          <div className="space-y-4">
            {/* Top summary */}
            <Card className="p-4 flex flex-wrap items-center gap-4 justify-between border border-neutral-800 bg-neutral-900/80">
              <div>
                <div className="text-xs uppercase text-neutral-500">
                  Account
                </div>
                <div className="font-semibold text-lg text-neutral-50">
                  {fullName || data.Username || "User"}
                </div>
                <div className="text-sm text-neutral-400">
                  {data.Email || "No email stored"}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  {data.Role && (
                    <Badge
                      variant="outline"
                      className="border-neutral-700 bg-neutral-900 text-neutral-200"
                    >
                      {data.Role === "D"
                        ? "Driver"
                        : data.Role === "P"
                        ? "Passenger"
                        : data.Role === "C"
                        ? "Company Representative"
                        : data.Role}
                    </Badge>
                  )}
                  <Badge
                    variant={verified ? "default" : "outline"}
                    className={
                      verified
                        ? "bg-emerald-500 text-neutral-950"
                        : "border-neutral-700 bg-neutral-900 text-neutral-200"
                    }
                  >
                    {verified ? "Verified" : "Not verified"}
                  </Badge>
                </div>
                <div className="text-xs text-neutral-500">
                  Created at: {formatDateTime(data.CreatedAt)}
                </div>
              </div>
            </Card>

            {/* Personal details */}
            <Card className="p-4 space-y-3 border border-neutral-800 bg-neutral-900/80">
              <h3 className="font-semibold text-sm text-neutral-50">
                Personal details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <Field label="First name" value={data.FirstName} />
                <Field label="Last name" value={data.LastName} />
                <Field label="Date of birth" value={data.Dob} />
                <Field label="Gender" value={data.Gender} />
              </div>
            </Card>

            {/* Contact info */}
            <Card className="p-4 space-y-3 border border-neutral-800 bg-neutral-900/80">
              <h3 className="font-semibold text-sm text-neutral-50">
                Contact information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <Field label="Email" value={data.Email} />
                <Field label="Phone" value={data.Phone} />
              </div>
              <div className="mt-2">
                <Field label="Address" value={data.Address} fullWidth />
              </div>
            </Card>

            {/* Account metadata */}
            <Card className="p-4 space-y-3 border border-neutral-800 bg-neutral-900/80">
              <h3 className="font-semibold text-sm text-neutral-50">
                Account details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <Field label="Username" value={data.Username} />
                <Field label="User ID" value={data.UserId} />
              </div>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleDownloadJson}
                className="bg-emerald-500 text-neutral-950 hover:bg-emerald-400"
              >
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
              <Button
                variant="outline"
                onClick={fetchExport}
                disabled={loading}
                className="border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800 hover:text-neutral-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh export
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setShowRaw((s) => !s)}
                className="text-neutral-300 hover:bg-neutral-900"
              >
                {showRaw ? "Hide raw data" : "Show raw JSON"}
              </Button>
            </div>

            {/* Raw JSON (optional) */}
            {showRaw && (
              <Card className="p-4 border border-neutral-800 bg-neutral-900/80">
                <div className="text-xs mb-2 text-neutral-500">
                  Raw export (JSON)
                </div>
                <pre className="text-xs bg-neutral-950/70 p-3 rounded-md overflow-x-auto text-neutral-100">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </Card>
            )}
          </div>
        )}

        {!loading && !data && !error && (
          <Card className="p-4 text-sm text-neutral-400 border border-neutral-800 bg-neutral-900/80">
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
      <div className="text-[11px] uppercase tracking-wide text-neutral-500 mb-0.5">
        {label}
      </div>
      <div className="text-sm text-neutral-100">
        {value === undefined || value === null || value === ""
          ? "-"
          : String(value)}
      </div>
    </div>
  );
}
