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

export const getPendingPersonDocuments = async () => {
  const res = await fetchAPI<any[]>("/operator/pending-person-documents");
  return Array.isArray(res) ? res : []; 
};

export const getPendingVehicleDocuments = async () => {
  const res = await fetchAPI<any[]>("/operator/pending-vehicle-documents");
  return Array.isArray(res) ? res : [];  
};

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

export const getPendingServiceEnrollments = () =>
  fetchAPI<any[]>("/operator/service-enrollments");

export const reviewServiceEnrollment = (params: {
  enrollId: number;
  status: "Approved" | "Rejected";
  comment?: string;
}) =>
  fetchAPI<{ success: boolean }>("/operator/service-enroll/review", {
    method: "POST",
    body: JSON.stringify(params),
  });

  export const getServiceTypes = async () => {
  const res = await fetchAPI<any[]>("/operator/service-types");
  return Array.isArray(res) ? res : [];
};

export const getAllowedRideProfiles = async () => {
  const res = await fetchAPI<any[]>("/operator/allowed-ride-profiles");
  return Array.isArray(res) ? res : [];
};