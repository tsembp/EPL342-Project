import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import EnrollmentsTable, { EnrollmentRow } from "./EnrollmentsTable";

import {
  getPendingServiceEnrollments,
  reviewServiceEnrollment,
} from "@/features/operator/api";

// ✅ NEW imports
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Enrollments() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<EnrollmentRow[]>([]);
  const [selected, setSelected] = useState<EnrollmentRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  // ⭐ NEW: comment state
  const [comment, setComment] = useState("");

  async function loadEnrollments() {
    setLoading(true);
    try {
      const data = await getPendingServiceEnrollments();
      console.log("RAW ENROLLMENTS FROM API:", data);

      const mapped: EnrollmentRow[] = (data || []).map((r: any) => ({
        id: String(r.EnrollId),
        driver: r.DriverName,
        vehicle: r.VehiclePlate,
        serviceType: r.ServiceTypeName,
        rideType: r.RideTypeName,
        requestedAt: r.RequestedAt,
        status:
          (r.Status?.toLowerCase() as "pending" | "approved" | "rejected") ??
          "pending",
      }));

      setRows(mapped);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load service enrollments.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEnrollments();
  }, []);

  function handleReview(row: EnrollmentRow) {
    setSelected(row);
    setComment("");
    setModalOpen(true);
  }

  async function handleAction(action: "approve" | "reject") {
    if (!selected) return;

    try {
      await reviewServiceEnrollment({
        enrollId: Number(selected.id), // ensure it's a number
        status: action === "approve" ? "Approved" : "Rejected",
        comment: comment.trim() || undefined,
      });

      toast({
        title: `Enrollment ${action === "approve" ? "approved" : "rejected"}`,
        description: `Enrollment for ${selected.driver} (${selected.vehicle}) has been ${action}d.`,
      });

      setModalOpen(false);
      setSelected(null);
      setComment("");

      await loadEnrollments();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update enrollment.",
        variant: "destructive",
      });
    }
  }

  const filtered = rows.filter((e) => e.status === tab);

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(val: any) => setTab(val)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="p-0">
            <EnrollmentsTable data={filtered} onReview={handleReview} />
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card className="p-0">
            <EnrollmentsTable data={filtered} />
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card className="p-0">
            <EnrollmentsTable data={filtered} />
          </Card>
        </TabsContent>
      </Tabs>

      {/* -------------------------------
          REVIEW MODAL
      -------------------------------- */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Enrollment</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div><b>Driver:</b> {selected?.driver}</div>
            <div><b>Vehicle:</b> {selected?.vehicle}</div>
            <div><b>Service Type:</b> {selected?.serviceType}</div>
            <div><b>Ride Type:</b> {selected?.rideType}</div>
          </div>

          {/* ⭐ NEW Comment Field */}
          <div className="space-y-1 mt-4">
            <Label htmlFor="enrollment-comment">Comment (optional)</Label>
            <Textarea
              id="enrollment-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a note explaining your decision…"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => handleAction("reject")}
            >
              Reject
            </Button>
            <Button onClick={() => handleAction("approve")}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
