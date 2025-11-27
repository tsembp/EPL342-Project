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

      if (type === "DataAccess" || type === "DataExport") {
        navigate("/gdpr/export");
      } else {
        navigate("/profile");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit GDPR request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <Header title="GDPR Request" showBack />

      <div className="max-w-2xl mx-auto p-4">
        <Card className="p-6 border border-neutral-800 bg-neutral-900/80 shadow-xl backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-5 text-sm">

            {/* Type selector */}
            <div className="space-y-2">
              <Label
                htmlFor="type"
                className="text-xs font-medium uppercase tracking-wide text-neutral-400"
              >
                Request type
              </Label>

              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-11 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 px-3 outline-none focus:ring-emerald-500 focus:ring-offset-0"
                required
              >
                {REQUEST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <p className="text-xs text-neutral-400">
                {getHelperText(type)}
              </p>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label
                htmlFor="reason"
                className="text-xs font-medium uppercase tracking-wide text-neutral-400"
              >
                {getReasonLabel(type)}
              </Label>

              <Textarea
                id="reason"
                placeholder={getReasonPlaceholder(type)}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-32 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                required={type === "DataDeletion" || type === "DataCorrection"}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-emerald-500 text-neutral-950 font-medium hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit request"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
