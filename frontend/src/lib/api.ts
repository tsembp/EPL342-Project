// Central API client - all endpoints call SQL views/procedures
// Server uses parameterized queries only; no string concatenation to prevent SQLi

import type {
  FareEstimate,
  VehiclePin,
  TripRow,
  TripDetail,
  EnumsResponse,
  GeofenceData,
  BridgedPath,
  DriverEarnings,
  ReportRow,
  Location,
  Station,
  Zone,
  RouteWaypoint,
} from "@/types/api";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: 'include', // Include cookies for session management
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// Authentication endpoints
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  userId: string;
  role: string;
  accountType: 'USER' | 'STAFF';
  email: string;
  error?: string;
}

export interface SignupRequest {
  accountType: 'user' | 'staff';
  role: string;
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  address?: string;
  company?: string;
}

export interface SignupResponse {
  success: boolean;
  userId?: string;
  role?: string;
  email?: string;
  message?: string;
  error?: string;
}

export interface AuthCheckResponse {
  authenticated: boolean;
  userId?: string;
  role?: string;
  accountType?: 'USER' | 'STAFF';
  email?: string;
}

export const login = (data: LoginRequest) =>
  fetchAPI<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const signup = (data: SignupRequest) =>
  fetchAPI<SignupResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const logout = () =>
  fetchAPI<{ success: boolean; message: string }>("/auth/logout", {
    method: "POST",
  });

export const checkAuth = () =>
  fetchAPI<AuthCheckResponse>("/auth/me");

// Meta
export const getEnums = () => fetchAPI<EnumsResponse>("/meta/enums");

// Passenger endpoints
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
  pickup: Location;
  dropoff: Location;
  service_type_id: string;
  vehicle_type_id: string;
  notes?: string;
}) =>
  fetchAPI<{ trip_id: string }>("/passenger/request-ride", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getNearbyVehicles = (params: {
  lat: number;
  lon: number;
  radius_m: number;
}) => {
  const query = new URLSearchParams({
    lat: params.lat.toString(),
    lon: params.lon.toString(),
    radius_m: params.radius_m.toString(),
  });
  return fetchAPI<VehiclePin[]>(`/passenger/nearby-vehicles?${query}`);
};

export const getPassengerTrips = (params: { page: number; size: number }) => {
  const query = new URLSearchParams({
    page: params.page.toString(),
    size: params.size.toString(),
  });
  return fetchAPI<TripRow[]>(`/passenger/trips?${query}`);
};

export const getTripDetail = (id: string) =>
  fetchAPI<TripDetail>(`/passenger/trip/${id}`);

export const payTrip = (id: string) =>
  fetchAPI<{ receipt_id: string }>(`/passenger/pay/${id}`, {
    method: "POST",
  });

// Driver endpoints
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

// GDPR
export const submitGDPRRequest = (data: { reason: string; user_id: string }) =>
  fetchAPI("/gdpr/request", {
    method: "POST",
    body: JSON.stringify(data),
  });

// Geofence
export const getGeofenceTiles = () =>
  fetchAPI<GeofenceData>("/geofence/tiles");

export const getBridgedPath = (params: {
  pickup: Location;
  dropoff: Location;
}) => {
  const query = new URLSearchParams({
    pickup_lat: params.pickup.lat.toString(),
    pickup_lon: params.pickup.lon.toString(),
    dropoff_lat: params.dropoff.lat.toString(),
    dropoff_lon: params.dropoff.lon.toString(),
  });
  return fetchAPI<BridgedPath>(`/geofence/bridged-path?${query}`);
};

// Operator
export const getOperatorReports = (params: {
  kind: string;
  from: string;
  to: string;
}) => {
  const query = new URLSearchParams(params);
  return fetchAPI<ReportRow[]>(`/operator/reports?${query}`);
};

// Stations & Zones
export const getStations = async (): Promise<Station[]> => {
  const response = await fetchAPI<{ success: boolean; stations: Station[]; total: number }>('/stations');
  return response.stations;
};

export const getZones = async (): Promise<Zone[]> => {
  const response = await fetchAPI<{ success: boolean; zones: Zone[]; total: number }>('/zones');
  return response.zones;
};

export const getRouteVisualization = async (pickupPointId: number, dropoffPointId: number): Promise<RouteWaypoint[]> => {
  const response = await fetchAPI<{ success: boolean; waypoints: RouteWaypoint[]; totalWaypoints: number }>(
    `/route/visualization?pickupPointId=${pickupPointId}&dropoffPointId=${dropoffPointId}`
  );
  return response.waypoints;
};
