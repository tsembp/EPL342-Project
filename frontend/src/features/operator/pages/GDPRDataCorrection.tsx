import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, User, Mail, CheckCircle2, XCircle } from "lucide-react";
import {
  getGdprRequests,
  reviewGdprRequest,
  type OperatorGdprRequest,
} from "@/features/operator/api";

export function GDPRDataCorrection() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<OperatorGdprRequest[]>({
    queryKey: ["operator", "gdpr-requests"],
    queryFn: () => getGdprRequests(),
  });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [action, setAction] = useState<"Completed" | "Denied" | null>(null);
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: (params: {
      gdprId: number;
      status: "Completed" | "Denied";
      note?: string;
    }) => reviewGdprRequest(params),
    onSuccess: () => {
      toast.success("GDPR request updated");
      queryClient.invalidateQueries({ queryKey: ["operator", "gdpr-requests"] });
      setSelectedId(null);
      setAction(null);
      setNote("");
    },
    onError: () => {
      toast.error("Failed to update GDPR request");
    },
  });

  const openDialog = (id: number, status: "Completed" | "Denied") => {
    setSelectedId(id);
    setAction(status);
    setNote("");
  };

  const onConfirm = () => {
    if (!selectedId || !action) return;
    mutation.mutate({ gdprId: selectedId, status: action, note });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-sm text-red-400">Failed to load GDPR requests.</div>;
  }

  // Only show DataCorrection requests
  const requests = (data ?? []).filter((r) => r.Type === "DataCorrection");

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border border-neutral-800 bg-neutral-900/80 p-4 shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-neutral-50">
              GDPR Data Correction Requests
            </h2>
            <p className="text-sm text-neutral-400">
              Review users&apos; data correction requests. First update their data in the
              relevant profile screens, then mark the request as completed or denied.
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-emerald-500/50 text-xs text-emerald-400"
          >
            Pending: {requests.length}
          </Badge>
        </div>
      </Card>

      {/* Requests list */}
      <div className="space-y-2">
        {requests.length === 0 ? (
          <Card className="border border-neutral-800 bg-neutral-900/80 p-4">
            <p className="text-sm text-neutral-400">
              There are no pending data correction requests.
            </p>
          </Card>
        ) : (
          requests.map((r) => (
            <Card
              key={r.GdprId}
              className="border border-neutral-800 bg-neutral-900/80 p-4 hover:border-emerald-500/40 transition-colors"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                {/* Left: user info + reason */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900">
                      <User className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-50">
                          {r.Username}
                        </span>
                        <Badge
                          variant="outline"
                          className="border-neutral-700 text-[11px] uppercase text-neutral-300"
                        >
                          {r.Type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-neutral-400">
                        <Mail className="h-3 w-3" />
                        <span>{r.Email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-neutral-300">
                    <span className="font-medium text-neutral-200">
                      Requested corrections:
                    </span>{" "}
                    {r.Reason && r.Reason.trim().length > 0 ? (
                      r.Reason
                    ) : (
                      <span className="italic text-neutral-500">
                        (no details provided)
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-neutral-500">
                    Requested at: {new Date(r.RequestedAt).toLocaleString()}
                  </div>
                </div>

                {/* Right: status + actions */}
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant="outline"
                    className="border-neutral-700 bg-neutral-900 text-xs text-neutral-300"
                  >
                    {r.Status}
                  </Badge>

                  <div className="flex gap-2">
                    <Button
                        size="sm"
                        className="
                            bg-emerald-600/20 
                            text-emerald-300 
                            hover:bg-emerald-600/30 
                            border border-emerald-700/40
                            backdrop-blur-sm
                        "
                        onClick={() => openDialog(r.GdprId, "Completed")}
                        >
                        <CheckCircle2 className="mr-1 h-4 w-4 text-emerald-300" />
                        Mark completed
                        </Button>

                        <Button
                        size="sm"
                        className="
                            bg-red-600/20 
                            text-red-300 
                            hover:bg-red-600/30 
                            border border-red-700/40
                            backdrop-blur-sm
                        "
                        onClick={() => openDialog(r.GdprId, "Denied")}
                        >
                        <XCircle className="mr-1 h-4 w-4 text-red-300" />
                        Deny
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Dialog for note */}
      <Dialog
        open={!!selectedId && !!action}
        onOpenChange={() => {
          setSelectedId(null);
          setAction(null);
          setNote("");
        }}
      >
        <DialogContent className="border border-neutral-800 bg-neutral-900">
          <DialogHeader>
            <DialogTitle className="text-neutral-50">
              {action === "Completed"
                ? "Mark request as completed"
                : "Deny data correction request"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-neutral-300">
              Optionally add an internal note about what you changed in the user&apos;s
              data or why the request is denied.
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Example: Updated surname and phone number in user profile..."
              className="min-h-[100px] border-neutral-700 bg-neutral-900 text-sm text-neutral-100"
            />
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            {/* Cancel */}
            <Button
                size="sm"
                onClick={() => {
                setSelectedId(null);
                setAction(null);
                setNote("");
                }}
                className="
                bg-neutral-800
                text-neutral-300
                border border-neutral-700
                hover:bg-neutral-700 
                hover:text-neutral-200
                backdrop-blur-sm
                "
            >
                Cancel
            </Button>

            {/* Confirm */}
            <Button
                size="sm"
                onClick={onConfirm}
                disabled={mutation.isPending}
                className="
                bg-emerald-600/20
                text-emerald-300
                border border-emerald-700/40
                hover:bg-emerald-600/30
                disabled:opacity-50
                backdrop-blur-sm
                "
            >
                {mutation.isPending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-emerald-300" />
                    Saving...
                </>
                ) : (
                "Confirm"
                )}
            </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
