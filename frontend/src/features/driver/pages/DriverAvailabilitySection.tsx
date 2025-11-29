// src/features/driver/pages/DriverAvailabilitySection.tsx
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  getDriverDailyAvailability,
  setDriverDailyAvailability,
  type DriverDailyAvailability,
} from "@/features/driver/api";
import { CalendarClock, Loader2 } from "lucide-react";

function getTodayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DriverAvailabilitySection() {
  const today = getTodayISODate();

  const [enabled, setEnabled] = useState(false);
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("18:00");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAvailability() {
    setLoading(true);
    setError(null);
    try {
      const res = await getDriverDailyAvailability(today);
      if (!res.success || !res.availability) {
        setEnabled(false);
        setStartTime("08:00");
        setEndTime("18:00");
        if (res.error) setError(res.error);
        return;
      }

      const av = res.availability;
      setEnabled(av.enabled);
      setStartTime(av.startTime ?? "08:00");
      setEndTime(av.endTime ?? "18:00");
    } catch (err: any) {
      console.error("Error loading daily availability:", err);
      setError(err?.message || "Failed to load availability.");
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: DriverDailyAvailability = {
        date: today,
        enabled,
        startTime: enabled ? startTime : null,
        endTime: enabled ? endTime : null,
      };

      const res = await setDriverDailyAvailability(payload);
      if (!res.success) {
        setError(res.error ?? "Failed to save availability.");
        toast.error("Failed to save availability.");
        return;
      }

      toast.success("Availability updated.");
    } catch (err: any) {
      console.error("Error saving daily availability:", err);
      setError(err?.message || "Failed to save availability.");
      toast.error("Failed to save availability.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border border-neutral-800 bg-neutral-900/80 p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900">
            <CalendarClock className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-50">
              Today&apos;s availability
            </h2>
            <p className="text-xs text-neutral-400">
              Set whether you can receive ride offers today and in which hours.
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Today: <span className="font-mono">{today}</span>
            </p>
          </div>
        </div>

        <Button
          size="sm"
          className="rounded-xl bg-neutral-900 text-neutral-200 border border-neutral-800 hover:bg-neutral-800 text-xs"
          onClick={loadAvailability}
          disabled={loading || saving}
          type="button"
        >
          {loading ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Refreshing
            </>
          ) : (
            "Reset from server"
          )}
        </Button>
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-400">
          {error}
        </p>
      )}

      {/* Toggle */}
      <div className="mb-4 flex items-center gap-3">
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={saving || loading}
        />
        <div>
          <p className="text-sm font-medium text-neutral-50">
            {enabled ? "Available today" : "Not available today"}
          </p>
          <p className="text-xs text-neutral-400">
            When disabled, you won&apos;t receive offers today.
          </p>
        </div>
      </div>

      {/* Time range */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-start">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-neutral-300">From</p>
          <Input
            type="time"
            className="h-9 bg-neutral-900 border-neutral-700 text-xs text-neutral-100"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={!enabled || saving || loading}
          />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-neutral-300">To</p>
          <Input
            type="time"
            className="h-9 bg-neutral-900 border-neutral-700 text-xs text-neutral-100"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={!enabled || saving || loading}
          />
        </div>
      </div>

      {/* Footer buttons */}
      <div className="mt-4 flex justify-end gap-3">
        <Button
          size="sm"
            className="
                rounded-xl
                bg-neutral-900 
                border border-neutral-700
                text-neutral-300
                hover:bg-neutral-800
                hover:text-neutral-200
                text-xs
            "
          type="button"
          disabled={saving || loading}
          onClick={() => {
            setEnabled(false);
            setStartTime("08:00");
            setEndTime("18:00");
          }}
        >
          Clear
        </Button>
        <Button
          size="sm"
          className="rounded-xl bg-emerald-500 text-neutral-950 hover:bg-emerald-400 text-xs font-semibold"
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Saving…
            </>
          ) : (
            "Save availability"
          )}
        </Button>
      </div>
    </Card>
  );
}
