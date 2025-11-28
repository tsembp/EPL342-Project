import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getPendingPersonDocuments,
  getAcceptedPersonDocuments,
  getRejectedPersonDocuments,
  getPendingVehicleDocuments,
  reviewPersonDocument,
  reviewVehicleDocument,
} from "@/lib/api";
import DocumentsTable, { DocumentRow } from "./DocumentsTable";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type DocTab = "person" | "vehicle";
type StatusTab = "pending" | "approved" | "rejected";

function mapDbStatusToUi(statusValue: any): "pending" | "approved" | "rejected" {
  const dbStatus = String(statusValue ?? "").trim().toLowerCase();

  if (dbStatus === "accepted") return "approved";
  if (dbStatus === "rejected") return "rejected";
  return "pending"; // includes "pending" or anything else / null
}

function mapPersonDoc(
  doc: any,
  overrideStatus?: "pending" | "approved" | "rejected"
): DocumentRow {
  // For person docs we know which list they came from,
  // so we trust overrideStatus instead of DB value
  const status: "pending" | "approved" | "rejected" =
    overrideStatus ?? mapDbStatusToUi(doc.Status);

  return {
    id: doc.DocId?.toString() ?? "",
    user: doc.Username ?? doc.Email ?? "",
    type: doc.DocType ?? "",
    submittedAt: doc.UploadedAt
      ? new Date(doc.UploadedAt).toLocaleString()
      : "",
    status,
  };
}

function mapVehicleDoc(doc: any): DocumentRow {
  return {
    id: doc.VehDocId?.toString() ?? "",
    user: doc.PlateNumber ?? doc.VehicleId ?? "",
    type: doc.DocType ?? "",
    submittedAt: doc.UploadedAt
      ? new Date(doc.UploadedAt).toLocaleString()
      : "",
    status: mapDbStatusToUi(doc.Status),
  };
}

export default function Documents() {
  const [docTab, setDocTab] = useState<DocTab>("person");
  const [statusTab, setStatusTab] = useState<StatusTab>("pending");
  const [selected, setSelected] = useState<DocumentRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ================= PERSON DOCUMENTS =================

  const pendingPersonDocsQuery = useQuery({
    queryKey: ["personDocuments", "pending"],
    queryFn: getPendingPersonDocuments,
  });

  const acceptedPersonDocsQuery = useQuery({
    queryKey: ["personDocuments", "approved"],
    queryFn: getAcceptedPersonDocuments,
  });

  const rejectedPersonDocsQuery = useQuery({
    queryKey: ["personDocuments", "rejected"],
    queryFn: getRejectedPersonDocuments,
  });

  const personDocs: DocumentRow[] = [
    ...(pendingPersonDocsQuery.data || []).map((doc: any) =>
      mapPersonDoc(doc, "pending")
    ),
    ...(acceptedPersonDocsQuery.data || []).map((doc: any) =>
      mapPersonDoc(doc, "approved")
    ),
    ...(rejectedPersonDocsQuery.data || []).map((doc: any) =>
      mapPersonDoc(doc, "rejected")
    ),
  ];

  // ================= VEHICLE DOCUMENTS =================

  // Despite the name, this endpoint returns ALL vehicle docs (pending/accepted/rejected)
  const vehicleDocsQuery = useQuery({
    queryKey: ["vehicleDocuments", "all"],
    queryFn: getPendingVehicleDocuments,
  });

  const vehicleDocs: DocumentRow[] = (vehicleDocsQuery.data || []).map(
    mapVehicleDoc
  );

  // ================= MERGE + FILTER FOR UI =================

  const docs = docTab === "person" ? personDocs : vehicleDocs;

  const filtered = docs.filter((d) => d.status === statusTab);

  function handleReview(row: DocumentRow) {
    setSelected(row);
    setModalOpen(true);
  }

  async function handleAction(action: "approve" | "reject") {
    setModalOpen(false);
    if (!selected) return;

    try {
      if (docTab === "person") {
        await reviewPersonDocument({
          docId: Number(selected.id),
          status: action === "approve" ? "Accepted" : "Rejected",
          comment: reviewComment,
        });
      } else {
        await reviewVehicleDocument({
          vehDocId: Number(selected.id),
          status: action === "approve" ? "Accepted" : "Rejected",
          comment: reviewComment,
        });
      }

      toast({
        title: `Document ${action === "approve" ? "approved" : "rejected"}`,
        description: `Document for ${selected.user} (${selected.type}) has been ${action}d.`,
      });

      // refetch person + vehicle docs
      queryClient.invalidateQueries();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to update document status",
        variant: "destructive",
      });
    }

    setReviewComment("");
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-neutral-950 text-neutral-50 px-6 py-6">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50 mb-2">
            Documents
          </h1>
          <p className="text-sm text-neutral-400">
            Review and manage pending document submissions
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <Tabs value={docTab} onValueChange={(v) => setDocTab(v as DocTab)}>
            <TabsList className="bg-neutral-900/80 border border-neutral-800 rounded-full p-1 inline-flex">
              <TabsTrigger
                value="person"
                className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
              >
                Person Documents
              </TabsTrigger>
              <TabsTrigger
                value="vehicle"
                className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
              >
                Vehicle Documents
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs
            value={statusTab}
            onValueChange={(v) => setStatusTab(v as StatusTab)}
          >
            <TabsList className="bg-neutral-900/80 border border-neutral-800 rounded-full p-1 inline-flex">
              <TabsTrigger
                value="pending"
                className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
              >
                Pending
              </TabsTrigger>
              <TabsTrigger
                value="approved"
                className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
              >
                Approved
              </TabsTrigger>
              <TabsTrigger
                value="rejected"
                className="rounded-full px-4 py-1.5 text-xs font-medium text-neutral-400 data-[state=active]:bg-neutral-50 data-[state=active]:text-neutral-900 transition-colors"
              >
                Rejected
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-lg p-0">
          <DocumentsTable
            data={filtered}
            onReview={statusTab === "pending" ? handleReview : undefined}
          />
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg border border-neutral-800 bg-neutral-900 text-neutral-50 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Review Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-neutral-400">User:</span>{" "}
              <span className="text-neutral-100 font-medium">
                {selected?.user}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-neutral-400">Type:</span>{" "}
              <span className="text-neutral-100 font-medium">
                {selected?.type}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-neutral-400">Submitted At:</span>{" "}
              <span className="text-neutral-100 font-medium">
                {selected?.submittedAt}
              </span>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="review-comment"
                className="text-neutral-200"
              >
                Review Comment (optional)
              </Label>
              <Textarea
                id="review-comment"
                placeholder="Add review comment..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500/40 min-h-24"
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => handleAction("reject")}
              className="border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 rounded-lg"
            >
              Reject
            </Button>
            <Button
              onClick={() => handleAction("approve")}
              className="bg-emerald-500 text-neutral-950 hover:bg-emerald-400 rounded-full px-4 py-2"
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
