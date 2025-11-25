import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, FileText } from "lucide-react";

export default function PendingApproval() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="h-10 w-10 text-warning" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-success flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-success-foreground" />
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl">Pending Approval</CardTitle>
            <CardDescription className="text-base mt-2">
              Your documents have been submitted successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">8 documents uploaded</span>
              </div>
              <p className="text-sm text-muted-foreground text-left">
                An operator will review your submission. This typically takes 1-3 business days.
              </p>
            </div>

            <div className="text-left space-y-2 text-sm">
              <p className="font-medium">What happens next?</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">1.</span>
                  <span>Operator reviews your documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">2.</span>
                  <span>You'll receive an email notification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">3.</span>
                  <span>Once approved, you can start accepting rides</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 space-y-2">
              <Button 
                onClick={() => navigate("/login")} 
                className="w-full"
              >
                Go to Login
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate("/driver/documents")}
                className="w-full"
              >
                Review Documents
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
