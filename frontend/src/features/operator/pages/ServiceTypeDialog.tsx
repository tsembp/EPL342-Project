import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ServiceTypeRow } from "./ServiceTypesTable";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ServiceTypeRow | null;
  onSave: (values: {
    id?: string;
    name: string;
    description: string;
    baseFare: number;
    perKm: number;
    perMin: number;
    active: boolean;
  }) => Promise<void>;
};

export default function ServiceTypeDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseFare, setBaseFare] = useState<number>(0);
  const [perKm, setPerKm] = useState<number>(0);
  const [perMin, setPerMin] = useState<number>(0);
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setDescription(initial.description ?? "");
      setBaseFare(initial.baseFare ?? 0);
      setPerKm(initial.perKm ?? 0);
      setPerMin(initial.perMin ?? 0);
      setActive(initial.active);
    } else {
      setName("");
      setDescription("");
      setBaseFare(0);
      setPerKm(0);
      setPerMin(0);
      setActive(true);
    }
  }, [initial, open]);

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim()) return;
    if (baseFare <= 0 || perKm < 0 || perMin < 0) return;

    setSubmitting(true);
    try {
      await onSave({
        id: initial?.id,
        name: name.trim(),
        description: description.trim(),
        baseFare,
        perKm,
        perMin,
        active,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit Service Type" : "Add Service Type"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="st-name">Name</Label>
            <Input
              id="st-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Simple Passenger, Luxury Passenger..."
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="st-description">Description</Label>
            <Input
              id="st-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of service type"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="st-basefare">Base Fare</Label>
              <Input
                id="st-basefare"
                type="number"
                min={0}
                step="0.01"
                value={baseFare}
                onChange={(e) => setBaseFare(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="st-perkm">Per Km</Label>
              <Input
                id="st-perkm"
                type="number"
                min={0}
                step="0.01"
                value={perKm}
                onChange={(e) => setPerKm(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="st-permin">Per Min</Label>
              <Input
                id="st-permin"
                type="number"
                min={0}
                step="0.01"
                value={perMin}
                onChange={(e) => setPerMin(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="st-active">Active</Label>
            <Switch
              id="st-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !name.trim() ||
              !description.trim() ||
              baseFare <= 0 ||
              perKm < 0 ||
              perMin < 0
            }
          >
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
