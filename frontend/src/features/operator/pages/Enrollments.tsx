import { useEffect, useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Enrollments() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">(
    "pending",
  );
  const [rows, setRows] = useState<EnrollmentRow[]>([]);
  const [selected, setSelected] = useState<EnrollmentRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

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
          (r.Status?.toLowerCase() as
            | "pending"
            | "approved"
            | "rejected") ?? "pending",
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
        enrollId: Number(selected.id),
        status: action === "approve" ? "Approved" : "Rejected",
        comment: comment.trim() || undefined,
      });

      toast({
        title: `Enrollment ${
          action === "approve" ? "approved" : "rejected"
        }`,
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
    <div className="min-h-[calc(100vh-4rem)] w-full bg-neutral-950 text-neutral-50 px-6 py-6">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-neutral-50">
            Service Enrollments
          </h1>
          <p className="text-sm text-neutral-400">
            Review and manage driver enrollments to ride services.
          </p>
        </div>

        <Tabs
          value={tab}
          onValueChange={(val: any) => setTab(val)}
        >
          <TabsList className="inline-flex rounded-full border border-neutral-800 bg-neutral-900/80 p-1">
            <TabsTrigger
              value="pending"
              className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 transition-colors data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900"
            >
              Pending
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 transition-colors data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900"
            >
              Approved
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 transition-colors data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900"
            >
              Rejected
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {loading ? (
              <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/50 px-4 py-6 text-sm text-neutral-400">
                Loading pending enrollments…
              </div>
            ) : (
              <EnrollmentsTable
                data={filtered}
                onReview={handleReview}
              />
            )
            }
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            {loading ? (
              <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/50 px-4 py-6 text-sm text-neutral-400">
                Loading approved enrollments…
              </div>
            ) : (
              <EnrollmentsTable data={filtered} />
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            {loading ? (
              <div className="rounded-xl border border-neutral-800/70 bg-neutral-950/50 px-4 py-6 text-sm text-neutral-400">
                Loading rejected enrollments…
              </div>
            ) : (
              <EnrollmentsTable data={filtered} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* REVIEW MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Review Enrollment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-neutral-300">
                Driver:
              </span>{" "}
              <span className="text-neutral-100">
                {selected?.driver}
              </span>
            </div>
            <div>
              <span className="font-medium text-neutral-300">
                Vehicle:
              </span>{" "}
              <span className="text-neutral-100">
                {selected?.vehicle}
              </span>
            </div>
            <div>
              <span className="font-medium text-neutral-300">
                Service Type:
              </span>{" "}
              <span className="text-neutral-100">
                {selected?.serviceType}
              </span>
            </div>
            <div>
              <span className="font-medium text-neutral-300">
                Ride Type:
              </span>{" "}
              <span className="text-neutral-100">
                {selected?.rideType}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <Label
              htmlFor="enrollment-comment"
              className="text-sm font-medium text-neutral-200"
            >
              Comment (optional)
            </Label>
            <Textarea
              id="enrollment-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a note explaining your decision…"
              rows={3}
              className="border-neutral-700 bg-neutral-950 text-sm text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500/40"
            />
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => handleAction("reject")}
              className="rounded-lg border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/20"
            >
              Reject
            </Button>
            <Button
              onClick={() => handleAction("approve")}
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-emerald-400"
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
