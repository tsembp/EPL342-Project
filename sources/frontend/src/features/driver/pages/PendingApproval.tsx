import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, CheckCircle2, FileText } from "lucide-react";
import {
  getPersonDocumentStatus,
  type PersonDocumentStatus,
  getDriverPhotoStatus,
} from "@/features/driver/api";

// ⚠️ Ideally you share this with DriverDocuments via a common file,
// but for now we duplicate the backend DocTypes.
const REQUIRED_DOC_TYPES = [
  "ID_OR_PASSPORT",
  "DRIVING_LICENSE",
  "VEHICLE_REG",
  "MOT_CERT",
  "MEDICAL_CERT",
  "PSYCHOLOGICAL_CERT",
];

const OPTIONAL_DOC_TYPES = ["RESIDENCE_PERMIT", "CRIMINAL_RECORD"];

type DocStats = {
  totalRequired: number;
  requiredAccepted: number;
  requiredUploaded: number;
  pending: number;
  accepted: number;
  rejected: number;
  missingRequired: number;
  totalUploaded: number;
};

type PhotoStatus = "Submitted" | "Not submitted";

export default function PendingApproval() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docStats, setDocStats] = useState<DocStats | null>(null);
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [personDocs, photoRes] = await Promise.all([
          getPersonDocumentStatus(),
          // Photo might fail if not implemented / logged out — ignore errors
          getDriverPhotoStatus().catch(() => null),
        ]);

        computeStats(personDocs);
        if (photoRes && typeof photoRes.status === "string") {
          setPhotoStatus(
            photoRes.status === "Submitted" ? "Submitted" : "Not submitted"
          );
        }
      } catch (err) {
        console.error("Error loading pending approval stats:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load your verification status."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const computeStats = (docs: PersonDocumentStatus[]) => {
    const statusByType: Record<string, PersonDocumentStatus> = {};
    for (const d of docs) {
      statusByType[d.DocType] = d;
    }

    let pending = 0;
    let accepted = 0;
    let rejected = 0;

    for (const d of docs) {
      if (d.Status === "Pending") pending++;
      else if (d.Status === "Accepted") accepted++;
      else if (d.Status === "Rejected") rejected++;
    }

    const totalRequired = REQUIRED_DOC_TYPES.length;
    let requiredAccepted = 0;
    let requiredUploaded = 0;
    let missingRequired = 0;

    for (const t of REQUIRED_DOC_TYPES) {
      const s = statusByType[t];
      if (!s) {
        missingRequired++;
        continue;
      }
      requiredUploaded++;
      if (s.Status === "Accepted") {
        requiredAccepted++;
      }
    }

    const totalUploaded = docs.length;

    setDocStats({
      totalRequired,
      requiredAccepted,
      requiredUploaded,
      pending,
      accepted,
      rejected,
      missingRequired,
      totalUploaded,
    });
  };

  const progressPercent =
    docStats && docStats.totalRequired > 0
      ? Math.round((docStats.requiredAccepted / docStats.totalRequired) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-gray-900">
      <div className="w-full max-w-md space-y-6">
        <Card className="bg-white text-center border border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="h-10 w-10 text-amber-600" />
              </div>
            </div>

            <CardTitle className="text-2xl font-semibold text-gray-900">
              Verification in Progress
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-2">
              We&apos;re reviewing your documents. You can track your progress
              and upload any missing documents below.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {loading && (
              <p className="text-sm text-gray-600">
                Fetching your document status...
              </p>
            )}

            {error && !loading && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            {docStats && !loading && !error && (
              <>
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Required documents approved</span>
                    <span className="font-medium text-gray-900">
                      {docStats.requiredAccepted} / {docStats.totalRequired}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-green-600 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Status grid */}
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-col gap-1 items-center">
                  <span className="font-semibold text-gray-700">Pending</span>
                  <span className="font-semibold text-amber-600 text-lg">
                    {docStats.pending}
                  </span>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex flex-col gap-1 items-center">
                  <span className="font-semibold text-gray-700">Accepted</span>
                  <span className="font-semibold text-green-600 text-lg">
                    {docStats.accepted}
                  </span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex flex-col gap-1 items-center">
                  <span className="font-semibold text-gray-700">Rejected</span>
                  <span className="font-semibold text-red-600 text-lg">
                    {docStats.rejected}
                  </span>
                  </div>
                </div>

                <div className="text-xs text-gray-600 border-t border-gray-200 pt-3 text-left">
                  <p>
                    To speed up your approval, make sure all{" "}
                    <span className="font-semibold text-gray-900">
                      required documents
                    </span>{" "}
                    are uploaded and any{" "}
                    <span className="text-red-600 font-medium">rejected</span>{" "}
                    documents are corrected and resubmitted.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    onClick={() => navigate("/driver/documents")}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold"
                  >
                    Review & Upload Documents
                  </Button>
                </div>
              </>
            )}

            {!docStats && !loading && !error && (
              <p className="text-sm text-gray-600">
                No document information found yet. Start by uploading your
                documents.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
