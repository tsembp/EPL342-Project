import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function GDPRRequest() {
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      toast.success("GDPR request submitted successfully");
      navigate("/profile");
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="GDPR Request" showBack />
      
      <div className="max-w-2xl mx-auto p-4">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
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
