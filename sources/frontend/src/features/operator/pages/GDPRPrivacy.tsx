import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGdprRequests, reviewGdprRequest } from "@/features/operator/api";
import GDPRPrivacyTable, { GDPRRow } from "./GDPRPrivacyTable";

export default function GDPRPrivacy() {
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState<GDPRRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["gdprRequests"],
    queryFn: getGdprRequests,
  });


  const allRows: GDPRRow[] = (data || []).map((row: any) => {
    const rawStatus = (row.Status ?? row.status ?? "Pending").toString().toLowerCase();

    const status =
      rawStatus === "denied"
        ? "rejected"
        : rawStatus === "completed"
        ? "completed"
        : "pending";

    return {
      id: row.GdprId?.toString() ?? row.id?.toString() ?? "",
      user: row.Username ?? row.Email ?? row.user ?? "Unknown",
      requestType: row.Type ?? row.requestType ?? "Unknown",
      requestedAt: row.RequestedAt
        ? new Date(row.RequestedAt).toLocaleString()
        : row.requestedAt ?? "",
      status,                      // now matches tab values
      reason: row.Reason ?? row.reason ?? "",
    };
  });


  const filtered = allRows.filter((r) => r.status === tab);

  function handleReview(row: GDPRRow) {
    setSelected(row);
    setModalOpen(true);
  }

  async function handleAction(action: "complete" | "reject") {
    setModalOpen(false);
    if (!selected) return;
    try {
      await reviewGdprRequest({
        gdprId: Number(selected.id),
        status: action === "complete" ? "Completed" : "Denied",
        note: reviewNote,
      });
      toast({
        title: `Request ${action === "complete" ? "completed" : "rejected"}`,
        description: `GDPR request for ${selected.user} (${selected.requestType}) has been ${action === "complete" ? "completed" : "rejected"}.`,
      });
      setReviewNote("");
      queryClient.invalidateQueries({ queryKey: ["gdprRequests"] });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to update GDPR request status",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <Card className="p-0">
            <GDPRPrivacyTable data={filtered} onReview={handleReview} />
          </Card>
        </TabsContent>
        <TabsContent value="completed">
          <Card className="p-0">
            <GDPRPrivacyTable data={filtered} />
          </Card>
        </TabsContent>
        <TabsContent value="rejected">
          <Card className="p-0">
            <GDPRPrivacyTable data={filtered} />
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review GDPR Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div><b>User:</b> {selected?.user}</div>
            <div><b>Request Type:</b> {selected?.requestType}</div>
            <div><b>Reason:</b> {selected?.reason}</div>
            <Textarea
              placeholder="Add a note (optional)"
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              className="min-h-24"
            />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => handleAction("reject")}>Reject</Button>
            <Button onClick={() => handleAction("complete")}>Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}