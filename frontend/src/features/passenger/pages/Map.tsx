import { useState, useEffect } from "react";

const SERVICE_TYPES = [
  { key: "bridged_route", label: "Bridged Route" },
  { key: "heavy_cargo", label: "Heavy Cargo" },
  { key: "light_cargo", label: "Light Cargo" },
  { key: "luxury_route", label: "Luxury Route" },
  { key: "simple_route", label: "Simple Route" },
];

const RIDE_TYPES = [
  { key: "fully_autonomous", label: "Fully Autonomous" },
  { key: "small_cargo_van", label: "Small Cargo Van" },
  { key: "teledriving", label: "Teledriving" },
  { key: "vehicle_rental", label: "No Driver" },
  { key: "vehicle_with_driver", label: "With Driver" },
];
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { MapView } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Loader2, Circle } from "lucide-react";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";
import { getStations, getRouteVisualization } from "@/lib/api";
import type { Station, RouteWaypoint } from "@/types/api";

export default function Map() {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [pickupStation, setPickupStation] = useState<Station | null>(null);
  const [dropoffStation, setDropoffStation] = useState<Station | null>(null);
  const [fareEstimate, setFareEstimate] = useState<{ min: number; max: number } | null>(null);
  const [serviceType, setServiceType] = useState<string | null>(null);
  const [rideType, setRideType] = useState<string | null>(null);
  const [routeWaypoints, setRouteWaypoints] = useState<RouteWaypoint[]>([]);
  const [routeDistance, setRouteDistance] = useState<number>(0);

  // Load stations on mount
  useEffect(() => {
    const loadStations = async () => {
      try {
        setIsLoading(true);
        const data = await getStations();
        setStations(data);
      } catch (error) {
        console.error('Failed to load stations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStations();
  }, []);

  // Fetch route and calculate fare estimate when both stations are selected
  useEffect(() => {
    const fetchRoute = async () => {
      if (pickupStation && dropoffStation) {
        try {
          // Get route waypoints from stored procedure
          const waypoints = await getRouteVisualization(
            pickupStation.pointId, 
            dropoffStation.pointId
          );
          setRouteWaypoints(waypoints);
          
          // Calculate total distance along the route
          let totalDistance = 0;
          for (let i = 0; i < waypoints.length - 1; i++) {
            const lat1 = waypoints[i].latitude;
            const lng1 = waypoints[i].longitude;
            const lat2 = waypoints[i + 1].latitude;
            const lng2 = waypoints[i + 1].longitude;
            
            // Haversine-like approximation (simple distance)
            const segmentDist = Math.sqrt(
              Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2)
            ) * 111; // Convert to km
            
            totalDistance += segmentDist;
          }
          
          setRouteDistance(totalDistance);
          
          const baseFare = 5;
          const perKm = 2;
          const estimated = baseFare + (totalDistance * perKm);
          
          setFareEstimate({
            min: Math.round(estimated * 0.9),
            max: Math.round(estimated * 1.1),
          });
        } catch (error) {
          console.error('Failed to fetch route:', error);
          setRouteWaypoints([]);
          setRouteDistance(0);
          setFareEstimate(null);
        }
      } else {
        setRouteWaypoints([]);
        setRouteDistance(0);
        setFareEstimate(null);
      }
    };
    
    fetchRoute();
  }, [pickupStation, dropoffStation]);

  // Create markers for all stations + highlight selected ones
  const markers = stations.map(station => {
    let iconType: "pickup" | "dropoff" | "station" = "station";
    if (station.pointId === pickupStation?.pointId) {
      iconType = "pickup";
    } else if (station.pointId === dropoffStation?.pointId) {
      iconType = "dropoff";
    }
    
    return {
      position: [station.latitude, station.longitude] as [number, number],
      icon: iconType,
      popup: `${station.name} (${station.zoneName})`,
      onClick: () => {
        // If no pickup selected, set as pickup
        if (!pickupStation) {
          setPickupStation(station);
        } 
        // If pickup is selected but no dropoff, set as dropoff
        else if (!dropoffStation && station.pointId !== pickupStation.pointId) {
          setDropoffStation(station);
        }
        // If both selected, replace pickup with this station
        else {
          setPickupStation(station);
          setDropoffStation(null);
        }
      }
    };
  });

  // Build polyline from route waypoints (includes bridge points)
  const polyline = routeWaypoints.length > 0 
    ? routeWaypoints.map(wp => [wp.latitude, wp.longitude] as [number, number])
    : undefined;

  const handleRequestRide = () => {
    if (!pickupStation || !dropoffStation || !serviceType || !rideType) return;
    console.log("Request ride", { 
      pickupPointId: pickupStation.pointId,
      dropoffPointId: dropoffStation.pointId,
      serviceType,
      rideType,
    });
  };

  const mapCenter = pickupStation 
    ? [pickupStation.latitude, pickupStation.longitude] as [number, number]
    : DEFAULT_MAP_CENTER;

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header title="Request a Ride" />
      
      <div className="flex-1 relative">
        <MapView center={mapCenter} markers={markers} polyline={polyline} className="h-full absolute inset-0 z-0" />

        {isLoading && (
          <div className="absolute top-4 left-4 z-20">
            <Card className="p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading stations...</span>
              </div>
            </Card>
          </div>
        )}

        {fareEstimate && pickupStation && dropoffStation && (
          <div className="absolute bottom-20 left-4 right-4 z-20">
            <Card className="p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Estimated fare</p>
                  <p className="text-2xl font-bold">
                    €{fareEstimate.min} - €{fareEstimate.max}
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  <Navigation className="h-3 w-3 mr-1" />
                  {Math.round(routeDistance)} km
                </Badge>
              </div>

              <div className="space-y-2 mb-3 text-sm">
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3 text-primary fill-primary" />
                  <span className="text-muted-foreground">{pickupStation.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-destructive" />
                  <span className="text-muted-foreground">{dropoffStation.name}</span>
                </div>
              </div>


              {/* Service Type Dropdown */}
              <div className="mb-3">
                <p className="text-sm font-medium mb-1">Select Service Type</p>
                <Select value={serviceType ?? undefined} onValueChange={setServiceType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((type) => (
                      <SelectItem key={type.key} value={type.key}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ride Type Dropdown */}
              <div className="mb-4">
                <p className="text-sm font-medium mb-1">Select Ride Type</p>
                <Select value={rideType ?? undefined} onValueChange={setRideType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a ride type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RIDE_TYPES.map((type) => (
                      <SelectItem key={type.key} value={type.key}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleRequestRide}
                className="w-full h-12"
                disabled={!serviceType || !rideType}
              >
                Request ride
              </Button>
            </Card>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
