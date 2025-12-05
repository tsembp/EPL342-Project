// ZoneSelector.tsx - Component for selecting geofence zones on a map
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import type { GeofenceZone } from "@/features/driver/api";

interface ZoneSelectorProps {
  zones: GeofenceZone[];
  selectedZoneId: number | null;
  onZoneSelect: (zoneId: number) => void;
  disabled?: boolean;
}

export function ZoneSelector({
  zones,
  selectedZoneId,
  onZoneSelect,
  disabled = false,
}: ZoneSelectorProps) {
  const mapRef = useRef<L.Map | null>(null);
  const rectanglesRef = useRef<Map<number, L.Rectangle>>(new Map());
  const containerId = useRef(`zone-map-${Math.random().toString(36).slice(2)}`);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current && zones.length > 0) {
      // Calculate center from all zones
      const validZones = zones.filter(
        (z) => z.minLat && z.minLng && z.maxLat && z.maxLng
      );

      if (validZones.length === 0) return;

      const avgLat =
        validZones.reduce((sum, z) => sum + ((z.minLat! + z.maxLat!) / 2), 0) /
        validZones.length;
      const avgLng =
        validZones.reduce((sum, z) => sum + ((z.minLng! + z.maxLng!) / 2), 0) /
        validZones.length;

      const map = L.map(containerId.current, {
        center: [avgLat, avgLng],
        zoom: 10,
        zoomControl: true,
      });

      // Light map tile layer
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      mapRef.current = map;
      setMapReady(true);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapReady(false);
      }
    };
  }, [zones]);

  // Draw zones as rectangles
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const map = mapRef.current;
    const rectangles = rectanglesRef.current;

    // Clear existing rectangles
    rectangles.forEach((rect) => rect.remove());
    rectangles.clear();

    zones.forEach((zone) => {
      if (!zone.minLat || !zone.minLng || !zone.maxLat || !zone.maxLng) return;

      const bounds: L.LatLngBoundsExpression = [
        [zone.minLat, zone.minLng],
        [zone.maxLat, zone.maxLng],
      ];

      const isSelected = zone.zoneId === selectedZoneId;

      const rectangle = L.rectangle(bounds, {
        color: isSelected ? "#000000" : "#6b7280",
        fillColor: isSelected ? "#000000" : "#9ca3af",
        fillOpacity: isSelected ? 0.3 : 0.15,
        weight: isSelected ? 3 : 2,
        className: disabled ? "cursor-not-allowed" : "cursor-pointer",
      });

      // Add click handler if not disabled
      if (!disabled) {
        rectangle.on("click", () => {
          onZoneSelect(zone.zoneId);
        });
      }

      // Add tooltip
      rectangle.bindTooltip(zone.name || `Zone ${zone.zoneId}`, {
        permanent: false,
        direction: "top",
      });

      rectangle.addTo(map);
      rectangles.set(zone.zoneId, rectangle);
    });

    // Fit map to show all zones
    if (zones.length > 0) {
      const validZones = zones.filter(
        (z) => z.minLat && z.minLng && z.maxLat && z.maxLng
      );

      if (validZones.length > 0) {
        const allBounds = validZones.map(
          (z) =>
            [
              [z.minLat!, z.minLng!],
              [z.maxLat!, z.maxLng!],
            ] as L.LatLngBoundsExpression
        );

        const group = L.featureGroup(
          allBounds.map((b) => L.rectangle(b))
        );

        map.fitBounds(group.getBounds(), { padding: [20, 20] });

        // Clean up temporary feature group
        group.remove();
      }
    }
  }, [zones, selectedZoneId, disabled, onZoneSelect, mapReady]);

  if (zones.length === 0) {
    return (
      <Card className="border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs text-gray-600">
          No zones available. Please contact support.
        </p>
      </Card>
    );
  }

  return (
    <div
      id={containerId.current}
      className="h-96 w-full rounded-lg border border-gray-300"
      style={{ minHeight: "384px" }}
    />
  );
}
