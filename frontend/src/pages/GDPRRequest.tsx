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
  { value: "DataExport", label: "Export my data" },
  { value: "DataDeletion", label: "Delete my data" },
  { value: "DataCorrection", label: "Correct my data" },
];

function getReasonLabel(type: string) {
  switch (type) {
    case "DataDeletion":
      return "Why do you want your data deleted?";
    case "DataCorrection":
      return "Describe what is incorrect and the correct data";
    case "DataExport":
      return "Additional notes for your export (optional)";
    case "DataAccess":
    default:
      return "Additional details for your request (optional)";
  }
}

function getReasonPlaceholder(type: string) {
  switch (type) {
    case "DataDeletion":
      return "Example: I no longer use this service and want my personal data removed.";
    case "DataCorrection":
      return "Example: My date of birth is wrong; it should be 1998-01-05, not 1997-01-05.";
    case "DataExport":
      return "Optional: Anything specific you want us to highlight in your export.";
    case "DataAccess":
    default:
      return "Optional: You can explain what data you’re particularly interested in.";
  }
}

function getHelperText(type: string) {
  switch (type) {
    case "DataAccess":
      return "We will show you the personal data stored about your account.";
    case "DataExport":
      return "We will generate a machine-readable export of your personal data.";
    case "DataDeletion":
      return "Your account data will be anonymized according to GDPR. This action cannot be undone.";
    case "DataCorrection":
      return "Describe which of your stored details are wrong and what the correct values should be.";
    default:
      return "";
  }
}

export default function GDPRRequest() {
  const navigate = useNavigate();
  const [type, setType] = useState<string>("DataAccess");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Require a detailed reason for deletion / correction
    if (
      (type === "DataDeletion" || type === "DataCorrection") &&
      reason.trim().length < 10
    ) {
      toast.error(
        "Please provide a short explanation for deletion/correction (at least a few words)."
      );
      return;
    }

    setLoading(true);
    try {
      await submitGDPRRequest({ reason, type });
      toast.success("Your GDPR request has been submitted.");

      // Decide where to send the user based on request type
      if (type === "DataAccess" || type === "DataExport") {
        // Show them their data/export page
        navigate("/gdpr/export");
      } else {
        // For deletion / correction we just go back to profile
        navigate("/profile");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit GDPR request.");
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
            {/* Type selector */}
            <div className="space-y-2">
              <Label htmlFor="type">Request type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-12 border rounded px-3 bg-background"
                required
              >
                {REQUEST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {getHelperText(type)}
              </p>
            </div>

            {/* Reason / description */}
            <div className="space-y-2">
              <Label htmlFor="reason">{getReasonLabel(type)}</Label>
              <Textarea
                id="reason"
                placeholder={getReasonPlaceholder(type)}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-32"
                // required only for deletion/correction
                required={type === "DataDeletion" || type === "DataCorrection"}
              />
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
