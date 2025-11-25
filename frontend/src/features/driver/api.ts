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
