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
    if (
      !name.trim() ||
      !description.trim() ||
      baseFare <= 0 ||
      perKm < 0 ||
      perMin < 0
    ) {
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        id: initial?.id,
        name,
        description,
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
      <DialogContent className="max-w-lg border border-gray-200 bg-white text-gray-900 shadow-2xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {initial ? "Edit Service Type" : "Add Service Type"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="st-name" className="text-gray-800">
              Name
            </Label>
            <Input
              id="st-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Simple Passenger, Luxury Passenger..."
              className="border-gray-300 bg-white text-gray-900 placeholder:text-gray-9000 focus-visible:ring-gray-500/40"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="st-description" className="text-gray-800">
              Description
            </Label>
            <Input
              id="st-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of service type"
              className="border-gray-300 bg-white text-gray-900 placeholder:text-gray-9000 focus-visible:ring-gray-500/40"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="st-basefare" className="text-gray-800">
                Base Fare
              </Label>
              <Input
                id="st-basefare"
                type="number"
                min={0}
                step="0.01"
                value={baseFare}
                onChange={(e) => setBaseFare(Number(e.target.value))}
                className="border-gray-300 bg-white text-gray-900 focus-visible:ring-gray-500/40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="st-perkm" className="text-gray-800">
                Per Km
              </Label>
              <Input
                id="st-perkm"
                type="number"
                min={0}
                step="0.01"
                value={perKm}
                onChange={(e) => setPerKm(Number(e.target.value))}
                className="border-gray-300 bg-white text-gray-900 focus-visible:ring-gray-500/40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="st-permin" className="text-gray-800">
                Per Min
              </Label>
              <Input
                id="st-permin"
                type="number"
                min={0}
                step="0.01"
                value={perMin}
                onChange={(e) => setPerMin(Number(e.target.value))}
                className="border-gray-300 bg-white text-gray-900 focus-visible:ring-gray-500/40"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="st-active" className="text-gray-800">
              Active
            </Label>
            <Switch
              id="st-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>
        </div>

        <DialogFooter className="mt-2 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="border-gray-300 bg-white text-gray-800 hover:bg-gray-100 rounded-lg px-4 py-2"
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
            className="bg-black text-white hover:bg-gray-800 rounded-lg px-4 py-2"
          >
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
