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

  FromLat: number | null;
  FromLng: number | null;
  ToLat: number | null;
  ToLng: number | null;

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
// Driver availability (legacy online/offline)
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

// Service types (from usp_GetActiveServiceTypesForDriver / /driver/service-types)
export type ServiceTypeRow = {
  ServiceTypeId: number;
  Name: string;
  Description: string;
  BaseFare: number | string;
  PerKm: number | string;
  PerMin: number | string;
};


export const getDriverServiceTypes = () =>
  fetchAPI<{
    success: boolean;
    serviceTypes: ServiceTypeRow[];
    error?: string;
  }>("/driver/service-types");

// Optional: check endpoint if/when you use usp_Service_Enroll_Check
export const checkServiceEnrollment = (params: {
  vehicleId: string;
  serviceTypeId: number;
  rideTypeId?: number | null;
}) =>
  fetchAPI("/driver/service-enroll/check", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const createServiceEnrollment = (params: {
  vehicleId: string;
  serviceTypeId: number;
  rideTypeId?: number | null;
}) =>
  fetchAPI<{
    success: boolean;
    enrollment?: { EnrollId: number };
    error?: string;
  }>("/driver/service-enroll/create", {
    method: "POST",
    body: JSON.stringify(params),
  });

// ---------------------------------------------
// Documents
// ---------------------------------------------

// Upload a single driver document for a given user.
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

export interface PersonDocumentStatus {
  PersonDocId: number;
  DocType: string;   // 'ID_OR_PASSPORT', 'DRIVING_LICENSE', ...
  IssueDate?: string;
  ExpiryDate?: string;
  Status: string;    // 'Pending', 'Accepted', 'Rejected'
  ReviewComments?: string;
  FileUrl?: string;
}

export const getPersonDocumentStatus = () =>
  fetchAPI<PersonDocumentStatus[]>("/driver/person-documents-status");


/**
 * Upload a single vehicle document for a given vehicle.
 */
export const uploadVehicleDocument = (params: {
  vehicleId: string;
  docType: string; // e.g. 'VEHICLE_REGISTRATION'
  docNumber?: string; // Optional for document types like 'VEHICLE_IMAGE'
  issueDate: string; // ISO date string
  expiryDate?: string; // ISO date string, optional
  file: File;
}) => {
  const formData = new FormData();
  formData.append("vehicleId", params.vehicleId);
  formData.append("docType", params.docType);
  if (params.docNumber) {
    // docNumber is optional
    formData.append("docNumber", params.docNumber);
  }
  formData.append("issueDate", params.issueDate);
  if (params.expiryDate) {
    formData.append("expiryDate", params.expiryDate);
  }
  formData.append("file", params.file); // The file itself

  return fetchAPI("/driver/vehicle-documents", {
    method: "POST",
    body: formData,
  });
};

// ---------------------------------------------
// Vehicles
// ---------------------------------------------

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
  HasAllRequiredDocsSubmitted: boolean;
}

/**
 * Get all vehicles for the authenticated driver.
 */
export const getDriverVehicles = () =>
  fetchAPI<Vehicle[]>("/driver/vehicles");

export interface VehicleDocumentStatus {
  VehDocId: number;
  DocType: string;
  IssueDate?: string;
  ExpiryDate?: string;
  Status: string; // e.g., 'Pending', 'Accepted', 'Rejected'
  Accepted: boolean;
  ReviewComments?: string;
  FileUrl?: string;
}

/**
 * Get the status of all documents for a given vehicle.
 */
export const getVehicleDocumentStatus = (vehicleId: string) =>
  fetchAPI<VehicleDocumentStatus[]>(
    `/driver/vehicle-documents-status?vehicleId=${vehicleId}`
  );

export type DriverRideRow = {
  RideId: number;
  RequestId: number;
  LegId: number;
  NumOfPeople: number;
  Status: "Scheduled" | "InProgress" | "Completed" | "Cancelled" | string;
  FromName: string;
  ToName: string;
  ScheduledStart: string;
  ScheduledEnd: string;
  FromLat: number | null;
  FromLng: number | null;
  ToLat: number | null;
  ToLng: number | null;
};

export const startDriverRide = (rideId: number) =>
  fetchAPI<{ success: boolean; error?: string }>(
    `/driver/rides/${rideId}/start`,
    {
      method: "POST",
    }
  );

export const endDriverRide = (
  rideId: number,
  paymentMethod: "Cash" | "CreditCard" = "Cash"
) =>
  fetchAPI<{ success: boolean; error?: string }>(
    `/driver/rides/${rideId}/end`,
    {
      method: "POST",
      body: JSON.stringify({ payment_method: paymentMethod }),
    }
  );

export const getDriverUpcomingRides = () =>
  fetchAPI<{
    success: boolean;
    rides?: DriverRideRow[];
    error?: string;
  }>("/driver/rides/upcoming");

/**
 * Past rides for the driver (history tab)
 */
export type DriverHistoryRow = {
  RideId: number;
  RequestId: number | null;
  LegId: number | null;
  NumOfPeople: number | null;
  Status: string;
  StartedAt: string | null;
  EndedAt: string | null;
  PriceFinal: number | null;
  FromName: string;
  ToName: string;

  PaymentMethod: string | null;
  PaymentStatus: string | null;
  PaymentPaidAt: string | null;

  PaymentGrossAmount: number | null;
  PaymentOsrhFee: number | null;
  PaymentDriverPayout: number | null;
};

// ---------------------------------------------
// Vehicle type requirements (for Add Vehicle page)
// ---------------------------------------------

export type VehicleTypeRequirementRow = {
  VehicleTypeId: number;
  Name: string;
  NumOfSeats: number;
  MinCargoWeight: number;
  MinCargoVolume: number;
};

export const getVehicleTypeRequirements = () =>
  fetchAPI<{
    success: boolean;
    types: VehicleTypeRequirementRow[];
    error?: string;
  }>("/driver/vehicle-type-requirements");


export const getDriverRideHistory = () =>
  fetchAPI<{
    success: boolean;
    rides?: DriverHistoryRow[];
    error?: string;
  }>("/driver/rides/history");

// ---------------------------------------------
// Driver daily availability (new detailed API)
// ---------------------------------------------

export type DriverDailyAvailability = {
  date: string; // "YYYY-MM-DD"
  enabled: boolean;
  enrollId: number | null;
  startTime: string | null; // "HH:MM" or null
  endTime: string | null; // "HH:MM" or null
  locked?: boolean;
};

export type DriverServiceEnrollment = {
  EnrollId: number;
  Status: string;
  VehiclePlate: string;
  ServiceTypeId: number;
  ServiceTypeName: string | null;
  RideTypeId: number;
  RideTypeName: string | null;
};

export const getDriverServiceEnrollments = () =>
  fetchAPI<{
    success: boolean;
    enrollments: DriverServiceEnrollment[];
    error?: string;
  }>("/driver/service-enrollments");

export const cancelDriverServiceEnrollment = (enrollId: number) =>
  fetchAPI<{ success: boolean; error?: string }>(
    `/driver/service-enrollments/${enrollId}/cancel`,
    {
      method: "POST",
    }
  );

export const confirmDriverDailyAvailability = (date: string) =>
  fetchAPI<{
    success: boolean;
    message?: string;
    error?: string;
  }>("/driver/availability/confirm", {
    method: "POST",
    body: JSON.stringify({ date }),
  });

export const getDriverDailyAvailability = (date: string) =>
  fetchAPI<{
    success: boolean;
    availability?: DriverDailyAvailability;
    error?: string;
  }>(`/driver/availability?date=${encodeURIComponent(date)}`);

export const setDriverDailyAvailability = (
  payload: DriverDailyAvailability
) =>
  fetchAPI<{
    success: boolean;
    error?: string;
  }>("/driver/availability", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

// ---------------------------------------------
// Driver photo
// ---------------------------------------------

export async function uploadDriverPhoto(
  file: File
): Promise<{ photoUrl: string }> {
  const formData = new FormData();
  formData.append("file", file);

  return fetchAPI<{ photoUrl: string }>("/driver/photo", {
    method: "POST",
    body: formData,
  });
}

export type DriverPhotoStatus = {
  photoUrl: string | null;
  status: "Submitted" | "Not submitted";
};

export const getDriverPhotoStatus = () =>
  fetchAPI<DriverPhotoStatus>("/driver/photo", {
    method: "GET",
  });

// ---------------------------------------------
// Driver user preferences
// ---------------------------------------------

export interface UserPreferences {
  notificationsEnabled: boolean;
  locEnabled: boolean;
}

export const getDriverPreferences = async (): Promise<UserPreferences> => {
  const res = await fetchAPI<{
    success: boolean;
    preferences?: UserPreferences;
    hasRow?: boolean;
    error?: string;
  }>("/driver/preferences");

  if (!res.success) {
    throw new Error(res.error || "Failed to load preferences.");
  }

  return (
    res.preferences ?? {
      notificationsEnabled: false,
      locEnabled: false,
    }
  );
};

export const updateDriverPreferences = (prefs: UserPreferences) =>
  fetchAPI<{
    success: boolean;
    error?: string;
  }>("/driver/preferences", {
    method: "PUT",
    body: JSON.stringify(prefs),
  });
