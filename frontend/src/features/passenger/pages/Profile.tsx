import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Car, Download, FileText, Loader2, LogOut, User } from "lucide-react";
import {
  getSelfDriveStatus,
  uploadPassengerLicense,
  type SelfDriveStatus,
  getPassengerPreferences,
  updatePassengerPreferences,
  type UserPreferences,
} from "@/features/passenger/api";

export default function Profile() {
  const navigate = useNavigate();
  const { email, userRole, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const [selfDriveStatus, setSelfDriveStatus] =
    useState<SelfDriveStatus | null>(null);
  const [selfDriveError, setSelfDriveError] = useState<string | null>(null);

  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [licenseSubmitting, setLicenseSubmitting] = useState(false);
  const [licenseForm, setLicenseForm] = useState<{
    docNumber: string;
    issueDate: string;
    expiryDate: string;
    file: File | null;
  }>({
    docNumber: "",
    issueDate: "",
    expiryDate: "",
    file: null,
  });

  // Preferences state
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [locEnabled, setLocEnabled] = useState(false);

  // Load current self-drive status when profile opens
  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      try {
        const res = await getSelfDriveStatus();
        if (cancelled) return;

        if (!res.success) {
          setSelfDriveError(res.reason || "Could not load self-drive status.");
        } else {
          setSelfDriveStatus(res);
          setSelfDriveError(null);
        }
      } catch (err: any) {
        if (cancelled) return;
        setSelfDriveError(
          err?.message || "Could not load self-drive status."
        );
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load passenger preferences when profile opens
  useEffect(() => {
    let cancelled = false;

    const loadPrefs = async () => {
      setPrefsLoading(true);
      try {
        const prefs = await getPassengerPreferences();
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
    <div className="h-screen flex flex-col bg-neutral-950 text-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-900 bg-neutral-950 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight">
            OSRH | Profile
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* User info */}
          <Card className="p-6 border border-neutral-800 bg-neutral-900/80 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center">
                <User className="h-8 w-8 text-emerald-500" />
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-semibold text-neutral-50">
                  User Account
                </h2>
                <p className="text-sm text-neutral-400">{email}</p>
                <div className="mt-2 flex items-center gap-2">
                  {/* Role Badge */}
                  <Badge
                    variant="outline"
                    className="border-neutral-700 bg-neutral-900 text-neutral-200"
                  >
                    {userRole === "passenger" ? "Passenger" : "Driver"}
                  </Badge>

                  {/* Verification Badge — only show for passengers */}
                  {userRole === "passenger" && selfDriveStatus && (
                    selfDriveStatus.eligible ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-600 text-emerald-400 bg-neutral-900"
                      >
                        Verified
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-yellow-600 text-yellow-400 bg-neutral-900"
                      >
                        Unverified
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            {/* Verification for car rental service */}
            <Card className="p-4 border border-neutral-800 bg-neutral-900/80">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Car className="h-5 w-5 text-emerald-500" />
                  <div>
                    <h3 className="font-semibold text-neutral-50">
                      Self-drive rentals (no driver)
                    </h3>
                    <p className="text-sm text-neutral-400">
                      Upload your driving licence to get verified
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 w-full sm:mt-0 sm:w-auto border border-emerald-500 bg-neutral-900 text-emerald-400 hover:bg-neutral-800 group"
                  onClick={() => setLicenseModalOpen(true)}
                >
                  {selfDriveStatus?.hasLicense ? "Update licence" : "Get verified"}
                  <span className="ml-1 inline-block transition-transform group-hover:-rotate-45 align-middle">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 12h14M12 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </Button>
              </div>
            </Card>

            {/* User Preferences */}
            <Card className="p-4 border border-neutral-800 bg-neutral-900/80">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-neutral-50">
                      User preferences
                    </h3>
                    <p className="text-sm text-neutral-400">
                      Control notifications and location usage
                    </p>
                  </div>
                  {prefsLoading && (
                    <span className="text-xs text-neutral-500">Loading…</span>
                  )}
                </div>

                <div className="mt-2 space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
                      checked={notificationsEnabled}
                      onChange={(e) =>
                        setNotificationsEnabled(e.target.checked)
                      }
                      disabled={prefsLoading || prefsSaving}
                    />
                    <span className="text-neutral-200">
                      Enable notifications
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
                      checked={locEnabled}
                      onChange={(e) => setLocEnabled(e.target.checked)}
                      disabled={prefsLoading || prefsSaving}
                    />
                    <span className="text-neutral-200">
                      Allow location during rides
                    </span>
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-neutral-50 border-none"
                    disabled={prefsLoading || prefsSaving}
                    onClick={async () => {
                      try {
                        setPrefsSaving(true);
                        const res = await updatePassengerPreferences({
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

            {/* GDPR Request */}
            <Card
              className="p-4 cursor-pointer border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-900 transition-colors"
              onClick={() =>
                navigate("/gdpr", { state: { backTo: "/profile" } })
              }
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-emerald-500" />
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-50">
                    GDPR request
                  </h3>
                  <p className="text-sm text-neutral-400">
                    Submit a data request
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="p-4 cursor-pointer border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-900 transition-colors"
              onClick={() => navigate("/gdpr/export")}
            >
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-emerald-500" />
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-50">
                    Download my data
                  </h3>
                  <p className="text-sm text-neutral-400">
                    View or export the data stored about your account
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Logout */}
          <div className="flex justify-center">
            <button
              onClick={handleLogout}
              className="
                flex items-center gap-1 px-4 py-2 rounded-xl text-sm
                text-red-400
                transition-all duration-150
                hover:bg-red-900/20
                hover:text-red-300
                hover:border-red-700
              "
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
      <Dialog open={licenseModalOpen} onOpenChange={setLicenseModalOpen}>
        <DialogContent className="max-w-lg border border-neutral-800 bg-neutral-900 text-neutral-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              Driving licence verification
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-400">
              Upload your driving licence so we can verify you for{" "}
              <span className="font-semibold text-neutral-200">
                self-drive rides
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();

              if (!licenseForm.file) {
                toast.error("Please select a file for your driving licence.");
                return;
              }
              if (!licenseForm.docNumber) {
                toast.error("Please enter the licence number.");
                return;
              }
              if (!licenseForm.issueDate || !licenseForm.expiryDate) {
                toast.error("Please provide issue and expiry dates.");
                return;
              }

              try {
                setLicenseSubmitting(true);

                const res = await uploadPassengerLicense({
                  docNumber: licenseForm.docNumber,
                  issueDate: licenseForm.issueDate,
                  expiryDate: licenseForm.expiryDate,
                  file: licenseForm.file,
                });

                if (!res.success) {
                  toast.error(res.error || "Failed to upload licence.");
                  setLicenseSubmitting(false);
                  return;
                }

                toast.success(
                  "Driving licence uploaded. We will review it shortly."
                );

                // refresh status
                try {
                  const status = await getSelfDriveStatus();
                  if (status.success) {
                    setSelfDriveStatus(status);
                    setSelfDriveError(null);
                  } else {
                    setSelfDriveError(
                      status.reason || "Could not refresh status."
                    );
                  }
                } catch (err: any) {
                  setSelfDriveError(
                    err?.message || "Could not refresh status."
                  );
                }

                setLicenseModalOpen(false);
                setLicenseSubmitting(false);
              } catch (err: any) {
                setLicenseSubmitting(false);
                toast.error(
                  err?.message ||
                    "Unexpected error while uploading your licence."
                );
              }
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="docNumber">Licence number</Label>
                <Input
                  id="docNumber"
                  value={licenseForm.docNumber}
                  onChange={(e) =>
                    setLicenseForm((prev) => ({
                      ...prev,
                      docNumber: e.target.value,
                    }))
                  }
                  placeholder="e.g. CY123456"
                  className="bg-neutral-800 text-neutral-100 border border-neutral-700 placeholder-neutral-400 focus:bg-neutral-700"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="issueDate">Issue date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={licenseForm.issueDate}
                  onChange={(e) =>
                    setLicenseForm((prev) => ({
                      ...prev,
                      issueDate: e.target.value,
                    }))
                  }
                  className="bg-neutral-800 text-neutral-100 border border-neutral-700 placeholder-neutral-400 focus:bg-neutral-700"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expiryDate">Expiry date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={licenseForm.expiryDate}
                  onChange={(e) =>
                    setLicenseForm((prev) => ({
                      ...prev,
                      expiryDate: e.target.value,
                    }))
                  }
                  className="bg-neutral-800 text-neutral-100 border border-neutral-700 placeholder-neutral-400 focus:bg-neutral-700"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="licenceFile">Licence file (PDF / image)</Label>
                <Input
                  id="licenceFile"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) =>
                    setLicenseForm((prev) => ({
                      ...prev,
                      file: e.target.files?.[0] ?? null,
                    }))
                  }
                  className="bg-neutral-800 text-neutral-100 border border-neutral-700 placeholder-neutral-400 focus:bg-neutral-700 file:bg-neutral-700 file:text-neutral-200"
                />
              </div>
            </div>

            <DialogFooter className="mt-2 flex items-center justify-between">
              <Button
                type="submit"
                disabled={licenseSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-neutral-50 border-none"
              >
                {licenseSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  "Submit licence"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
