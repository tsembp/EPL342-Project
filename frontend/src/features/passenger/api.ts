import { fetchAPI } from "@/lib/apiClient";
import type {
  FareEstimate,
  VehiclePin,
  TripRow,
  TripDetail,
  Location,
} from "@/types/api";

// == Types ==
export interface RideRequestPayload {
  numOfPeople: number;
  pickupAt: string;
  pickupPointId: number;
  dropOffPointId: number;
  rideProfileId: string;
}

export interface RideRequestAlternativeLeg {
  seqNo: number;
  fromZoneId: number;
  toZoneId: number;
}

export interface RideRequestAlternative {
  alternativeNo: number;
  legs: RideRequestAlternativeLeg[];
}

export interface RideSummary {
  rideId: number;
  legIndex: number;
  legLabel: string;
  fromName: string;
  toName: string;
  plannedStart?: string;
  plannedEnd?: string;
  status: string;
  driverName: string;
  driverPhoneMasked?: string;
  vehiclePlate?: string;
  vehicleType?: string;
  priceFinal?: number;
}

export type RideRequestDetails = {
  requestId: number;
  status: string;
  rides? : RideSummary[];
  numOfPeople: number;
  pickupAt: string;
  pickup: {
    pointId: number;
    zoneId: number;
    name: string;
  };
  dropoff: {
    pointId: number;
    zoneId: number;
    name: string;
  };
  progressStatus: string;
};

export interface RidePaymentSummary {
  rideId: number;
  paymentId: string;
  finalPrice: number;
  grossAmount: number;
  platformFee: number;
  driverPayout: number;
  paymentMethod: string;
}

export interface RideLiveLocation {
  success: boolean;
  hasLocation?: boolean;
  reason?: string;
  rideId?: number;
  vehicleId?: string;
  lat?: number;
  lng?: number;
  updatedAt?: string;
  error?: string;
}

export interface SelfDriveStatus {
  success: boolean;
  eligible: boolean;
  hasLicense: boolean;
  licenseStatus?: string | null;
  reason?: string;
}


// == API Functions ==

export const getRideRequests = (status: string) =>
  fetchAPI<{ success: boolean; requests?: RideRequestDetails[]; error?: string }>(
    `/passenger/ride-requests/?status=${encodeURIComponent(status)}`
  );

export const getFareEstimate = (params: {
  pickup: Location;
  dropoff: Location;
  service_type_id: string;
  vehicle_type_id: string;
}) => {
  const query = new URLSearchParams({
    pickup_lat: params.pickup.lat.toString(),
    pickup_lon: params.pickup.lon.toString(),
    dropoff_lat: params.dropoff.lat.toString(),
    dropoff_lon: params.dropoff.lon.toString(),
    service_type_id: params.service_type_id,
    vehicle_type_id: params.vehicle_type_id,
  });
  return fetchAPI<FareEstimate>(`/passenger/fare-estimate?${query}`);
};

export const requestRide = (data: {
  pickupPointId: number;
  dropoffPointId: number;
  rideProfileId: string; // GUID
  numOfPeople: number;
  pickupAt: string;      // ISO string
  notes?: string;
}) => {
  return fetchAPI<{ success: boolean; requestId?: number; error?: string }>(
    "/passenger/request-ride",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
};

export const getRideLiveLocation = (rideId: number) =>
  fetchAPI<RideLiveLocation>(`/passenger/rides/${rideId}/vehicle-location-live`);

export const getSelfDriveStatus = () =>
  fetchAPI<SelfDriveStatus>("/passenger/self-drive/status");

export const uploadPassengerLicense = (payload: {
  docNumber: string;
  issueDate: string;
  expiryDate: string;
  file: File;
}) => {
  const formData = new FormData();
  formData.append("docType", "DRIVING_LICENSE");
  formData.append("docNumber", payload.docNumber);
  formData.append("issueDate", payload.issueDate);
  formData.append("expiryDate", payload.expiryDate);
  formData.append("file", payload.file);

  return fetchAPI<{ success: boolean; error?: string }>(
    "/passenger/self-drive/upload-license",
    {
      method: "POST",
      body: formData,
    }
  );
};


export const getRideRequestAlternatives = async (requestId: number) => {
  const response = await fetchAPI<{
    success: boolean;
    requestId?: number;
    alternatives?: RideRequestAlternative[];
    error?: string;
  }>(`/passenger/ride-requests/${requestId}/alternatives`);

  return response; // { success, requestId, alternatives, error }
};

export const selectRideRequestAlternative = (
  requestId: number,
  data: {
    alternativeNo: number;
    legs: any[];
  }
) => {
  return fetchAPI<{ success: boolean; requestId?: number; createdLegIds?: number[]; error?: string }>(
    `/passenger/ride-requests/${requestId}/select-alternative`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
};

export const getRideRequestDetails = (requestId: number) =>
  fetchAPI<{ success: boolean; request?: RideRequestDetails; error?: string }>(
    `/passenger/ride-requests/${requestId}`
  );

export const cancelRideRequest = (requestId: number) =>
  fetchAPI<{ success: boolean; error?: string }>(
    `/passenger/ride-requests/${requestId}/cancel`,
    {
      method: "POST",
    }
  );

export const submitRideRating = (
  rideId: number,
  data: { stars: number; comment?: string }
) =>
  fetchAPI<{ success: boolean; ratingId?: number; error?: string }>(
    `/passenger/rides/${rideId}/rating`,
    {
      method: "POST",
      body: JSON.stringify({
        stars: data.stars,
        comment: data.comment,
      }),
    }
  );

export const payForRideRequest = (
  requestId: number,
  paymentMethod: "CreditCard" | "Cash" = "CreditCard"
) => {
  return fetchAPI<{
    success: boolean;
    requestId?: number;
    payments?: RidePaymentSummary[];
    message?: string;
    error?: string;
  }>(`/passenger/ride-requests/${requestId}/pay`, {
    method: "POST",
    body: JSON.stringify({ paymentMethod }),
  });
};

export interface UserPreferences {
  notificationsEnabled: boolean;
  locEnabled: boolean;
}

// GET /api/passenger/preferences
export const getPassengerPreferences = async (): Promise<UserPreferences> => {
  const res = await fetchAPI<{
    success: boolean;
    preferences?: UserPreferences;
    hasRow?: boolean;
    error?: string;
  }>("/passenger/preferences");

  if (!res.success) {
    throw new Error(res.error || "Failed to load preferences.");
  }

  // If no row yet, backend already sends defaults, but be safe:
  return (
    res.preferences ?? {
      notificationsEnabled: false,
      locEnabled: false,
    }
  );
};

// PUT /api/passenger/preferences
export const updatePassengerPreferences = (prefs: UserPreferences) =>
  fetchAPI<{ success: boolean; error?: string }>("/passenger/preferences", {
    method: "PUT",
    body: JSON.stringify(prefs),
  });
