import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { uploadVehicleDocument } from "@/features/driver/api";

type DocumentType = {
  id: string;
  label: string;
  hasExpiry: boolean;
  backendType: string;
};

// Placeholder for vehicle-specific documents
const REQUIRED_DOCUMENTS: DocumentType[] = [
  { id: "vehicle_reg", label: "Άδεια κυκλοφορίας οχήματος (Vehicle Registration)", hasExpiry: true, backendType: "VEHICLE_REGISTRATION" },
  { id: "mot_cert", label: "Πιστοποιητικό ΜΟΤ (MOT Certificate)", hasExpiry: true, backendType: "MOT_CERTIFICATE" },
  { id: "vehicle_classification", label: "Πιστοποιητικό Ταξινόμησης Οχήματος (Vehicle Classification Certificate)", hasExpiry: true, backendType: "VEHICLE_CLASSIFICATION_CERTIFICATE" },
  { id: "vehicle_image", label: "Φωτογραφία Οχήματος (Vehicle Image)", hasExpiry: false, backendType: "VEHICLE_IMAGE" },
];

type SubmissionStatus = 'pending' | 'uploading' | 'success' | 'error';

type DocumentData = {
  docNumber: string;
  issueDate: string;
  expiryDate: string;
  file: File | null;
  status: SubmissionStatus;
  error?: string;
};

// Initialize state from REQUIRED_DOCUMENTS
const getInitialState = () => {
  return REQUIRED_DOCUMENTS.reduce((acc, doc) => {
    acc[doc.id] = { docNumber: "", issueDate: "", expiryDate: "", file: null, status: 'pending', error: undefined };
    return acc;
  }, {} as Record<string, DocumentData>);
};

export default function VehicleDocuments() {
  const navigate = useNavigate();
  const location = useLocation();
  const vehicleId = (location.state as { vehicleId: string })?.vehicleId; // Get vehicleId from state

  const [documents, setDocuments] = useState<Record<string, DocumentData>>(getInitialState());

  const handleFileChange = (docId: string, file: File | null) => {
    setDocuments(prev => ({
      ...prev,
      [docId]: { ...prev[docId], file }
    }));
  };

  const handleFieldChange = (docId: string, field: keyof DocumentData, value: string) => {
    setDocuments(prev => ({
      ...prev,
      [docId]: { ...prev[docId], [field]: value }
    }));
  };

  const isDocumentSubmittable = (docId: string) => {
    const docInfo = REQUIRED_DOCUMENTS.find(d => d.id === docId);
    if (!docInfo) return false;
    const data = documents[docId];
    // DocNumber is not required for VEHICLE_IMAGE
    const hasDocNumber = docInfo.backendType === 'VEHICLE_IMAGE' || data.docNumber;
    const hasBasicInfo = hasDocNumber && data.issueDate && data.file;
    const hasExpiry = !docInfo.hasExpiry || data.expiryDate;
    return hasBasicInfo && hasExpiry;
  };
  
  const handleIndividualSubmit = async (docId: string) => {
    if (!vehicleId) {
      toast.error("Vehicle ID not found. Please add a vehicle first.");
      navigate("/driver/add-vehicle"); // Redirect if no vehicleId
      return;
    }

    const doc = REQUIRED_DOCUMENTS.find(d => d.id === docId);
    const data = documents[docId];

    if (!doc || !data || !isDocumentSubmittable(docId)) {
        toast.error("Please fill in all fields for this document before submitting.");
        return;
    }

    setDocuments(prev => ({ ...prev, [docId]: { ...prev[docId], status: 'uploading' } }));

    try {
        await uploadVehicleDocument({
            vehicleId: vehicleId,
            docType: doc.backendType,
            docNumber: doc.backendType !== 'VEHICLE_IMAGE' ? data.docNumber : undefined,
            issueDate: data.issueDate,
            expiryDate: doc.hasExpiry ? data.expiryDate : undefined,
            file: data.file!,
        });

        toast.success(`${doc.label} submitted successfully!`);
        setDocuments(prev => ({ ...prev, [docId]: { ...prev[docId], status: 'success' } }));
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        console.error(`Error submitting ${doc.label}:`, err);
        toast.error(`Failed to submit ${doc.label}: ${errorMessage}`);
        setDocuments(prev => ({ ...prev, [docId]: { ...prev[docId], status: 'error', error: errorMessage } }));
    }
  };

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    const remainingDocs = REQUIRED_DOCUMENTS.filter(doc => documents[doc.id].status === 'pending' || documents[doc.id].status === 'error');
    
    if (remainingDocs.some(doc => !isDocumentSubmittable(doc.id))) {
      toast.error("Please fill in all fields for all remaining documents before submitting.");
      return;
    }

    toast.info(`Submitting ${remainingDocs.length} remaining vehicle document(s)...`);
    for (const doc of remainingDocs) {
        await handleIndividualSubmit(doc.id);
    }
  };

  const remainingDocuments = useMemo(() => {
    return REQUIRED_DOCUMENTS.filter(doc => documents[doc.id]?.status !== 'success');
  }, [documents]);

  const allSubmitted = remainingDocuments.length === 0;

  if (allSubmitted) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center justify-center p-4 text-center">
        <Card className="w-full max-w-lg p-8">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">All Vehicle Documents Submitted</h1>
            <p className="text-muted-foreground mb-6">
                Your vehicle documents have been submitted for review.
            </p>
            <Button onClick={() => navigate("/driver/dashboard")}>Go to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center justify-start p-4 py-8">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Driver Vehicle Documents</h1>
          <p className="text-muted-foreground mt-2">
            Upload all required vehicle documents
          </p>
        </div>

        <form onSubmit={handleSubmitAll} className="space-y-4">
          {remainingDocuments.map((doc) => {
            const data = documents[doc.id];
            const isSubmittable = isDocumentSubmittable(doc.id);
            const isLoading = data.status === 'uploading';

            return (
              <Card key={doc.id} className={`${data.status === 'error' ? 'border-destructive' : ''} border border-neutral-800 bg-neutral-900/80`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {doc.label}
                    </CardTitle>
                  </div>
                   {data.status === 'error' && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <p>Error: {data.error}</p>
                        </div>
                    )}
                  <CardDescription className="text-xs">
                    {doc.hasExpiry ? "Include issue and expiry dates" : "No expiry date required"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Input fields... */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {doc.backendType !== 'VEHICLE_IMAGE' && (
                      <div className="space-y-1.5">
                        <Label htmlFor={`${doc.id}-number`}>Document Number</Label>
                        <Input
                          id={`${doc.id}-number`}
                          value={data.docNumber}
                          onChange={(e) => handleFieldChange(doc.id, "docNumber", e.target.value)}
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor={`${doc.id}-issue`}>Issue Date</Label>
                      <Input
                        id={`${doc.id}-issue`}
                        type="date"
                        value={data.issueDate}
                        onChange={(e) => handleFieldChange(doc.id, "issueDate", e.target.value)}
                      />
                    </div>
                    {doc.hasExpiry && (
                      <div className="space-y-1.5">
                        <Label htmlFor={`${doc.id}-expiry`}>Expiry Date</Label>
                        <Input
                          id={`${doc.id}-expiry`}
                          type="date"
                          value={data.expiryDate}
                          onChange={(e) => handleFieldChange(doc.id, "expiryDate", e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${doc.id}-file`}>Upload Document</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id={`${doc.id}-file`}
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileChange(doc.id, e.target.files?.[0] || null)}
                        />
                        {data.file && !isLoading && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                <span className="truncate max-w-[150px]">{data.file.name}</span>
                            </div>
                        )}
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleIndividualSubmit(doc.id)}
                        disabled={!isSubmittable || isLoading}
                    >
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Document'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-12" 
              disabled={remainingDocuments.some(doc => !isDocumentSubmittable(doc.id))}
            >
              Submit All Remaining Vehicle Documents
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
