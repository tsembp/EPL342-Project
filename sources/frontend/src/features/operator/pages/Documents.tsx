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
    <div className="min-h-full w-full bg-gray-50 text-gray-900 px-6 py-6">
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Documents
          </h1>
          <p className="text-sm text-gray-600">
            Review and manage pending document submissions
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <Tabs value={docTab} onValueChange={(v) => setDocTab(v as DocTab)}>
            <TabsList className="bg-white/80 border border-gray-200 rounded-lg p-1 inline-flex">
              <TabsTrigger
                value="person"
                className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 data-[state=active]:bg-black data-[state=active]:text-white transition-colors"
              >
                Person Documents
              </TabsTrigger>
              <TabsTrigger
                value="vehicle"
                className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 data-[state=active]:bg-black data-[state=active]:text-white transition-colors"
              >
                Vehicle Documents
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs
            value={statusTab}
            onValueChange={(v) => setStatusTab(v as StatusTab)}
          >
            <TabsList className="bg-white/80 border border-gray-200 rounded-lg p-1 inline-flex">
              <TabsTrigger
                value="pending"
                className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 data-[state=active]:bg-black data-[state=active]:text-white transition-colors"
              >
                Pending
              </TabsTrigger>
              <TabsTrigger
                value="approved"
                className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 data-[state=active]:bg-black data-[state=active]:text-white transition-colors"
              >
                Approved
              </TabsTrigger>
              <TabsTrigger
                value="rejected"
                className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 data-[state=active]:bg-black data-[state=active]:text-white transition-colors"
              >
                Rejected
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card className="w-full rounded-lg border border-gray-200 bg-white/80 shadow-sm p-0">
          <DocumentsTable
            data={filtered}
            onReview={statusTab === "pending" ? handleReview : undefined}
          />
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg border border-gray-200 bg-white text-gray-900 shadow-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Review Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-gray-600">User:</span>{" "}
              <span className="text-gray-900 font-medium">
                {selected?.user}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Type:</span>{" "}
              <span className="text-gray-900 font-medium">
                {selected?.type}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Submitted At:</span>{" "}
              <span className="text-gray-900 font-medium">
                {selected?.submittedAt}
              </span>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="review-comment"
                className="text-gray-800"
              >
                Review Comment (optional)
              </Label>
              <Textarea
                id="review-comment"
                placeholder="Add review comment..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="border-gray-300 bg-white text-gray-900 placeholder:text-gray-9000 focus-visible:ring-gray-500/40 min-h-24"
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => handleAction("reject")}
              className="border-gray-300 bg-white text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              Reject
            </Button>
            <Button
              onClick={() => handleAction("approve")}
              className="bg-black text-white hover:bg-gray-800 rounded-lg px-4 py-2"
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
