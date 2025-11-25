
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import EnrollmentsTable, { EnrollmentRow } from "./EnrollmentsTable";

const demoEnrollments: EnrollmentRow[] = [
  {
    id: "1",
    driver: "John Doe",
    vehicle: "ABC-1234",
    serviceType: "Standard",
    rideType: "Solo",
    requestedAt: "2024-06-01 10:00",
    status: "pending",
  },
  {
    id: "2",
    driver: "Jane Smith",
    vehicle: "XYZ-5678",
    serviceType: "Premium",
    rideType: "Shared",
    requestedAt: "2024-06-02 14:30",
    status: "approved",
  },
  {
    id: "3",
    driver: "Alex Brown",
    vehicle: "LMN-4321",
    serviceType: "Standard",
    rideType: "Solo",
    requestedAt: "2024-06-03 09:15",
    status: "rejected",
  },
  {
    id: "4",
    driver: "Maria Green",
    vehicle: "QRS-8765",
    serviceType: "Standard",
    rideType: "Shared",
    requestedAt: "2024-06-04 11:45",
    status: "pending",
  },
];

export default function Enrollments() {
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState<EnrollmentRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  const filtered = demoEnrollments.filter((e) => e.status === tab);

  function handleReview(row: EnrollmentRow) {
    setSelected(row);
    setModalOpen(true);
  }

  function handleAction(action: "approve" | "reject") {
    setModalOpen(false);
    toast({
      title: `Enrollment ${action === "approve" ? "approved" : "rejected"}`,
      description: `Enrollment for ${selected?.driver} (${selected?.vehicle}) has been ${action}d.`,
    });
    // Here you would update state or refetch data
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <Card className="p-0">
            <EnrollmentsTable
              data={filtered}
              // @ts-ignore
              onReview={handleReview}
            />
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
            <div><b>Requested At:</b> {selected?.requestedAt}</div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => handleAction("reject")}>Reject</Button>
            <Button onClick={() => handleAction("approve")}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
