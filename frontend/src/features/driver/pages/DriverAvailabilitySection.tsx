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
  getDriverServiceEnrollments,
  type DriverServiceEnrollment,
  cancelDriverServiceEnrollment,
  confirmDriverDailyAvailability,
} from "@/features/driver/api";
import { CalendarClock, Loader2, Lock } from "lucide-react";

function getTodayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DriverAvailabilitySection() {
  const today = getTodayISODate();

  const [enrollments, setEnrollments] = useState<DriverServiceEnrollment[]>([]);
  const [selectedEnrollId, setSelectedEnrollId] = useState<number | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("18:00");
  const [locked, setLocked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approvedEnrollments = enrollments.filter(
    (en) => en.Status === "Approved"
  );
  const pendingEnrollments = enrollments.filter(
    (en) => en.Status === "Pending"
  );

  async function loadAvailability() {
    setLoading(true);
    setError(null);
    try {
      const [enrollRes, availRes] = await Promise.all([
        getDriverServiceEnrollments(),
        getDriverDailyAvailability(today),
      ]);

      // Enrollments
      if (!enrollRes.success) {
        setEnrollments([]);
        if (enrollRes.error) {
          setError((prev) => prev ?? enrollRes.error);
        }
      } else {
        setEnrollments(enrollRes.enrollments ?? []);
      }

      // Availability
      if (!availRes.success || !availRes.availability) {
        setEnabled(false);
        setStartTime("08:00");
        setEndTime("18:00");
        setSelectedEnrollId(null);
        setLocked(false);
        if (availRes.error) {
          setError((prev) => prev ?? availRes.error);
        }
      } else {
        const av = availRes.availability;
        setEnabled(av.enabled);
        setStartTime(av.startTime ?? "08:00");
        setEndTime(av.endTime ?? "18:00");
        setSelectedEnrollId(av.enrollId ?? null);
        setLocked(Boolean(av.locked));
      }
    } catch (err: any) {
      console.error("Error loading daily availability:", err);
      setEnabled(false);
      setStartTime("08:00");
      setEndTime("18:00");
      setSelectedEnrollId(null);
      setLocked(false);
      setError(err?.message || "Failed to load availability.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConfirm() {
    setSaving(true);
    setError(null);

    try {
      if (locked) {
        toast.error("Today's availability is already confirmed.");
        setSaving(false);
        return;
      }

      if (enabled) {
        if (approvedEnrollments.length === 0) {
          const msg =
            "You have no approved service enrollments yet. Once your documents are approved, you'll be able to set availability.";
          setError(msg);
          toast.error(msg);
          setSaving(false);
          return;
        }

        if (!selectedEnrollId) {
          const msg = "Please select which service you are available for.";
          setError(msg);
          toast.error(msg);
          setSaving(false);
          return;
        }
      }

      // 1) Save / update the availability
      const payload: DriverDailyAvailability = {
        date: today,
        enabled,
        enrollId: enabled ? selectedEnrollId : null,
        startTime: enabled ? startTime : null,
        endTime: enabled ? endTime : null,
      };

      const saveRes = await setDriverDailyAvailability(payload);
      if (!saveRes.success) {
        const msg = saveRes.error ?? "Failed to save availability.";
        setError(msg);
        toast.error(msg);
        return;
      }

      // 2) Confirm (lock) it in the backend
      const confirmRes = await confirmDriverDailyAvailability(today);
      if (!confirmRes.success) {
        const msg = confirmRes.error ?? "Failed to confirm availability.";
        setError(msg);
        toast.error(msg);
        return;
      }

      setLocked(true);
      toast.success("Today's availability confirmed and locked.");
    } catch (err: any) {
      console.error("Error confirming availability:", err);
      const msg = err?.message || "Failed to confirm availability.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelEnrollment(enrollId: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await cancelDriverServiceEnrollment(enrollId);
      if (!res.success) {
        const msg = res.error ?? "Failed to cancel enrollment.";
        setError(msg);
        toast.error(msg);
        return;
      }

      toast.success("Enrollment cancelled.");
      await loadAvailability();
    } catch (err: any) {
      console.error("Error cancelling enrollment:", err);
      const msg = err?.message || "Failed to cancel enrollment.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const controlsDisabled = saving || loading || locked;

  return (
    <Card className="border border-gray-200 bg-white p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
            <CalendarClock className="h-4 w-4 text-black" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Today&apos;s availability
            </h2>
            <p className="text-xs text-gray-600">
              {locked
                ? "Today's availability is confirmed and cannot be changed."
                : "Set whether you can receive ride offers today, for which service, and in which hours."}
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              Today: <span className="font-mono">{today}</span>
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="border-gray-300 bg-white text-gray-900 hover:bg-gray-50 text-xs"
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

      {locked && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2">
          <Lock className="h-3 w-3 text-gray-700" />
          <p className="text-[11px] text-gray-700">
            Today&apos;s availability is{" "}
            <span className="font-semibold">confirmed</span>. You can&apos;t
            edit it anymore.
          </p>
        </div>
      )}

      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      {/* Toggle */}
      <div className="mb-4 flex items-center gap-3">
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={controlsDisabled}
        />
        <div>
          <p className="text-sm font-medium text-gray-900">
            {enabled ? "Available today" : "Not available today"}
          </p>
          <p className="text-xs text-gray-600">
            When disabled, you won&apos;t receive offers today.
          </p>
        </div>
      </div>

      {/* Enrollment selector (Approved only) */}
      <div className="mb-4">
        <p className="mb-1 text-xs font-medium text-gray-700">
          Service for this day
        </p>

        {approvedEnrollments.length === 0 ? (
          <p className="text-xs text-gray-500">
            You have no approved service enrollments yet. Once your documents
            are approved, you&apos;ll be able to set availability.
          </p>
        ) : (
          <select
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:border-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            value={selectedEnrollId ?? ""}
            onChange={(e) =>
              setSelectedEnrollId(
                e.target.value ? Number(e.target.value) : null
              )
            }
            disabled={controlsDisabled || !enabled}
          >
            <option value="">Select service</option>
            {approvedEnrollments.map((en) => (
              <option key={en.EnrollId} value={en.EnrollId}>
                {en.VehiclePlate} – {en.ServiceTypeName} ({en.RideTypeName})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Pending enrollments with cancel option */}
      {pendingEnrollments.length > 0 && (
        <div className="mb-4 rounded-lg border border-gray-300 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium text-gray-900">
            Pending enrollments
          </p>
          <p className="mb-2 text-[11px] text-gray-600">
            You can cancel pending enrollments. Once an enrollment is reviewed
            (approved or rejected), it can&apos;t be cancelled.
          </p>
          <div className="space-y-2">
            {pendingEnrollments.map((en) => (
              <div
                key={en.EnrollId}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-xs text-gray-900">
                    {en.VehiclePlate} – {en.ServiceTypeName} ({en.RideTypeName})
                  </span>
                  <span className="text-[10px] text-gray-600">
                    Status: {en.Status}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
                  type="button"
                  disabled={loading || saving || locked}
                  onClick={() => handleCancelEnrollment(en.EnrollId)}
                >
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time range */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-start">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-gray-700">From</p>
          <Input
            type="time"
            className="h-9 bg-white border-gray-300 text-sm text-gray-900"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={controlsDisabled || !enabled}
          />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-gray-700">To</p>
          <Input
            type="time"
            className="h-9 bg-white border-gray-300 text-sm text-gray-900"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={controlsDisabled || !enabled}
          />
        </div>
      </div>

      {/* Footer buttons */}
      <div className="mt-4 flex justify-end gap-3">
        <Button
          size="sm"
          variant="outline"
          className="border-gray-300 bg-white text-gray-900 hover:bg-gray-50 text-xs"
          type="button"
          disabled={controlsDisabled}
          onClick={() => {
            setEnabled(false);
            setStartTime("08:00");
            setEndTime("18:00");
            setSelectedEnrollId(null);
          }}
        >
          Clear
        </Button>

        <Button
          size="sm"
          className="bg-black text-white hover:bg-gray-800 text-xs font-semibold"
          type="button"
          onClick={handleConfirm}
          disabled={controlsDisabled}
        >
          {saving ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Confirming…
            </>
          ) : (
            "Confirm availability"
          )}
        </Button>
      </div>
    </Card>
  );
}
