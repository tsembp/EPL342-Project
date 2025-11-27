import { fetchAPI } from "@/lib/apiClient";
import type { TripRow, DriverEarnings } from "@/types/api";

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

export const setDriverAvailability = (is_online: boolean) =>
  fetchAPI("/driver/availability", {
    method: "POST",
    body: JSON.stringify({ is_online }),
  });

export const getDriverOffers = () =>
  fetchAPI<TripRow[]>("/driver/offers");

export const acceptOffer = (requestId: string) =>
  fetchAPI(`/driver/accept/${requestId}`, {
    method: "POST",
  });

export const getDriverEarnings = (params: { month: number; year: number }) => {
  const query = new URLSearchParams({
    month: params.month.toString(),
    year: params.year.toString(),
  });
  return fetchAPI<DriverEarnings>(`/driver/earnings?${query}`);
};

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

/**
 * Upload a single driver document for a given user.
 * This is used in the post-signup flow and is unauthenticated.
 */
export const uploadDriverDocument = (params: {
  userId: string;
  docType: string;      // e.g. 'ID_OR_PASSPORT'
  docNumber: string;
  issueDate: string;    // ISO date string
  expiryDate?: string;  // ISO date string, optional when not needed
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
  formData.append("file", params.file); // The file itself

  return fetchAPI("/driver/documents", {
    method: "POST",
    body: formData,
  });
};

/**
 * Upload a single vehicle document for a given vehicle.
 */
export const uploadVehicleDocument = (params: {
  vehicleId: string;
  docType: string;      // e.g. 'VEHICLE_REGISTRATION'
  docNumber?: string;   // Optional for document types like 'VEHICLE_IMAGE'
  issueDate: string;    // ISO date string
  expiryDate?: string;  // ISO date string, optional
  file: File;
}) => {
  const formData = new FormData();
  formData.append("vehicleId", params.vehicleId);
  formData.append("docType", params.docType);
  if (params.docNumber) { // docNumber is optional
    formData.append("docNumber", params.docNumber);
  }
  formData.append("issueDate", params.issueDate);
  if (params.expiryDate) {
    formData.append("expiryDate", params.expiryDate);
  }
  formData.append("file", params.file); // The file itself

  return fetchAPI("/driver/vehicle-documents", { // New endpoint
    method: "POST",
    body: formData,
  });
};

export interface AddVehicleRequest {
  vehicleTypeId: number;
  plateNumber: string;
  brand: string;
  model: string;
  color: string;
  seats: number;
  cargoVolume?: number;
  cargoWeight?: number;
}

export interface AddVehicleResponse {
  success: boolean;
  vehicleId?: string;
  error?: string;
}

/**
 * Add a new vehicle for the logged-in driver.
 */
export const addVehicle = (data: AddVehicleRequest) =>
  fetchAPI<AddVehicleResponse>("/driver/add-vehicle", {
    method: "POST",
    body: JSON.stringify(data),
  });

export interface Vehicle {
  VehicleId: string;
  PlateNumber: string;
  Brand: string;
  Model: string;
  Color: string;
  Seats: number;
  CargoVolume: number;
  CargoWeight: number;
  VehicleStatus: string;
  VehicleType: string;
  IsApproved: boolean;
}

/**
 * Get all vehicles for the authenticated driver.
 */
export const getDriverVehicles = () =>
  fetchAPI<Vehicle[]>("/driver/vehicles");