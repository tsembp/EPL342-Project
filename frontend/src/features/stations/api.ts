import { fetchAPI } from "@/lib/apiClient";
import type { Station, Zone, RouteWaypoint } from "@/types/api";

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
