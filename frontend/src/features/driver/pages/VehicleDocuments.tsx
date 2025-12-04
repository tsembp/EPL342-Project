import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  uploadVehicleDocument,
  getVehicleDocumentStatus,
} from "@/features/driver/api";

type DocumentType = {
  id: string;
  label: string;
  hasExpiry: boolean;
  backendType: string;
};

const REQUIRED_DOCUMENTS: DocumentType[] = [
  {
    id: "vehicle_reg",
    label: "Άδεια κυκλοφορίας οχήματος (Vehicle Registration)",
    hasExpiry: true,
    backendType: "VEHICLE_REGISTRATION",
  },
  {
    id: "mot_cert",
    label: "Πιστοποιητικό ΜΟΤ (MOT Certificate)",
    hasExpiry: true,
    backendType: "MOT_CERTIFICATE",
  },
  {
    id: "vehicle_classification",
    label:
      "Πιστοποιητικό Ταξινόμησης Οχήματος (Vehicle Classification Certificate)",
    hasExpiry: true,
    backendType: "VEHICLE_CLASSIFICATION_CERTIFICATE",
  },
  {
    id: "vehicle_image_interior",
    label: "Φωτογραφία Εσωτερικού Οχήματος (Vehicle Interior Image)",
    hasExpiry: false,
    backendType: "VEHICLE_IMAGE_INTERIOR",
  },
  {
    id: "vehicle_image_exterior",
    label: "Φωτογραφία Εξωτερικού Οχήματος (Vehicle Exterior Image)",
    hasExpiry: false,
    backendType: "VEHICLE_IMAGE_EXTERIOR",
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
  isSubmitted: boolean;
};

const getInitialState = () =>
  REQUIRED_DOCUMENTS.reduce((acc, doc) => {
    acc[doc.id] = {
      docNumber: "",
      issueDate: "",
      expiryDate: "",
      file: null,
      status: "pending",
      error: undefined,
      isSubmitted: false,
    };
    return acc;
  }, {} as Record<string, DocumentData>);

export default function VehicleDocuments() {
  const navigate = useNavigate();
  const location = useLocation();
  const vehicleId = (location.state as { vehicleId: string })?.vehicleId;

  const {
    data: existingDocs,
    isLoading: isLoadingExistingDocs,
    error: existingDocsError,
  } = useQuery({
    queryKey: ["vehicleDocumentsStatus", vehicleId],
    queryFn: () => getVehicleDocumentStatus(vehicleId!),
    enabled: !!vehicleId,
  });

  const [documents, setDocuments] = useState<Record<string, DocumentData>>(
    () => getInitialState()
  );

  useEffect(() => {
    if (!existingDocs || existingDocs.length === 0) return;

    setDocuments((prev) => {
      const newState = { ...prev };

      existingDocs.forEach((doc: any) => {
        const requiredDoc = REQUIRED_DOCUMENTS.find(
          (rd) => rd.backendType === doc.DocType
        );
        if (!requiredDoc) return;

        let submissionStatus: SubmissionStatus = "pending";
        let isDocAlreadySubmitted = false;
        let docError: string | undefined;

        const statusLower = (doc.Status || "").toLowerCase();

        if (statusLower === "accepted" || statusLower === "pending") {
          submissionStatus = "success";
          isDocAlreadySubmitted = true;
        } else if (statusLower === "rejected") {
          submissionStatus = "error";
          isDocAlreadySubmitted = false;
          docError = doc.ReviewComments || "Rejected by operator";
        }

        newState[requiredDoc.id] = {
          ...newState[requiredDoc.id],
          docNumber:
            requiredDoc.backendType !== "VEHICLE_IMAGE_INTERIOR" &&
            requiredDoc.backendType !== "VEHICLE_IMAGE_EXTERIOR"
              ? doc.DocNo?.toString() || ""
              : "",
          issueDate: doc.IssueDate
            ? new Date(doc.IssueDate).toISOString().split("T")[0]
            : "",
          expiryDate: doc.ExpiryDate
            ? new Date(doc.ExpiryDate).toISOString().split("T")[0]
            : "",
          status: submissionStatus,
          error: docError,
          isSubmitted: isDocAlreadySubmitted,
          file: null,
        };
      });

      return newState;
    });
  }, [existingDocs]);

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
    if (!data) return false;

    const hasDocNumber =
      docInfo.backendType === "VEHICLE_IMAGE_INTERIOR" ||
      docInfo.backendType === "VEHICLE_IMAGE_EXTERIOR" ||
      !!data.docNumber;
    const hasBasicInfo = hasDocNumber && !!data.issueDate && !!data.file;
    const hasExpiry = !docInfo.hasExpiry || !!data.expiryDate;

    return hasBasicInfo && hasExpiry;
  };

  const handleIndividualSubmit = async (docId: string) => {
    if (!vehicleId) {
      toast.error("Vehicle ID not found. Please add a vehicle first.");
      navigate("/driver/add-vehicle");
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
      [docId]: { ...prev[docId], status: "uploading", error: undefined },
    }));

    try {
      await uploadVehicleDocument({
        vehicleId: vehicleId,
        docType: doc.backendType,
        docNumber:
          doc.backendType !== "VEHICLE_IMAGE_INTERIOR" &&
          doc.backendType !== "VEHICLE_IMAGE_EXTERIOR"
            ? data.docNumber
            : undefined,
        issueDate: data.issueDate,
        expiryDate: doc.hasExpiry ? data.expiryDate : undefined,
        file: data.file!,
      });

      toast.success(`${doc.label} submitted successfully!`);

      // <<< IMPORTANT: mark as submitted so it disappears >>>
      setDocuments((prev) => ({
        ...prev,
        [docId]: {
          ...prev[docId],
          status: "success",
          isSubmitted: true,
          file: null,
        },
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

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();

    const remainingDocs = REQUIRED_DOCUMENTS.filter(
      (doc) =>
        documents[doc.id].status === "pending" ||
        documents[doc.id].status === "error"
    );

    if (remainingDocs.some((doc) => !isDocumentSubmittable(doc.id))) {
      toast.error(
        "Please fill in all fields for all remaining documents before submitting."
      );
      return;
    }

    toast.info(
      `Submitting ${remainingDocs.length} remaining vehicle document(s)...`
    );

    for (const doc of remainingDocs) {
      // sequential on purpose
      // eslint-disable-next-line no-await-in-loop
      await handleIndividualSubmit(doc.id);
    }
  };

  const remainingDocuments = useMemo(
    () =>
      REQUIRED_DOCUMENTS.filter(
        (doc) => !documents[doc.id]?.isSubmitted
      ),
    [documents]
  );

  const allSubmitted = remainingDocuments.length === 0;

  // When all docs are done -> toast + redirect to /driver
  useEffect(() => {
    if (!allSubmitted) return;
    toast.success("All vehicle documents submitted successfully.");
    navigate("/driver");
  }, [allSubmitted, navigate]);

  if (isLoadingExistingDocs) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
        <p className="mt-4 text-gray-600">Loading vehicle documents...</p>
      </div>
    );
  }

  if (existingDocsError) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 flex flex-col items-center justify-center">
        <AlertCircle className="h-8 w-8 text-red-600" />
        <p className="mt-4 text-red-600">
          Error loading vehicle documents:{" "}
          {existingDocsError instanceof Error
            ? existingDocsError.message
            : String(existingDocsError)}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900">
      <Card className="mx-auto w-full border border-gray-200 bg-white shadow-sm p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
              <FileText className="h-5 w-5 text-black" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900 sm:text-lg">
                Vehicle documents
              </h1>
              <p className="mt-1 text-xs text-gray-600 sm:text-sm">
                Upload and submit all required documents for your vehicle
                verification.
              </p>
            </div>
          </div>
          <Badge className="hidden border border-gray-200 bg-gray-50 text-[11px] font-normal text-gray-700 sm:inline-flex">
            Driver onboarding · Documents
          </Badge>
        </div>

        <div className="mb-4 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-[11px] text-gray-700 sm:text-xs">
          <p>
            Please make sure all documents are clear and up to date. You can
            submit each document individually or all remaining at once.
          </p>
        </div>

        <form onSubmit={handleSubmitAll} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {remainingDocuments.map((doc) => {
              const data = documents[doc.id];
              const isSubmittable = isDocumentSubmittable(doc.id);
              const isLoading = data.status === "uploading";

              return (
                <Card
                  key={doc.id}
                  className={`border bg-white ${
                    data.status === "error"
                      ? "border-red-300"
                      : "border-gray-200"
                  }`}
                >
                <CardHeader className="border-b border-gray-200 px-4 pb-3 pt-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 sm:text-base">
                      {doc.label}
                    </CardTitle>
                    {data.status === "success" && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Submitted</span>
                      </div>
                    )}
                    {data.status === "error" && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>Submission failed</span>
                      </div>
                    )}
                  </div>
                  <CardDescription className="mt-1 text-[11px] text-gray-600">
                    {doc.hasExpiry
                      ? "Include issue and expiry dates along with a clear scan or photo."
                      : "No expiry date required. Just upload a clear image or PDF."}
                  </CardDescription>
                  {data.status === "error" && data.error && (
                    <div className="mt-2 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-[11px] text-red-700">
                      Error: {data.error}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 px-4 py-4 text-sm">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {doc.backendType !== "VEHICLE_IMAGE_INTERIOR" &&
                      doc.backendType !== "VEHICLE_IMAGE_EXTERIOR" && (
                      <div className="space-y-1.5">
                        <Label
                          htmlFor={`${doc.id}-number`}
                          className="text-xs font-medium text-gray-700"
                        >
                          Document number
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
                          className="border-gray-300 bg-white text-xs text-gray-900 placeholder:text-gray-500"
                          placeholder="Enter document number"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`${doc.id}-issue`}
                        className="text-xs font-medium text-gray-700"
                      >
                        Issue date
                      </Label>
                      <Input
                        id={`${doc.id}-issue`}
                        type="date"
                        value={data.issueDate}
                        onChange={(e) =>
                          handleFieldChange(doc.id, "issueDate", e.target.value)
                        }
                        className="border-gray-300 bg-white text-xs text-gray-900"
                      />
                    </div>

                    {doc.hasExpiry && (
                      <div className="space-y-1.5">
                        <Label
                          htmlFor={`${doc.id}-expiry`}
                          className="text-xs font-medium text-gray-700"
                        >
                          Expiry date
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
                          className="border-gray-300 bg-white text-xs text-gray-900"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`${doc.id}-file`}
                      className="text-xs font-medium text-gray-700"
                    >
                      Upload document
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                        className="border-gray-300 bg-white text-xs text-gray-900 file:text-xs"
                      />
                      {data.file && !isLoading && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-600">
                          <FileText className="h-4 w-4" />
                          <span className="max-w-[180px] truncate">
                            {data.file.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleIndividualSubmit(doc.id)}
                      disabled={!isSubmittable || isLoading}
                      className="bg-black text-white text-xs font-medium hover:bg-gray-800"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        "Submit document"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              className="flex h-11 w-full items-center justify-center bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={remainingDocuments.some(
                (doc) => !isDocumentSubmittable(doc.id)
              )}
            >
              Submit all remaining vehicle documents
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
