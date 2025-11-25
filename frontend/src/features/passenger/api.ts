import { fetchAPI } from "@/lib/apiClient";
import type {
  FareEstimate,
  VehiclePin,
  TripRow,
  TripDetail,
  Location,
} from " @/types/api";

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
