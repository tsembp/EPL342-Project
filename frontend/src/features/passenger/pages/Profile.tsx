import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";
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
import { Car, Download, FileText, Loader2, LogOut, User, ArrowLeft } from "lucide-react";
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
    <div className="flex h-full flex-col bg-gray-50 text-gray-900">
      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-8 py-8">
          {/* Account Info Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Information</h2>
            <Card className="p-6 border border-gray-200 bg-white">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-full border-2 border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <User className="h-8 w-8 text-gray-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{email}</h3>
                    <Badge
                      variant="outline"
                      className="border-gray-300 bg-gray-50 text-gray-700"
                    >
                      {userRole === "passenger" ? "Passenger" : "Driver"}
                    </Badge>
                  </div>
                  {userRole === "passenger" && selfDriveStatus && (
                    <div className="mt-3">
                      {selfDriveStatus.eligible ? (
                        <Badge className="border-gray-200 bg-gray-50 text-gray-900">
                          ✓ Self-Drive Verified
                        </Badge>
                      ) : (
                        <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                          Pending Verification
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </Card>
          </div>

          {/* Verification & Services Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verification & Services</h2>
            <Card className="p-6 border border-gray-200 bg-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Car className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Self-Drive Verification
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload your driving licence to rent vehicles without a driver
                  </p>
                  <Button
                    className="bg-black text-white hover:bg-gray-800"
                    onClick={() => setLicenseModalOpen(true)}
                  >
                    {selfDriveStatus?.hasLicense ? "Update Licence" : "Get Verified"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Preferences Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Preferences</h2>

            <Card className="p-6 border border-gray-200 bg-white">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      App Preferences
                    </h3>
                    <p className="text-sm text-gray-600">
                      Control notifications and location usage
                    </p>
                  </div>
                  {prefsLoading && (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  )}
                </div>

                <div className="space-y-3 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 bg-white"
                      checked={notificationsEnabled}
                      onChange={(e) =>
                        setNotificationsEnabled(e.target.checked)
                      }
                      disabled={prefsLoading || prefsSaving}
                    />
                    <span className="text-sm text-gray-900">
                      Enable notifications
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 bg-white"
                      checked={locEnabled}
                      onChange={(e) => setLocEnabled(e.target.checked)}
                      disabled={prefsLoading || prefsSaving}
                    />
                    <span className="text-sm text-gray-900">
                      Enable location services
                    </span>
                  </label>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    className="bg-black text-white hover:bg-gray-800"
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
                      "Save Preferences"
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Data & Privacy Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data & Privacy</h2>
            <Card className="p-6 border border-gray-200 bg-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-6 w-6 text-black" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Download Your Data
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Export all data stored about your account
                  </p>
                  <Button
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50"
                    onClick={() => navigate("/gdpr")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    GDPR Request
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
      
      <Dialog open={licenseModalOpen} onOpenChange={setLicenseModalOpen}>
        <DialogContent className="max-w-lg border border-gray-200 bg-gray-100 text-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-black" />
              Driving licence verification
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Upload your driving licence so we can verify you for{" "}
              <span className="font-semibold text-gray-800">
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
                  className="bg-gray-200 text-gray-900 border border-gray-300 placeholder-gray-600 focus:bg-gray-300"
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
                  className="bg-gray-200 text-gray-900 border border-gray-300 placeholder-gray-600 focus:bg-gray-300"
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
                  className="bg-gray-200 text-gray-900 border border-gray-300 placeholder-gray-600 focus:bg-gray-300"
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
                  className="bg-gray-200 text-gray-900 border border-gray-300 placeholder-gray-600 focus:bg-gray-300 file:bg-gray-300 file:text-gray-800"
                />
              </div>
            </div>

            <DialogFooter className="mt-2 flex items-center justify-between">
              <Button
                type="submit"
                disabled={licenseSubmitting}
                className="bg-black hover:bg-gray-700 text-gray-900 border-none"
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
    </div>
  );
}
