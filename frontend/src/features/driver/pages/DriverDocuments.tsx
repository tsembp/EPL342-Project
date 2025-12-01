import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Car,
} from "lucide-react";
import { uploadDriverDocument, uploadDriverPhoto } from "@/features/driver/api";
import { useAuthStore } from "@/lib/store";

type DocumentType = {
  id: string;
  label: string;
  hasExpiry: boolean;
  backendType: string;
  optional?: boolean;
};

const REQUIRED_DOCUMENTS: DocumentType[] = [
  {
    id: "identity",
    label: "Ταυτότητα ή διαβατήριο (Identity or Passport)",
    hasExpiry: true,
    backendType: "ID_OR_PASSPORT",
  },
  {
    id: "residence",
    label:
      "Άδεια παραμονής (Residence Permit) – μόνο για μη μόνιμους κατοίκους (Optional)",
    hasExpiry: true,
    backendType: "RESIDENCE_PERMIT",
    optional: true, // Optional
  },
  {
    id: "driving_license",
    label: "Άδεια οδήγησης (Driving License)",
    hasExpiry: true,
    backendType: "DRIVING_LICENSE",
  },
  {
    id: "vehicle_license",
    label: "Άδεια κυκλοφορίας οχήματος (Vehicle License)",
    hasExpiry: true,
    backendType: "VEHICLE_REG",
  },
  {
    id: "mot",
    label: "Πιστοποιητικό ΜΟΤ (MOT Certificate)",
    hasExpiry: true,
    backendType: "MOT_CERT",
  },
  {
    id: "criminal_record",
    label:
      "Πιστοποιητικό λευκού ποινικού μητρώου (Criminal Record – Optional, όχι παλαιότερο του ενός μήνα)",
    hasExpiry: false,
    backendType: "CRIMINAL_RECORD",
    optional: true, // Optional
  },
  {
    id: "medical",
    label: "Ιατρικό πιστοποιητικό (Medical Certificate)",
    hasExpiry: true,
    backendType: "MEDICAL_CERT",
  },
  {
    id: "psychological",
    label: "Ψυχολογικό πιστοποιητικό (Psychological Certificate)",
    hasExpiry: true,
    backendType: "PSYCHOLOGICAL_CERT",
  },
];

type SubmissionStatus = "pending" | "uploading" | "success" | "error";

type DocumentData = {
  docNumber: string;
  issueDate: string;
  expiryDate: string;
  file: File | null;
  status: SubmissionStatus;
  error?: string;
};

const getInitialState = () => {
  return REQUIRED_DOCUMENTS.reduce((acc, doc) => {
    acc[doc.id] = {
      docNumber: "",
      issueDate: "",
      expiryDate: "",
      file: null,
      status: "pending",
      error: undefined,
    };
    return acc;
  }, {} as Record<string, DocumentData>);
};

export default function DriverDocuments() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1) From global auth store (works after login)
  const storeUserId = useAuthStore((state) => state.userId);

  // 2) Optional override from navigation state (works right after signup)
  const userId =
    (location.state as { userId?: string } | null)?.userId || storeUserId;

  const [documents, setDocuments] =
    useState<Record<string, DocumentData>>(getInitialState());

  // Driver photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const handleFileChange = (docId: string, file: File | null) => {
    setDocuments((prev) => ({
      ...prev,
      [docId]: { ...prev[docId], file },
    }));
  };

  const handleFieldChange = (
    docId: string,
    field: keyof DocumentData,
    value: string
  ) => {
    setDocuments((prev) => ({
      ...prev,
      [docId]: { ...prev[docId], [field]: value },
    }));
  };

  const isDocumentSubmittable = (docId: string) => {
    const docInfo = REQUIRED_DOCUMENTS.find((d) => d.id === docId);
    if (!docInfo) return false;
    const data = documents[docId];
    const hasBasicInfo = data.docNumber && data.issueDate && data.file;
    const hasExpiry = !docInfo.hasExpiry || data.expiryDate;
    return Boolean(hasBasicInfo && hasExpiry);
  };

  const handleIndividualSubmit = async (docId: string) => {
    if (!userId) {
      toast.error("User ID not found. Please sign up again.");
      navigate("/signup");
      return;
    }

    const doc = REQUIRED_DOCUMENTS.find((d) => d.id === docId);
    const data = documents[docId];

    if (!doc || !data || !isDocumentSubmittable(docId)) {
      toast.error(
        "Please fill in all fields for this document before submitting."
      );
      return;
    }

    setDocuments((prev) => ({
      ...prev,
      [docId]: { ...prev[docId], status: "uploading" },
    }));

    try {
      await uploadDriverDocument({
        userId: userId,
        docType: doc.backendType,
        docNumber: data.docNumber,
        issueDate: data.issueDate,
        expiryDate: doc.hasExpiry ? data.expiryDate : undefined,
        file: data.file!,
      });
      toast.success(`${doc.label} submitted successfully!`);
      setDocuments((prev) => ({
        ...prev,
        [docId]: { ...prev[docId], status: "success" },
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      console.error(`Error submitting ${doc.label}:`, err);
      toast.error(`Failed to submit ${doc.label}: ${errorMessage}`);
      setDocuments((prev) => ({
        ...prev,
        [docId]: { ...prev[docId], status: "error", error: errorMessage },
      }));
    }
  };

  const handlePhotoSubmit = async () => {
    if (!userId) {
      toast.error("User ID not found. Please sign up again.");
      navigate("/signup");
      return;
    }

    if (!photoFile) {
      toast.error("Please select a photo first.");
      return;
    }

    try {
      setPhotoUploading(true);
      await uploadDriverPhoto(photoFile);
      toast.success("Driver photo uploaded successfully.");
      // Optionally clear the file after upload:
      // setPhotoFile(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      console.error("Error uploading driver photo:", err);
      toast.error(`Failed to upload driver photo: ${errorMessage}`);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Only required docs are considered for "Submit All"
    const remainingRequiredDocs = REQUIRED_DOCUMENTS.filter(
      (doc) =>
        !doc.optional &&
        (documents[doc.id].status === "pending" ||
          documents[doc.id].status === "error")
    );

    if (remainingRequiredDocs.some((doc) => !isDocumentSubmittable(doc.id))) {
      toast.error(
        "Please fill in all fields for all remaining required documents before submitting."
      );
      return;
    }

    toast.info(`Submitting ${remainingRequiredDocs.length} remaining document(s)...`);
    for (const doc of remainingRequiredDocs) {
      await handleIndividualSubmit(doc.id);
    }
  };

  const remainingDocuments = useMemo(() => {
    // For listing cards – show all docs that are not success
    return REQUIRED_DOCUMENTS.filter(
      (doc) => documents[doc.id]?.status !== "success"
    );
  }, [documents]);

  const remainingRequiredDocuments = useMemo(() => {
    // For completion state – only required docs matter
    return REQUIRED_DOCUMENTS.filter(
      (doc) => !doc.optional && documents[doc.id]?.status !== "success"
    );
  }, [documents]);

  const allSubmitted = remainingRequiredDocuments.length === 0;

  if (allSubmitted) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-lg p-8 border border-neutral-800 bg-neutral-900/80 shadow-xl backdrop-blur">
          <div className="flex flex-col items-center text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <h1 className="text-2xl font-semibold tracking-tight">
              All Required Documents Submitted
            </h1>
            <p className="text-sm text-neutral-400">
              Your required documents have been submitted for review. You can
              still upload optional documents later if needed.
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="mt-2 w-full h-11 rounded-xl bg-emerald-500 text-neutral-950 text-sm font-medium hover:bg-emerald-400"
            >
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-neutral-800 bg-neutral-900 shadow-lg">
            <Car className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Driver &amp; Company Documents
          </h1>
          <p className="text-sm text-neutral-400">
            Upload the required documents to complete registration. Optional
            documents can be added later.
          </p>
        </div>

        {/* Driver Photo */}
        <Card className="border border-neutral-800 bg-neutral-900/80 shadow-xl backdrop-blur">
          <CardHeader className="pb-3 border-b border-neutral-800">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base flex items-center gap-2 text-neutral-50">
                  <FileText className="h-4 w-4 text-emerald-500" />
                  Driver Profile Photo
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Upload a clear, recent photo. This will appear on your
                  profile.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label
                htmlFor="driver-photo-file"
                className="text-xs font-medium uppercase tracking-wide text-neutral-400"
              >
                Upload Photo
              </Label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Input
                  id="driver-photo-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setPhotoFile(e.target.files?.[0] ?? null)
                  }
                  className="h-10 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 file:text-neutral-50 file:bg-neutral-800 file:border-0 file:px-3 file:py-1 file:mr-2 file:text-xs placeholder:text-neutral-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                />
                {photoFile && (
                  <div className="flex items-center gap-1 text-xs text-neutral-400">
                    <FileText className="h-4 w-4" />
                    <span className="truncate max-w-[180px]">
                      {photoFile.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePhotoSubmit}
                disabled={!photoFile || photoUploading}
                className="border-neutral-700 bg-neutral-900 text-neutral-50 hover:bg-neutral-800 hover:border-neutral-600 disabled:bg-neutral-900 disabled:text-neutral-500 disabled:border-neutral-800"
              >
                {photoUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload Photo"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents form */}
        <form onSubmit={handleSubmitAll} className="space-y-4 text-sm">
          {remainingDocuments.map((doc) => {
            const data = documents[doc.id];
            const isSubmittable = isDocumentSubmittable(doc.id);
            const isLoading = data.status === "uploading";

            return (
              <Card
                key={doc.id}
                className={`border bg-neutral-900/80 shadow-xl backdrop-blur ${
                  data.status === "error"
                    ? "border-red-500/80"
                    : "border-neutral-800"
                }`}
              >
                <CardHeader className="pb-3 border-b border-neutral-800">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-base flex items-center gap-2 text-neutral-50">
                        <FileText className="h-4 w-4 text-emerald-500" />
                        {doc.label}
                      </CardTitle>
                      {doc.optional && (
                        <span className="text-[11px] font-medium px-2 py-0.5 w-fit rounded-full bg-neutral-900 text-neutral-400 border border-neutral-700">
                          Optional
                        </span>
                      )}
                    </div>

                    {data.status === "success" && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/40">
                        Submitted
                      </span>
                    )}
                  </div>

                  {data.status === "error" && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      <p>Error: {data.error}</p>
                    </div>
                  )}

                  <CardDescription className="mt-2 text-xs text-neutral-500">
                    {doc.hasExpiry
                      ? "Include issue and expiry dates"
                      : "No expiry date required"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  {/* Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`${doc.id}-number`}
                        className="text-xs font-medium uppercase tracking-wide text-neutral-400"
                      >
                        ID / Number
                      </Label>
                      <Input
                        id={`${doc.id}-number`}
                        value={data.docNumber}
                        onChange={(e) =>
                          handleFieldChange(
                            doc.id,
                            "docNumber",
                            e.target.value
                          )
                        }
                        className="h-10 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor={`${doc.id}-issue`}
                        className="text-xs font-medium uppercase tracking-wide text-neutral-400"
                      >
                        Issue Date
                      </Label>
                      <Input
                        id={`${doc.id}-issue`}
                        type="date"
                        value={data.issueDate}
                        onChange={(e) =>
                          handleFieldChange(
                            doc.id,
                            "issueDate",
                            e.target.value
                          )
                        }
                        className="h-10 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                      />
                    </div>

                    {doc.hasExpiry && (
                      <div className="space-y-2">
                        <Label
                          htmlFor={`${doc.id}-expiry`}
                          className="text-xs font-medium uppercase tracking-wide text-neutral-400"
                        >
                          Expiry Date
                        </Label>
                        <Input
                          id={`${doc.id}-expiry`}
                          type="date"
                          value={data.expiryDate}
                          onChange={(e) =>
                            handleFieldChange(
                              doc.id,
                              "expiryDate",
                              e.target.value
                            )
                          }
                          className="h-10 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                        />
                      </div>
                    )}
                  </div>

                  {/* File upload */}
                  <div className="space-y-2">
                    <Label
                      htmlFor={`${doc.id}-file`}
                      className="text-xs font-medium uppercase tracking-wide text-neutral-400"
                    >
                      Upload Document
                    </Label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Input
                        id={`${doc.id}-file`}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) =>
                          handleFileChange(
                            doc.id,
                            e.target.files?.[0] || null
                          )
                        }
                        className="h-10 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 file:text-neutral-50 file:bg-neutral-800 file:border-0 file:px-3 file:py-1 file:mr-2 file:text-xs placeholder:text-neutral-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                      />
                      {data.file && !isLoading && (
                        <div className="flex items-center gap-1 text-xs text-neutral-400">
                          <FileText className="h-4 w-4" />
                          <span className="truncate max-w-[180px]">
                            {data.file.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit button */}
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleIndividualSubmit(doc.id)}
                      disabled={!isSubmittable || isLoading}
                      className="border-neutral-700 bg-neutral-900 text-neutral-50 hover:bg-neutral-800 hover:border-neutral-600 disabled:bg-neutral-900 disabled:text-neutral-500 disabled:border-neutral-800"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Document"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Submit all required */}
          <div className="pt-4">
            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-emerald-500 text-neutral-950 text-sm font-medium hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500"
              disabled={REQUIRED_DOCUMENTS.some(
                (doc) =>
                  !doc.optional &&
                  documents[doc.id].status !== "success" &&
                  !isDocumentSubmittable(doc.id)
              )}
            >
              Submit All Remaining Required Documents
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
