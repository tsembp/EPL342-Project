import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Download, LogOut, Loader2 } from "lucide-react";
import {
  getDriverPreferences,
  updateDriverPreferences,
  type UserPreferences,
} from "@/features/driver/api";

export default function DriverProfile() {
  const navigate = useNavigate();
  const { email, userRole, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const roleLabel =
    userRole === "driver"
      ? "Driver"
      : userRole === "passenger"
      ? "Passenger"
      : userRole === "operator"
      ? "Operator"
      : "User";

  // Preferences state
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [locEnabled, setLocEnabled] = useState(false);

  // Load driver preferences on mount
  useEffect(() => {
    let cancelled = false;

    const loadPrefs = async () => {
      setPrefsLoading(true);
      try {
        const prefs = await getDriverPreferences();
        if (cancelled) return;
        setNotificationsEnabled(prefs.notificationsEnabled);
        setLocEnabled(prefs.locEnabled);
      } catch (err: any) {
        if (cancelled) return;
        console.error(err);
        toast.error(err?.message || "Could not load preferences.");
      } finally {
        if (!cancelled) {
          setPrefsLoading(false);
        }
      }
    };

    void loadPrefs();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full space-y-3">
      {/* DRIVER PREFERENCES CARD */}
      <Card className="w-full border border-neutral-800 bg-neutral-900/80 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-neutral-50">
                Driver preferences
              </p>
              <p className="text-xs text-neutral-400">
                Control notifications and live location usage
              </p>
            </div>
            {prefsLoading && (
              <span className="text-[11px] text-neutral-500">Loading…</span>
            )}
          </div>

          <div className="mt-1 space-y-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                disabled={prefsLoading || prefsSaving}
              />
              <span className="text-neutral-200">
                Enable dispatch / ride notifications
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs sm:text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
                checked={locEnabled}
                onChange={(e) => setLocEnabled(e.target.checked)}
                disabled={prefsLoading || prefsSaving}
              />
              <span className="text-neutral-200">
                Allow live vehicle location updates
              </span>
            </label>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-neutral-50 border-none"
              disabled={prefsLoading || prefsSaving}
              onClick={async () => {
                try {
                  setPrefsSaving(true);
                  const res = await updateDriverPreferences({
                    notificationsEnabled,
                    locEnabled,
                  });
                  if (!res.success) {
                    throw new Error(res.error || "Failed to save.");
                  }
                  toast.success("Preferences saved.");
                } catch (err: any) {
                  console.error(err);
                  toast.error(
                    err?.message || "Failed to save preferences."
                  );
                } finally {
                  setPrefsSaving(false);
                }
              }}
            >
              {prefsSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save preferences"
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* GDPR REQUEST CARD */}
      <Card
        role="button"
        tabIndex={0}
        onClick={() =>
          navigate("/gdpr", {
            state: { backTo: "/driver/dashboard?tab=profile" },
          })
        }
        className="w-full cursor-pointer border border-neutral-800 bg-neutral-900/80 px-5 py-4 sm:px-6 sm:py-5 transition-colors hover:bg-neutral-850 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800">
            <FileText className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-50">
              GDPR request
            </p>
            <p className="text-xs text-neutral-400">Submit a data request</p>
          </div>
        </div>
      </Card>

      {/* DOWNLOAD DATA CARD */}
      <Card
        role="button"
        tabIndex={0}
        onClick={() => navigate("/gdpr-export")}
        className="w-full cursor-pointer border border-neutral-800 bg-neutral-900/80 px-5 py-4 sm:px-6 sm:py-5 transition-colors hover:bg-neutral-850 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800">
            <Download className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-50">
              Download my data
            </p>
            <p className="text-xs text-neutral-400">
              View or export the data stored about your account
            </p>
          </div>
        </div>
      </Card>

      {/* SIGN OUT FULL-WIDTH BAR */}
      <Card className="w-full border border-neutral-800 bg-neutral-900/80 px-5 py-3 sm:px-6">
        <Button
          variant="ghost"
          className="w-full justify-center gap-2 text-sm font-medium text-neutral-50 hover:bg-neutral-800"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </Card>
    </div>
  );
}
