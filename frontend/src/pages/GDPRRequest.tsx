import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { submitGDPRRequest } from "@/lib/api";

const REQUEST_TYPES = [
  { value: "DataAccess", label: "Access my data" },
  { value: "DataDeletion", label: "Delete my data" },
  { value: "DataExport", label: "Export my data" },
  { value: "DataCorrection", label: "Correct my data" },
];

export default function GDPRRequest() {
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [type, setType] = useState("DataAccess");
  const [loading, setLoading] = useState(false);

  const submitGdprRequest = async () => {
    try {
      const response = await fetch("/api/gdpr/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason, type }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("GDPR request submitted successfully");
        navigate("/profile");
      } else {
        toast.error(data.error || "Failed to submit GDPR request");
      }
    } catch (error) {
      toast.error("An error occurred while submitting the request");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitGDPRRequest({ reason, type });
      toast.success("GDPR request submitted successfully");
      navigate("/profile");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit GDPR request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="GDPR Request" showBack />
      <div className="max-w-2xl mx-auto p-4">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Request type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-12 border rounded px-3"
                required
              >
                {REQUEST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Request reason</Label>
              <Textarea
                id="reason"
                placeholder="Please explain your data request..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="min-h-32"
              />
              <p className="text-xs text-muted-foreground">
                Your request will be processed according to GDPR regulations.
              </p>
            </div>
            <Button type="submit" className="w-full h-12" disabled={loading}>
              {loading ? "Submitting..." : "Submit request"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}