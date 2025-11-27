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

export type RideRequestDetails = {
  requestId: number;
  status: string;
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

// == API Functions ==

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