import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { renderToString } from 'react-dom/server';

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
    icon?: "default" | "pickup" | "dropoff" | "station" | "vehicle" | "taxi";
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

  // Update center only if we don't have markers to auto-fit
  useEffect(() => {
    if (mapRef.current && markers.length <= 1) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom, markers.length]);

  // Update markers & route
  useEffect(() => {
    if (!mapRef.current || !clusterRef.current) return;

    const clusters = clusterRef.current;
    const map = mapRef.current;

    // Clear markers
    clusters.clearLayers();

    // Add markers
    const allMarkers: L.Marker[] = [];
    markers.forEach(({ position, popup, icon, onClick }) => {
      const iconObj = getMarkerIcon(icon);
      const marker = L.marker(position, iconObj ? { icon: iconObj } : {});

      if (popup) marker.bindPopup(popup);
      if (onClick) marker.on("click", onClick);

      clusters.addLayer(marker);
      allMarkers.push(marker);
    });

    // Clear old route
    if (routeRef.current) {
      map.removeLayer(routeRef.current);
      routeRef.current = null;
    }

    // Add route polyline
    if (polyline && polyline.length > 1) {
      const route = L.polyline(polyline, {
        color: "#2563eb", // blue-600
        weight: 4,
        opacity: 0.9,
      }).addTo(map);

      routeRef.current = route;
    }

    // Auto-fit bounds if we have markers or polyline
    if (markers.length > 1 || (polyline && polyline.length > 1)) {
      const bounds = L.latLngBounds([]);
      
      // Add marker positions to bounds
      markers.forEach(({ position }) => {
        bounds.extend(position);
      });
      
      // Add polyline positions to bounds
      if (polyline && polyline.length > 1) {
        polyline.forEach((pos) => {
          bounds.extend(pos);
        });
      }
      
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
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
  // For standard markers, use colored pins
  const urls: Record<string, string> = {
    pickup:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    dropoff:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    station:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
  };

  // For taxi, use custom SVG icon with circular background
  if (type === "taxi") {
    const taxiSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <!-- Circular background -->
        <circle cx="20" cy="20" r="18" fill="#eab308" opacity="0.9"/>
        <circle cx="20" cy="20" r="18" fill="none" stroke="#fff" stroke-width="2"/>
        
        <!-- Taxi icon centered -->
        <g transform="translate(8, 8)">
          <path d="M10 2h4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M7 14h.01" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M17 14h.01" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <rect width="18" height="8" x="3" y="10" rx="2" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M5 18v2" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M19 18v2" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </g>
      </svg>
    `;
    
    const taxiIconUrl = 'data:image/svg+xml;base64,' + btoa(taxiSvg);
    
    return new L.Icon({
      iconUrl: taxiIconUrl,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });
  }

  // For vehicle, use car icon with circular background
  if (type === "vehicle") {
    const carSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <!-- Circular background -->
        <circle cx="20" cy="20" r="18" fill="#3b82f6" opacity="0.9"/>
        <circle cx="20" cy="20" r="18" fill="none" stroke="#fff" stroke-width="2"/>
        
        <!-- Car icon centered -->
        <g transform="translate(8, 8)">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <circle cx="7" cy="17" r="2" stroke="#fff" stroke-width="2" fill="none"/>
          <path d="M9 17h6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <circle cx="17" cy="17" r="2" stroke="#fff" stroke-width="2" fill="none"/>
        </g>
      </svg>
    `;
    
    const carIconUrl = 'data:image/svg+xml;base64,' + btoa(carSvg);
    
    return new L.Icon({
      iconUrl: carIconUrl,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });
  }

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