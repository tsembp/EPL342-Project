import { fetchAPI } from "@/lib/apiClient";
import type { ReportRow } from "@/types/api";

export const getOperatorReports = (params: {
  kind: string;
  from: string;
  to: string;
}) => {
  const query = new URLSearchParams(params);
  return fetchAPI<ReportRow[]>(`/operator/reports?${query}`);
};

export const getPendingPersonDocuments = () =>
  fetchAPI<any[]>("/operator/pending-person-documents");

export const getPendingVehicleDocuments = () =>
  fetchAPI<any[]>("/operator/pending-vehicle-documents");

export const reviewPersonDocument = (params: {
  docId: number;
  status: "Accepted" | "Rejected";
  comment?: string;
}) =>
  fetchAPI<{ success: boolean }>("/operator/review-person-document", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const reviewVehicleDocument = (params: {
  vehDocId: number;
  status: "Accepted" | "Rejected";
  comment?: string;
}) =>
  fetchAPI<{ success: boolean }>("/operator/review-vehicle-document", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const getGdprRequests = () =>
  fetchAPI<any[]>("/operator/gdpr-requests");

export const reviewGdprRequest = (params: {
  gdprId: number;
  status: "Completed" | "Denied";
  note?: string;
}) =>
  fetchAPI<{ success: boolean }>("/operator/review-gdpr-request", {
    method: "POST",
    body: JSON.stringify(params),
  });
