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

// ============ REPORT API FUNCTIONS ============

// Average Cost By Category Report
export interface AverageCostByCategoryParams {
  fromDate?: string;
  toDate?: string;
  frequency?: "day" | "week" | "month" | "quarter" | "year";
  serviceTypeId?: number;
  rideStatus?: string;
  paymentStatus?: string;
  pickupZoneId?: number;
  dropoffZoneId?: number;
}

export const getAverageCostByCategory = async (params: AverageCostByCategoryParams = {}) => {
  const query = new URLSearchParams();
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);
  if (params.frequency) query.set("frequency", params.frequency);
  if (params.serviceTypeId) query.set("serviceTypeId", String(params.serviceTypeId));
  if (params.rideStatus) query.set("rideStatus", params.rideStatus);
  if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  if (params.pickupZoneId) query.set("pickupZoneId", String(params.pickupZoneId));
  if (params.dropoffZoneId) query.set("dropoffZoneId", String(params.dropoffZoneId));
  
  return fetchAPI<any[]>(`/operator/reports/average-cost-by-category?${query}`);
};

// High/Low Cost Trips Report
export interface HighLowCostTripsParams {
  fromDate?: string;
  toDate?: string;
  serviceTypeId?: number;
  rideStatus?: string;
  paymentStatus?: string;
  pickupZoneId?: number;
  dropoffZoneId?: number;
  topN?: number;
}

export const getHighLowCostTrips = async (params: HighLowCostTripsParams = {}) => {
  const query = new URLSearchParams();
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);
  if (params.serviceTypeId) query.set("serviceTypeId", String(params.serviceTypeId));
  if (params.rideStatus) query.set("rideStatus", params.rideStatus);
  if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  if (params.pickupZoneId) query.set("pickupZoneId", String(params.pickupZoneId));
  if (params.dropoffZoneId) query.set("dropoffZoneId", String(params.dropoffZoneId));
  if (params.topN) query.set("topN", String(params.topN));
  
  return fetchAPI<any[]>(`/operator/reports/high-low-cost-trips?${query}`);
};

// Driver/Vehicle Earnings Report
export interface DriverVehicleEarningsParams {
  groupBy?: "DRIVER" | "VEHICLE" | "BOTH";
  serviceTypeId?: number;
  rideStatus?: string;
  paymentStatus?: string;
  pickupZoneId?: number;
  dropoffZoneId?: number;
  minTrips?: number;
  minEarnings?: number;
  includeCurrentYear?: boolean;
  includeLast3Years?: boolean;
}

export const getDriverVehicleEarnings = async (params: DriverVehicleEarningsParams = {}) => {
  const query = new URLSearchParams();
  if (params.groupBy) query.set("groupBy", params.groupBy);
  if (params.serviceTypeId) query.set("serviceTypeId", String(params.serviceTypeId));
  if (params.rideStatus) query.set("rideStatus", params.rideStatus);
  if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  if (params.pickupZoneId) query.set("pickupZoneId", String(params.pickupZoneId));
  if (params.dropoffZoneId) query.set("dropoffZoneId", String(params.dropoffZoneId));
  if (params.minTrips) query.set("minTrips", String(params.minTrips));
  if (params.minEarnings) query.set("minEarnings", String(params.minEarnings));
  if (params.includeCurrentYear !== undefined) query.set("includeCurrentYear", params.includeCurrentYear ? "1" : "0");
  if (params.includeLast3Years !== undefined) query.set("includeLast3Years", params.includeLast3Years ? "1" : "0");
  
  return fetchAPI<any[]>(`/operator/reports/driver-vehicle-earnings?${query}`);
};

// Driver/Vehicle Performance Report
export interface DriverVehiclePerformanceParams {
  fromDate?: string;
  toDate?: string;
  periodGranularity?: "day" | "week" | "month" | "quarter" | "year";
  serviceTypeId?: number;
  rideStatus?: string;
  paymentStatus?: string;
  pickupZoneId?: number;
  dropoffZoneId?: number;
  minRating?: number;
  minTrips?: number;
  groupBy?: "DRIVER" | "VEHICLE" | "BOTH";
  topN?: number;
  orderBy?: "TRIPS" | "RATING";
}

export const getDriverVehiclePerformance = async (params: DriverVehiclePerformanceParams = {}) => {
  const query = new URLSearchParams();
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);
  if (params.periodGranularity) query.set("periodGranularity", params.periodGranularity);
  if (params.serviceTypeId) query.set("serviceTypeId", String(params.serviceTypeId));
  if (params.rideStatus) query.set("rideStatus", params.rideStatus);
  if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  if (params.pickupZoneId) query.set("pickupZoneId", String(params.pickupZoneId));
  if (params.dropoffZoneId) query.set("dropoffZoneId", String(params.dropoffZoneId));
  if (params.minRating) query.set("minRating", String(params.minRating));
  if (params.minTrips) query.set("minTrips", String(params.minTrips));
  if (params.groupBy) query.set("groupBy", params.groupBy);
  if (params.topN) query.set("topN", String(params.topN));
  if (params.orderBy) query.set("orderBy", params.orderBy);
  
  return fetchAPI<any[]>(`/operator/reports/driver-vehicle-performance?${query}`);
};

// Trip Count Report
export interface TripCountParams {
  fromDate?: string;
  toDate?: string;
  frequency?: "day" | "week" | "month" | "quarter" | "year";
  serviceTypeId?: number;
  rideStatus?: string;
  paymentStatus?: string;
}

export const getTripCount = async (params: TripCountParams = {}) => {
  const query = new URLSearchParams();
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);
  if (params.frequency) query.set("frequency", params.frequency);
  if (params.serviceTypeId) query.set("serviceTypeId", String(params.serviceTypeId));
  if (params.rideStatus) query.set("rideStatus", params.rideStatus);
  if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  
  return fetchAPI<any[]>(`/operator/reports/trip-count?${query}`);
};

// Trip Trends Report
export interface TripTrendsParams {
  fromDate?: string;
  toDate?: string;
  frequency?: "day" | "week" | "month" | "quarter" | "year";
  rideStatus?: string;
  paymentStatus?: string;
  pickupZoneId?: number;
  dropoffZoneId?: number;
}

export const getTripTrends = async (params: TripTrendsParams = {}) => {
  const query = new URLSearchParams();
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);
  if (params.frequency) query.set("frequency", params.frequency);
  if (params.rideStatus) query.set("rideStatus", params.rideStatus);
  if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  if (params.pickupZoneId) query.set("pickupZoneId", String(params.pickupZoneId));
  if (params.dropoffZoneId) query.set("dropoffZoneId", String(params.dropoffZoneId));
  
  return fetchAPI<any[]>(`/operator/reports/trip-trends?${query}`);
};

// High Activity Periods Report
export interface HighActivityPeriodsParams {
  frequency?: "day" | "week" | "month" | "quarter" | "year";
  serviceTypeId?: number;
  rideStatus?: string;
  paymentStatus?: string;
  pickupZoneId?: number;
  dropoffZoneId?: number;
  topN?: number;
}

export const getHighActivityPeriods = async (params: HighActivityPeriodsParams = {}) => {
  const query = new URLSearchParams();
  if (params.frequency) query.set("frequency", params.frequency);
  if (params.serviceTypeId) query.set("serviceTypeId", String(params.serviceTypeId));
  if (params.rideStatus) query.set("rideStatus", params.rideStatus);
  if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  if (params.pickupZoneId) query.set("pickupZoneId", String(params.pickupZoneId));
  if (params.dropoffZoneId) query.set("dropoffZoneId", String(params.dropoffZoneId));
  if (params.topN) query.set("topN", String(params.topN));
  
  return fetchAPI<any[]>(`/operator/reports/high-activity-periods?${query}`);
};

// ============ END REPORT API FUNCTIONS ============

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

export const getAcceptedPersonDocuments = async () => {
  const res = await fetchAPI<any[]>("/operator/accepted-person-documents");
  return Array.isArray(res) ? res : [];
};

export const getRejectedPersonDocuments = async () => {
  const res = await fetchAPI<any[]>("/operator/rejected-person-documents");
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

export type OperatorGdprRequest = {
  GdprId: number;
  UserId: string;
  Username: string;
  Email: string;
  Type: string;
  RequestedAt: string;
  Status: string;
  Reason: string | null;
};

export const getGdprRequests = () =>
  fetchAPI<OperatorGdprRequest[]>("/operator/gdpr-requests");

export const reviewGdprRequest = (params: {
  gdprId: number;
  status: "Completed" | "Denied";
  note?: string;
}) =>
  fetchAPI<{ success: boolean }>("/operator/review-gdpr-request", {
    method: "POST",
    body: JSON.stringify(params),
  });

/** ---------- Service enrollments ---------- **/

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

/** ---------- Service types & allowed ride profiles ---------- **/

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
  active: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}) {
  return jsonRequest("/api/operator/service-types", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateServiceType(
  id: string,
  payload: {
    name: string;
    description: string;
    baseFare: number;
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
  profileName?: string;
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

export interface RideType {
  RideTypeId: number;
  Name: string;
  Description?: string;
}

export interface VehicleType {
  VehicleTypeId: number;
  Name: string;
  NumOfSeats: number;
  MinCargoVolume: number;
  MinCargoWeight: number;
}

export async function getRideTypes(): Promise<RideType[]> {
  return jsonRequest("/api/operator/ride-types");
}

export async function getVehicleTypes(): Promise<VehicleType[]> {
  return jsonRequest("/api/operator/vehicle-types");
}
