// src/features/inspector/api.ts
import { fetchAPI } from "@/lib/apiClient";

export type InspectorVehicleSummary = {
  VehicleId: string;
  PlateNumber: string;
  Brand: string;
  Model: string;
  Color: string;
};

export type InspectorVehicleTestRow = {
  TestId: string;
  VehicleId: string;
  CheckDate: string;
  ExpiryDate: string;
  Comments: string;
  PlateNumber: string;
  Brand: string;
  Model: string;
  Color: string;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export const searchVehiclesByPlate = async (
  plateQuery: string,
): Promise<InspectorVehicleSummary[]> => {
  const params = new URLSearchParams();
  if (plateQuery) params.set("plate", plateQuery);

  const res = await fetchAPI<InspectorVehicleSummary[]>(
    `/inspector/vehicles/search?${params.toString()}`,
  );

  return Array.isArray(res) ? res : [];
};

export const getInspectorVehicleTestsPaged = async (opts: {
  page: number;
  pageSize: number;
  vehicleId?: string;
}): Promise<PagedResult<InspectorVehicleTestRow>> => {
  const params = new URLSearchParams();
  params.set("page", String(opts.page));
  params.set("pageSize", String(opts.pageSize));
  if (opts.vehicleId) params.set("vehicleId", opts.vehicleId);

  const res = await fetchAPI<PagedResult<InspectorVehicleTestRow>>(
    `/inspector/vehicle-tests?${params.toString()}`,
  );
  return res;
};

export const createInspectorVehicleTest = async (payload: {
  vehicleId: string;
  comments?: string;
}): Promise<InspectorVehicleTestRow> => {
  const res = await fetchAPI<InspectorVehicleTestRow>("/inspector/vehicle-tests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res;
};
