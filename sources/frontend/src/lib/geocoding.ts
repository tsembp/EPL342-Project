// Geocoding utilities using Nominatim (OpenStreetMap) API
// Free and open-source geocoding for Cyprus locations

export interface GeocodingResult {
  lat: number;
  lon: number;
  label: string;
  displayName: string;
}

/**
 * Search for locations in Cyprus using Nominatim geocoding
 * @param query - Address or place name to search for
 * @returns Array of matching locations
 */
export async function searchLocation(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    // Use Nominatim with Cyprus viewport to prioritize local results
    const params = new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      limit: "5",
      countrycodes: "cy", // Restrict to Cyprus
      viewbox: "32.2566,34.5718,34.5947,35.7014", // Cyprus bounding box
      bounded: "1", // Strictly within viewbox
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "User-Agent": "RideBridge/1.0", // Required by Nominatim usage policy
        },
      }
    );

    if (!response.ok) {
      throw new Error("Geocoding request failed");
    }

    const results = await response.json();

    return results.map((result: any) => ({
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      label: result.name || result.display_name.split(",")[0],
      displayName: result.display_name,
    }));
  } catch (error) {
    console.error("Geocoding error:", error);
    return [];
  }
}

/**
 * Reverse geocode: convert coordinates to address
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Address label
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<string> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      format: "json",
      zoom: "18",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      {
        headers: {
          "User-Agent": "RideBridge/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Reverse geocoding failed");
    }

    const result = await response.json();
    return result.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}
