import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileText, CheckCircle2 } from "lucide-react";

type DocumentType = {
  id: string;
  label: string;
  hasExpiry: boolean;
};

const REQUIRED_DOCUMENTS: DocumentType[] = [
  { id: "identity", label: "Ταυτότητα ή διαβατήριο (Identity or Passport)", hasExpiry: true },
  { id: "residence", label: "Άδεια παραμονής (Residence Permit)", hasExpiry: true },
  { id: "driving_license", label: "Άδεια οδήγησης (Driving License)", hasExpiry: true },
  { id: "vehicle_license", label: "Άδεια κυκλοφορίας οχήματος (Vehicle License)", hasExpiry: true },
  { id: "mot", label: "Πιστοποιητικό ΜΟΤ (MOT Certificate)", hasExpiry: true },
  { id: "criminal_record", label: "Πιστοποιητικό λευκού ποινικού μητρώου (Criminal Record)", hasExpiry: false },
  { id: "medical", label: "Ιατρικό πιστοποιητικό (Medical Certificate)", hasExpiry: true },
  { id: "psychological", label: "Ψυχολογικό πιστοποιητικό (Psychological Certificate)", hasExpiry: true },
];

type DocumentData = {
  docNumber: string;
  issueDate: string;
  expiryDate: string;
  file: File | null;
};

export default function DriverDocuments() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Record<string, DocumentData>>(
    REQUIRED_DOCUMENTS.reduce(
      (acc, doc) => ({
        ...acc,
        [doc.id]: { docNumber: "", issueDate: "", expiryDate: "", file: null },
      }),
      {} as Record<string, DocumentData>
    )
  );
  const [loading, setLoading] = useState(false);

  const handleFileChange = (docId: string, file: File | null) => {
    setDocuments((prev) => ({
      ...prev,
      [docId]: { ...prev[docId], file },
    }));
  };

  const handleFieldChange = (docId: string, field: keyof DocumentData, value: string) => {
    setDocuments((prev) => ({
      ...prev,
      [docId]: { ...prev[docId], [field]: value },
    }));
  };

  const isDocumentComplete = (docId: string, doc: DocumentType) => {
    const data = documents[docId];
    const hasBasicInfo = data.docNumber && data.issueDate && data.file;
    const hasExpiry = !doc.hasExpiry || data.expiryDate;
    return hasBasicInfo && hasExpiry;
  };

  const allDocumentsComplete = REQUIRED_DOCUMENTS.every((doc) =>
    isDocumentComplete(doc.id, doc)
  );

  async function uploadPersonDocument(
    docId: string,
    docMeta: DocumentType,
    data: DocumentData
  ) {
    if (!data.file) {
      throw new Error(`No file selected for ${docMeta.label}`);
    }
    // MUST match the DocType values allowed in PersonDocument.CK_PersonalDocType
    const DOC_TYPE_MAP: Record<string, string> = {
      identity: "ID_OR_PASSPORT",
      residence: "RESIDENCE_PERMIT",
      driving_license: "DRIVING_LICENSE",
      vehicle_license: "VEHICLE_REG",
      mot: "MOT_CERT",
      criminal_record: "CRIMINAL_RECORD",
      medical: "MEDICAL_CERT",
      psychological: "PSYCHOLOGICAL_CERT",
    };

    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("docType", DOC_TYPE_MAP[docId]); // backend expects these exact strings
    formData.append("docNumber", data.docNumber);
    formData.append("issueDate", data.issueDate);
    formData.append("expiryDate", docMeta.hasExpiry ? data.expiryDate : "");

    const res = await fetch("http://localhost:5000/api/documents/person/upload", {
      method: "POST",
      body: formData,
      credentials: "include", // send Flask session cookie
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.success) {
      console.error("Upload failed for", docMeta.label, res.status, json);
      throw new Error(json.error || `Upload failed for ${docMeta.label}`);
    }

    return json as { success: true; docId: number; fileUrl: string; driveFileId: string };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allDocumentsComplete) {
      toast.error("Please complete all documents");
      return;
    }

    setLoading(true);

    try {
      const uploads = REQUIRED_DOCUMENTS.map((doc) =>
        uploadPersonDocument(doc.id, doc, documents[doc.id])
      );

      await Promise.all(uploads);

      toast.success("Documents submitted for review");
      navigate("/pending-approval");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to upload documents");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-start p-4 py-8">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Driver Documents</h1>
          <p className="text-muted-foreground mt-2">
            Upload all required documents to complete registration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {REQUIRED_DOCUMENTS.map((doc) => {
            const complete = isDocumentComplete(doc.id, doc);
            return (
              <Card key={doc.id} className={complete ? "border-success" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {doc.label}
                      {complete && <CheckCircle2 className="h-5 w-5 text-success" />}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    {doc.hasExpiry ? "Include issue and expiry dates" : "No expiry date required"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${doc.id}-number`} className="text-sm">
                        Document ID/Number
                      </Label>
                      <Input
                        id={`${doc.id}-number`}
                        placeholder="ABC123456"
                        value={documents[doc.id].docNumber}
                        onChange={(e) => handleFieldChange(doc.id, "docNumber", e.target.value)}
                        required
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`${doc.id}-issue`} className="text-sm">
                        Issue Date
                      </Label>
                      <Input
                        id={`${doc.id}-issue`}
                        type="date"
                        value={documents[doc.id].issueDate}
                        onChange={(e) => handleFieldChange(doc.id, "issueDate", e.target.value)}
                        required
                        className="h-10"
                      />
                    </div>

                    {doc.hasExpiry && (
                      <div className="space-y-1.5">
                        <Label htmlFor={`${doc.id}-expiry`} className="text-sm">
                          Expiry Date
                        </Label>
                        <Input
                          id={`${doc.id}-expiry`}
                          type="date"
                          value={documents[doc.id].expiryDate}
                          onChange={(e) => handleFieldChange(doc.id, "expiryDate", e.target.value)}
                          required
                          className="h-10"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`${doc.id}-file`} className="text-sm">
                      Upload Document (Photo or PDF)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`${doc.id}-file`}
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(doc.id, e.target.files?.[0] || null)}
                        required
                        className="h-10"
                      />
                      {documents[doc.id].file && (
                        <div className="flex items-center gap-1 text-sm text-success">
                          <FileText className="h-4 w-4" />
                          <span className="truncate max-w-[150px]">
                            {documents[doc.id].file?.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full h-12"
              disabled={loading || !allDocumentsComplete}
            >
              {loading ? "Submitting..." : "Submit All Documents"}
            </Button>
            {!allDocumentsComplete && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Complete all documents to continue
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
