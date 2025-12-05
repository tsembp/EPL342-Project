import { useState, useMemo, useEffect } from "react";
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
import { 
  uploadDriverDocument, 
  uploadDriverPhoto,
  getPersonDocumentStatus,
  type PersonDocumentStatus,
  getDriverPhotoStatus
} from "@/features/driver/api";
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
    label: "Identity or Passport",
    hasExpiry: true,
    backendType: "ID_OR_PASSPORT",
  },
  {
    id: "residence",
    label:
      "Residence Permit – only for non-permanent residents",
    hasExpiry: true,
    backendType: "RESIDENCE_PERMIT",
    optional: true, // Optional
  },
  {
    id: "driving_license",
    label: "Driving License",
    hasExpiry: true,
    backendType: "DRIVING_LICENSE",
  },
  {
    id: "vehicle_license",
    label: "Vehicle License",
    hasExpiry: true,
    backendType: "VEHICLE_REG",
  },
  {
    id: "mot",
    label: "MOT Certificate",
    hasExpiry: true,
    backendType: "MOT_CERT",
  },
  {
    id: "criminal_record",
    label:
      "Criminal Record Certificate (not older than one month)",
    hasExpiry: false,
    backendType: "CRIMINAL_RECORD",
    optional: true, // Optional
  },
  {
    id: "medical",
    label: "Medical Certificate",
    hasExpiry: true,
    backendType: "MEDICAL_CERT",
  },
  {
    id: "psychological",
    label: "Psychological Certificate",
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
  
  const [personDocStatuses, setPersonDocStatuses] = useState<PersonDocumentStatus[]>([]);
  const [statusesLoading, setStatusesLoading] = useState(false);
  const [statusesError, setStatusesError] = useState<string | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<"Submitted" | "Not submitted">(
    "Not submitted"
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

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
      await fetchStatuses();
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

      await fetchPhotoStatus();

      // Optionally clear the file:
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

  const fetchStatuses = async () => {
    try {
      setStatusesLoading(true);
      setStatusesError(null);
      const data = await getPersonDocumentStatus();
      setPersonDocStatuses(data);
      
      // Sync local state with backend statuses
      setDocuments((prev) => {
        const updated = { ...prev };
        for (const doc of REQUIRED_DOCUMENTS) {
          const backendStatus = data.find(s => s.DocType === doc.backendType);
          if (backendStatus) {
            const status = backendStatus.Status?.trim(); // Trim whitespace
            if (status === "Pending" || status === "Accepted") {
              // Mark as success in local state if already submitted
              updated[doc.id] = {
                ...updated[doc.id],
                status: "success"
              };
            }
          }
        }
        return updated;
      });
    } catch (err) {
      console.error("Error fetching person document status:", err);
      setStatusesError(
        err instanceof Error ? err.message : "Failed to load document status."
      );
    } finally {
      setStatusesLoading(false);
    }
  };

  const fetchPhotoStatus = async () => {
    if (!userId) return;
    try {
      const res = await getDriverPhotoStatus();
      setPhotoStatus(res.status);
      setPhotoUrl(res.photoUrl);
    } catch (err) {
      console.error("Error fetching driver photo status:", err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchPhotoStatus();
  }, [userId]);

  useEffect(() => {
    if (storeUserId) fetchStatuses();
  }, [storeUserId]);

  const statusByDocType = useMemo(() => {
    const map: Record<string, PersonDocumentStatus> = {};
    for (const s of personDocStatuses) {
      map[s.DocType] = s;
    }
    return map;
  }, [personDocStatuses]);

  // Show message when all required documents are uploaded (no redirect)
  useEffect(() => {
    if (personDocStatuses.length > 0) {
      const allUploaded = REQUIRED_DOCUMENTS.filter((doc) => !doc.optional).every((doc) => {
        const statusInfo = statusByDocType[doc.backendType];
        const dbStatus = statusInfo?.Status?.trim() ?? null; // Trim whitespace
        return dbStatus === "Pending" || dbStatus === "Accepted";
      });

      if (allUploaded) {
        toast.success("All documents submitted successfully! Awaiting review.");
      }
    }
  }, [personDocStatuses, statusByDocType]);

  type DisplayStatus = "Not submitted" | "Submitted" | "Accepted" | "Rejected";

  const statusPriority: Record<DisplayStatus, number> = {
    "Submitted": 1,
    "Rejected": 2,
    "Accepted": 3,
    "Not submitted": 4,
  };

  const getStatusInfo = (
    doc: DocumentType
  ): { displayStatus: DisplayStatus; reviewComments: string | null } => {
    const statusInfo = statusByDocType[doc.backendType];
    const dbStatus = statusInfo?.Status?.trim() ?? null; // Trim whitespace

    const reviewComments =
      (statusInfo as any)?.ReviewComments ??
      (statusInfo as any)?.ReviewComment ??
      null;

    let displayStatus: DisplayStatus;

    if (!dbStatus) {
      displayStatus = "Not submitted";
    } else if (dbStatus === "Pending") {
      displayStatus = "Submitted"; // uploaded & waiting review
    } else if (dbStatus === "Accepted") {
      displayStatus = "Accepted"; // uploaded & approved
    } else if (dbStatus === "Rejected") {
      displayStatus = "Rejected"; // uploaded & rejected
    } else {
      displayStatus = "Not submitted";
    }

    return { displayStatus, reviewComments };
  };

  const allRequiredSubmitted = remainingRequiredDocuments.length === 0;

  // Check if all required documents are at least submitted (Pending or Accepted)
  const allRequiredDocumentsUploaded = useMemo(() => {
    return REQUIRED_DOCUMENTS.filter((doc) => !doc.optional).every((doc) => {
      const statusInfo = statusByDocType[doc.backendType];
      const dbStatus = statusInfo?.Status?.trim() ?? null; // Trim whitespace
      return dbStatus === "Pending" || dbStatus === "Accepted";
    });
  }, [personDocStatuses, statusByDocType]);

  const handleViewStatus = () => {
    navigate("/driver/pending-approval");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <Car className="h-8 w-8 text-gray-600" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Driver &amp; Company Documents
          </h1>
          <p className="text-sm text-gray-600">
            Upload the required documents to complete registration. Optional
            documents can be added later.
          </p>
        </div>

        {/* Success message when all required docs are uploaded (submitted or accepted) */}
        {allRequiredDocumentsUploaded && (
          <Card className="border border-green-200 bg-green-50 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900">
                    All Required Documents Submitted!
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    Your documents are pending operator review. Click below to view your approval status.
                  </p>
                </div>
                <Button
                  onClick={handleViewStatus}
                  className="mt-2 bg-green-600 text-white hover:bg-green-700"
                >
                  View Approval Status
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Driver Photo - Only show if not all required documents are uploaded */}
        {!allRequiredDocumentsUploaded && (
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-200">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                    <FileText className="h-4 w-4 text-gray-600" />
                    Driver Profile Photo
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-600">
                    Upload a clear, recent photo. This will appear on your profile.
                  </CardDescription>
                </div>

                <span
                  className={`
                    text-xs font-medium px-2 py-1 rounded-full border
                    ${
                      photoStatus === "Submitted"
                        ? "bg-green-50 text-green-700 border-green-300"
                        : "bg-gray-50 text-gray-600 border-gray-300"
                    }
                  `}
                >
                  {photoStatus}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label
                  htmlFor="driver-photo-file"
                  className="text-xs font-medium uppercase tracking-wide text-gray-600"
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
                    className="h-10 rounded-lg border border-gray-300 bg-white text-gray-900 file:text-gray-900 file:bg-gray-100 file:border-0 file:px-3 file:py-1 file:mr-2 file:text-xs placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:border-transparent"
                  />
                  {photoFile && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
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
                  className="border-gray-300 bg-white text-gray-900 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
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
        )}

        {/* Documents form */}
                {/* Documents form */}
        {[...remainingDocuments]
          .sort((a, b) => {
            const aStatus = getStatusInfo(a).displayStatus;
            const bStatus = getStatusInfo(b).displayStatus;
            return statusPriority[aStatus] - statusPriority[bStatus];
          })
          .map((doc) => {
            const data = documents[doc.id];
            const isSubmittable = isDocumentSubmittable(doc.id);
            const isLoading = data.status === "uploading";

            const { displayStatus, reviewComments } = getStatusInfo(doc);

            // 🔒 Submitted (Pending) + Accepted -> read-only
            if (displayStatus === "Submitted" || displayStatus === "Accepted") {
              const isPending = displayStatus === "Submitted";
              const badgeText = isPending ? "Pending approval" : "Approved";

              return (
                <Card
                  key={doc.id}
                  className={
                    isPending
                      ? "border bg-white shadow-sm border-amber-300"
                      : "border bg-white shadow-sm border-green-300"
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                          <FileText className="h-4 w-4 text-gray-600" />
                          {doc.label}
                        </CardTitle>
                        {doc.optional && (
                          <span className="text-[11px] font-medium px-2 py-0.5 w-fit rounded-full bg-gray-50 text-gray-600 border border-gray-300">
                            Optional
                          </span>
                        )}
                      </div>

                      <span
                        className={
                          isPending
                            ? "text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-300"
                            : "text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-300"
                        }
                      >
                        {badgeText}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-1 space-y-2">
                    <p className="text-xs text-gray-600">
                      {isPending
                        ? "This document has been submitted and is currently pending approval. You won't be able to upload a new file until it is reviewed."
                        : "This document has been reviewed and accepted. You cannot upload another file unless an operator changes its status."}
                    </p>

                    {reviewComments && (
                      <div className="mt-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2">
                        <p className="text-[11px] font-semibold text-gray-700">
                          Review comment
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-600">
                          {reviewComments}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }

            // 🟠 Not submitted + 🔴 Rejected -> editable card
            return (
              <Card
                key={doc.id}
                className={`border bg-white shadow-sm ${
                  data.status === "error"
                    ? "border-red-300"
                    : "border-gray-200"
                }`}
              >
                <CardHeader className="pb-3 border-b border-gray-200">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                        <FileText className="h-4 w-4 text-gray-600" />
                        {doc.label}
                      </CardTitle>
                      {doc.optional && (
                        <span className="text-[11px] font-medium px-2 py-0.5 w-fit rounded-full bg-gray-50 text-gray-600 border border-gray-300">
                          Optional
                        </span>
                      )}
                    </div>
                      <span
                        className={`
                          text-xs font-medium px-2 py-1 rounded-full border
                          ${
                            (() => {
                              switch (displayStatus) {
                                case "Not submitted":
                                  return "bg-amber-50 text-amber-700 border-amber-300";
                                case "Rejected":
                                  return "bg-red-50 text-red-700 border-red-300";
                                default:
                                  // just in case, but shouldn't be hit
                                  return "bg-gray-50 text-gray-600 border-gray-300";
                              }
                            })()
                          }
                        `}
                      >
                        {displayStatus}
                      </span>
                  </div>

                  {data.status === "error" && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <p>Error: {data.error}</p>
                    </div>
                  )}

                  <CardDescription className="mt-2 text-xs text-gray-600">
                    {doc.hasExpiry
                      ? "Include issue and expiry dates"
                      : "No expiry date required"}
                  </CardDescription>

                  {/* 🔴 Rejected: show review comment but keep editable */}
                  {displayStatus === "Rejected" && reviewComments && (
                    <div className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2">
                      <p className="text-[11px] font-semibold text-red-700">
                        Review comment
                      </p>
                      <p className="mt-0.5 text-[11px] text-red-600">
                        {reviewComments}
                      </p>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  {/* Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`${doc.id}-number`}
                        className="text-xs font-medium uppercase tracking-wide text-gray-600"
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
                        className="h-10 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:border-transparent"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor={`${doc.id}-issue`}
                        className="text-xs font-medium uppercase tracking-wide text-gray-600"
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
                        className="h-10 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:border-transparent"
                      />
                    </div>

                    {doc.hasExpiry && (
                      <div className="space-y-2">
                        <Label
                          htmlFor={`${doc.id}-expiry`}
                          className="text-xs font-medium uppercase tracking-wide text-gray-600"
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
                          className="h-10 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:border-transparent"
                        />
                      </div>
                    )}
                  </div>

                  {/* File upload */}
                  <div className="space-y-2">
                    <Label
                      htmlFor={`${doc.id}-file`}
                      className="text-xs font-medium uppercase tracking-wide text-gray-600"
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
                        className="h-10 rounded-lg border border-gray-300 bg-white text-gray-900 file:text-gray-900 file:bg-gray-100 file:border-0 file:px-3 file:py-1 file:mr-2 file:text-xs placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:border-transparent"
                      />
                      {data.file && !isLoading && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
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
                      className="border-gray-300 bg-white text-gray-900 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
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
      </div>
    </div>
  );
}
