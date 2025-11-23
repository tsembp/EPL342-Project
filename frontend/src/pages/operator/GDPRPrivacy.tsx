
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import GDPRPrivacyTable, { GDPRRow } from "./GDPRPrivacyTable";

const demoGDPR: GDPRRow[] = [
  {
    id: "1",
    user: "John Doe",
    requestType: "Data Deletion",
    requestedAt: "2025-11-20 09:00",
    status: "pending",
  },
  {
    id: "2",
    user: "Jane Smith",
    requestType: "Data Export",
    requestedAt: "2025-11-18 15:30",
    status: "completed",
  },
  {
    id: "3",
    user: "Alex Brown",
    requestType: "Preference Update",
    requestedAt: "2025-11-17 12:10",
    status: "rejected",
  },
  {
    id: "4",
    user: "Maria Green",
    requestType: "Data Export",
    requestedAt: "2025-11-21 10:45",
    status: "pending",
  },
];

export default function GDPRPrivacy() {
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState<GDPRRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  const filtered = demoGDPR.filter((d) => d.status === tab);

  function handleReview(row: GDPRRow) {
    setSelected(row);
    setModalOpen(true);
  }

  function handleAction(action: "complete" | "reject") {
    setModalOpen(false);
    toast({
      title: `Request ${action === "complete" ? "completed" : "rejected"}`,
      description: `GDPR request for ${selected?.user} (${selected?.requestType}) has been ${action === "complete" ? "completed" : "rejected"}.`,
    });
    // Here you would update state or refetch data
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
            <div><b>Requested At:</b> {selected?.requestedAt}</div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => handleAction("reject")}>Reject</Button>
            <Button onClick={() => handleAction("complete")}>Mark as Completed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
