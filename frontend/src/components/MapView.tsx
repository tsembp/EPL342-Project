import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapViewProps {
  center: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    popup?: string;
    icon?: "default" | "pickup" | "dropoff" | "vehicle";
  }>;
  polyline?: [number, number][];
  className?: string;
  onMapClick?: (latlng: L.LatLng) => void;
}

export function MapView({
  center,
  zoom = 13,
  markers = [],
  polyline,
  className = "",
  onMapClick,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerId = useRef(`map-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map(containerId.current).setView(center, zoom);
      
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (onMapClick) {
        map.on("click", (e) => onMapClick(e.latlng));
      }

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers and polylines
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add markers
    markers.forEach(({ position, popup, icon }) => {
      const markerIcon = getMarkerIcon(icon || "default");
      const marker = L.marker(position, markerIcon ? { icon: markerIcon } : undefined);
      if (popup) {
        marker.bindPopup(popup);
      }
      marker.addTo(mapRef.current!);
    });

    // Add polyline
    if (polyline && polyline.length > 1) {
      L.polyline(polyline, {
        color: "hsl(var(--primary))",
        weight: 4,
        opacity: 0.7,
      }).addTo(mapRef.current);
    }
  }, [markers, polyline]);

  return (
    <div
      id={containerId.current}
      className={`w-full h-full rounded-lg ${className}`}
    />
  );
}

function getMarkerIcon(type: string) {
  const iconUrls: Record<string, string> = {
    pickup: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    dropoff: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    vehicle: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  };

  if (!iconUrls[type]) return null;

  return new L.Icon({
    iconUrl: iconUrls[type],
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}
