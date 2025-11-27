import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// Fix default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapViewProps {
  center: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    popup?: string;
    icon?: "default" | "pickup" | "dropoff" | "vehicle" | "station";
    onClick?: () => void;
  }>;
  polyline?: [number, number][];
  className?: string;
  onMapClick?: (latlng: L.LatLng) => void;
}

export function MapView({
  center,
  zoom = 12,
  markers = [],
  polyline,
  className = "",
  onMapClick,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);

  const containerId = useRef(
    `map-${Math.random().toString(36).slice(2)}`
  );

  // Init Map
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map(containerId.current).setView(center, zoom);

      // ⭐ LIGHT MAP – super readable, Uber-like
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // Click handler
      if (onMapClick) {
        map.on("click", (e) => onMapClick(e.latlng));
      }

      // Marker cluster group
      const clusters = (L as any).markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
      });

      clusters.addTo(map);

      mapRef.current = map;
      clusterRef.current = clusters;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update center
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Update markers & route
  useEffect(() => {
    if (!mapRef.current || !clusterRef.current) return;

    const clusters = clusterRef.current;

    // Clear markers
    clusters.clearLayers();

    // Add markers
    markers.forEach(({ position, popup, icon, onClick }) => {
      const iconObj = getMarkerIcon(icon);
      const marker = L.marker(position, iconObj ? { icon: iconObj } : {});

      if (popup) marker.bindPopup(popup);
      if (onClick) marker.on("click", onClick);

      clusters.addLayer(marker);
    });

    // Clear old route
    if (routeRef.current) {
      mapRef.current.removeLayer(routeRef.current);
      routeRef.current = null;
    }

    // Add route polyline
    if (polyline && polyline.length > 1) {
      const route = L.polyline(polyline, {
        color: "#2563eb", // blue-600
        weight: 4,
        opacity: 0.9,
      }).addTo(mapRef.current);

      routeRef.current = route;
    }
  }, [markers, polyline]);

  return (
    <div
      id={containerId.current}
      className={`w-full h-full rounded-lg ${className}`}
    />
  );
}

// Marker Icon function
function getMarkerIcon(type?: string) {
  const urls: Record<string, string> = {
    pickup:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    dropoff:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    vehicle:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    station:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
  };

  if (!type || !urls[type]) return null;

  return new L.Icon({
    iconUrl: urls[type],
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}
