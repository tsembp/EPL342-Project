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
  getPendingVehicleDocuments,
  reviewPersonDocument,
  reviewVehicleDocument,
} from "@/lib/api";
import DocumentsTable, { DocumentRow } from "./DocumentsTable";
import { Textarea } from "@/components/ui/textarea";

type DocTab = "person" | "vehicle";
type StatusTab = "pending" | "approved" | "rejected";

function mapPersonDoc(doc: any): DocumentRow {
  return {
    id: doc.DocId?.toString() ?? "",
    user: doc.Username ?? doc.Email ?? "",
    type: doc.DocType ?? "",
    submittedAt: doc.UploadedAt ? new Date(doc.UploadedAt).toLocaleString() : "",
    status: doc.Status?.trim().toLowerCase() ?? "pending",
  };
}


function mapVehicleDoc(doc: any): DocumentRow {
  return {
    id: doc.VehDocId?.toString() ?? "",
    user: doc.PlateNumber ?? doc.VehicleId ?? "",
    type: doc.DocType ?? "",
    submittedAt: doc.UploadedAt ? new Date(doc.UploadedAt).toLocaleString() : "",
    status: doc.Status?.toLowerCase() ?? "pending",
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

  const personDocs = useQuery({
    queryKey: ["pendingPersonDocuments"],
    queryFn: getPendingPersonDocuments,
  });

  const vehicleDocs = useQuery({
    queryKey: ["pendingVehicleDocuments"],
    queryFn: getPendingVehicleDocuments,
  });

  const docs =
    docTab === "person"
      ? (personDocs.data || []).map(mapPersonDoc)
      : (vehicleDocs.data || []).map(mapVehicleDoc);

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
    <div className="space-y-4">
      {/* Filters row: document type + status side by side */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-4 items-center">
          <Tabs
            value={docTab}
            onValueChange={(v) => setDocTab(v as DocTab)}
          >
            <TabsList>
              <TabsTrigger value="person">Person Documents</TabsTrigger>
              <TabsTrigger value="vehicle">Vehicle Documents</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs
            value={statusTab}
            onValueChange={(v) => setStatusTab(v as StatusTab)}
          >
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Table (depends on both filters) */}
        <Card className="p-0">
          <DocumentsTable
            data={filtered}
            onReview={statusTab === "pending" ? handleReview : undefined}
          />
        </Card>
      </div>

      {/* Review dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              <b>User:</b> {selected?.user}
            </div>
            <div>
              <b>Type:</b> {selected?.type}
            </div>
            <div>
              <b>Submitted At:</b> {selected?.submittedAt}
            </div>
            <Textarea
              placeholder="Add review comment (optional)"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => handleAction("reject")}
            >
              Reject
            </Button>
            <Button onClick={() => handleAction("approve")}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
