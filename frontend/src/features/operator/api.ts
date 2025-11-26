import { fetchAPI } from "@/lib/apiClient";
import type { ReportRow } from "@/types/api";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export const getOperatorReports = (params: {
  kind: string;
  from: string;
  to: string;
}) => {
  const query = new URLSearchParams(params);
  return fetchAPI<ReportRow[]>(`/operator/reports?${query}`);
};

async function jsonRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed (${res.status}): ${text}`);
  }

  return res.json();
}

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

export async function createServiceType(payload: {
  name: string;
  description: string;
  baseFare: number;
  perKm: number;
  perMin: number;
  active: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}) {
  return jsonRequest("/api/operator/service-types", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// api.ts
export async function updateServiceType(
  id: string,
  payload: {
    name: string;
    description: string;
    baseFare: number;
    perKm: number;
    perMin: number;
    active: boolean;
  }
) {
  return jsonRequest(`/api/operator/service-types/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}


export async function createAllowedRideProfile(payload: {
  serviceTypeId: number;
  rideTypeId: number;
  vehicleTypeId: number;
  minBasePrice: number;
  notes?: string;
}) {
  return jsonRequest("/api/operator/allowed-ride-profiles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAllowedRideProfile(
  id: string,
  payload: {
    serviceTypeId: number;
    rideTypeId: number;
    vehicleTypeId: number;
    minBasePrice: number;
    notes?: string;
  }
) {
  return jsonRequest(`/api/operator/allowed-ride-profiles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}