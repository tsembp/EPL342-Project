import { fetchAPI } from "@/lib/apiClient";
import type { TripRow, DriverEarnings } from "@/types/api";

/**
 * Shape returned by usp_GetDispatchOffersForDriver
 */
export type DispatchOfferRow = {
  OfferId: number;
  OfferStatus: string;
  SentAt: string;
  RespondedAt: string | null;

  EnrollId: number;
  VehicleId: string;
  ServiceTypeId: number;
  ServiceTypeName: string | null;
  RideTypeId: number;
  RideTypeName: string | null;

  LegId: number;
  SeqNo: number;
  ZoneId: number;
  FromPointId: number | null;
  ToPointId: number | null;
  ApproxStartTime: string | null;
  ApproxEndTime: string | null;

  FromPointName: string | null;
  ToPointName: string | null;

  RequestId: number;
  NumOfPeople: number;
  PickupAt: string;
  RequestStatus: string;
  PickUpPoint: number;
  DropOffPoint: number;
};

// ---------------------------------------------
// Driver onboarding
// ---------------------------------------------

export const submitDriverOnboarding = (data: {
  name: string;
  licence_no: string;
  document_refs?: string[];
}) =>
  fetchAPI("/driver/onboarding", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const submitDriverVehicle = (data: {
  vehicle_type: string;
  seats: number;
  cargo_notes?: string;
  photo_refs?: string[];
}) =>
  fetchAPI("/driver/vehicle", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ---------------------------------------------
// Driver availability
// ---------------------------------------------

export const setDriverAvailability = (is_online: boolean) =>
  fetchAPI("/driver/availability", {
    method: "POST",
    body: JSON.stringify({ is_online }),
  });

// ---------------------------------------------
// Dispatch offers
// ---------------------------------------------

export const getDriverOffers = () =>
  fetchAPI<{ success: boolean; offers: DispatchOfferRow[] }>(
    "/driver/offers"
  );

export const acceptOffer = (offerId: string) =>
  fetchAPI(`/driver/accept/${offerId}`, {
    method: "POST",
  });

export const respondToOffer = (
  offerId: number,
  action: "accept" | "reject"
) =>
  fetchAPI<{ success: boolean; offer: DispatchOfferRow | null }>(
    `/driver/offers/${offerId}/respond`,
    {
      method: "POST",
      body: JSON.stringify({ action }),
    }
  );

// ---------------------------------------------
// Earnings
// ---------------------------------------------

export const getDriverEarnings = (params: { month: number; year: number }) => {
  const query = new URLSearchParams({
    month: params.month.toString(),
    year: params.year.toString(),
  });
  return fetchAPI<DriverEarnings>(`/driver/earnings?${query}`);
};

// ---------------------------------------------
// Service enrollment
// ---------------------------------------------

export const checkServiceEnrollment = (params: {
  userId: string;
  vehicleId: number;
  serviceTypeId: number;
}) =>
  fetchAPI("/driver/service-enroll/check", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const createServiceEnrollment = (params: {
  userId: string;
  vehicleId: number;
  serviceTypeId: number;
}) =>
  fetchAPI("/driver/service-enroll/create", {
    method: "POST",
    body: JSON.stringify(params),
  });

// ---------------------------------------------
// Document upload
// ---------------------------------------------

/**
 * Upload a single driver document for a given user.
 */
export const uploadDriverDocument = (params: {
  userId: string;
  docType: string; // 'ID_OR_PASSPORT', etc.
  docNumber: string;
  issueDate: string;
  expiryDate?: string;
  file: File;
}) => {
  const formData = new FormData();
  formData.append("userId", params.userId);
  formData.append("docType", params.docType);
  formData.append("docNumber", params.docNumber);
  formData.append("issueDate", params.issueDate);

  if (params.expiryDate) {
    formData.append("expiryDate", params.expiryDate);
  }

  formData.append("file", params.file);

  return fetchAPI("/driver/documents", {
    method: "POST",
    body: formData,
  });
};
