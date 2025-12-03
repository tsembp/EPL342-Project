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
    <div className="min-h-full w-full bg-gray-50 text-gray-900 px-6 py-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900">
            Service Enrollments
          </h1>
          <p className="text-sm text-gray-600">
            Review and manage driver enrollments to ride services.
          </p>
        </div>

        <Tabs
          value={tab}
          onValueChange={(val: any) => setTab(val)}
        >
          <TabsList className="inline-flex rounded-lg border border-gray-200 bg-white/80 p-1">
            <TabsTrigger
              value="pending"
              className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors data-[state=active]:bg-black data-[state=active]:text-white"
            >
              Pending
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors data-[state=active]:bg-black data-[state=active]:text-white"
            >
              Approved
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors data-[state=active]:bg-black data-[state=active]:text-white"
            >
              Rejected
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {loading ? (
              <div className="rounded-xl border border-gray-200/70 bg-white/50 px-4 py-6 text-sm text-gray-600">
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
              <div className="rounded-xl border border-gray-200/70 bg-white/50 px-4 py-6 text-sm text-gray-600">
                Loading approved enrollments…
              </div>
            ) : (
              <EnrollmentsTable data={filtered} />
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            {loading ? (
              <div className="rounded-xl border border-gray-200/70 bg-white/50 px-4 py-6 text-sm text-gray-600">
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
        <DialogContent className="max-w-lg rounded-lg border border-gray-200 bg-white text-gray-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Review Enrollment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">
                Driver:
              </span>{" "}
              <span className="text-gray-900">
                {selected?.driver}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">
                Vehicle:
              </span>{" "}
              <span className="text-gray-900">
                {selected?.vehicle}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">
                Service Type:
              </span>{" "}
              <span className="text-gray-900">
                {selected?.serviceType}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">
                Ride Type:
              </span>{" "}
              <span className="text-gray-900">
                {selected?.rideType}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <Label
              htmlFor="enrollment-comment"
              className="text-sm font-medium text-gray-800"
            >
              Comment (optional)
            </Label>
            <Textarea
              id="enrollment-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a note explaining your decision…"
              rows={3}
              className="border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-9000 focus-visible:ring-gray-500/40"
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
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
