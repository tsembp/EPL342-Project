import { fetchAPI } from "@/lib/apiClient";
import type { GeofenceData, BridgedPath, Location } from "@/types/api";

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
