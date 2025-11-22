import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { MapView } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Navigation, Loader2, X } from "lucide-react";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";
import { searchLocation, type GeocodingResult } from "@/lib/geocoding";
import type { Location } from "@/types/api";

export default function Map() {
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [fareEstimate, setFareEstimate] = useState<{ min: number; max: number } | null>(null);
  
  // Search state
  const [pickupQuery, setPickupQuery] = useState("");
  const [dropoffQuery, setDropoffQuery] = useState("");
  const [pickupResults, setPickupResults] = useState<GeocodingResult[]>([]);
  const [dropoffResults, setDropoffResults] = useState<GeocodingResult[]>([]);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDropoff, setIsSearchingDropoff] = useState(false);
  const [showPickupResults, setShowPickupResults] = useState(false);
  const [showDropoffResults, setShowDropoffResults] = useState(false);

  // Debounced search for pickup
  useEffect(() => {
    if (pickupQuery.length < 3) {
      setPickupResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPickup(true);
      const results = await searchLocation(pickupQuery);
      setPickupResults(results);
      setIsSearchingPickup(false);
      setShowPickupResults(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [pickupQuery]);

  // Debounced search for dropoff
  useEffect(() => {
    if (dropoffQuery.length < 3) {
      setDropoffResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingDropoff(true);
      const results = await searchLocation(dropoffQuery);
      setDropoffResults(results);
      setIsSearchingDropoff(false);
      setShowDropoffResults(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [dropoffQuery]);

  // Calculate fare estimate when both locations are set
  useEffect(() => {
    if (pickup && dropoff) {
      // Demo fare calculation based on distance
      const distance = Math.sqrt(
        Math.pow(dropoff.lat - pickup.lat, 2) + 
        Math.pow(dropoff.lon - pickup.lon, 2)
      ) * 111; // rough km conversion
      const baseFare = 5;
      const perKm = 2;
      const estimated = baseFare + (distance * perKm);
      setFareEstimate({
        min: Math.round(estimated * 0.9),
        max: Math.round(estimated * 1.1),
      });
    } else {
      setFareEstimate(null);
    }
  }, [pickup, dropoff]);

  const handleSelectPickup = (result: GeocodingResult) => {
    setPickup({ lat: result.lat, lon: result.lon, label: result.label });
    setPickupQuery(result.label);
    setShowPickupResults(false);
  };

  const handleSelectDropoff = (result: GeocodingResult) => {
    setDropoff({ lat: result.lat, lon: result.lon, label: result.label });
    setDropoffQuery(result.label);
    setShowDropoffResults(false);
  };

  const handleClearPickup = () => {
    setPickup(null);
    setPickupQuery("");
    setPickupResults([]);
    setShowPickupResults(false);
  };

  const handleClearDropoff = () => {
    setDropoff(null);
    setDropoffQuery("");
    setDropoffResults([]);
    setShowDropoffResults(false);
  };

  const markers = [
    ...(pickup ? [{ position: [pickup.lat, pickup.lon] as [number, number], icon: "pickup" as const, popup: pickup.label }] : []),
    ...(dropoff ? [{ position: [dropoff.lat, dropoff.lon] as [number, number], icon: "dropoff" as const, popup: dropoff.label }] : []),
  ];

  const polyline = pickup && dropoff ? [
    [pickup.lat, pickup.lon] as [number, number],
    [dropoff.lat, dropoff.lon] as [number, number],
  ] : undefined;

  const handleRequestRide = () => {
    // This would call the API
    console.log("Request ride", { pickup, dropoff });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header title="Map" />
      
      <div className="flex-1 relative">
        <MapView
          center={pickup ? [pickup.lat, pickup.lon] : DEFAULT_MAP_CENTER}
          markers={markers}
          polyline={polyline}
          className="h-full absolute inset-0 z-0"
        />

        {/* Search overlay */}
        <div className="absolute top-4 left-4 right-4 z-20">
          <Card className="p-4 shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Where to?</span>
            </div>
            
            <div className="space-y-2 relative">
              {/* Pickup input */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0" />
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Pickup location (e.g., Nicosia, Limassol)"
                      className="h-11 pr-8"
                      value={pickupQuery}
                      onChange={(e) => setPickupQuery(e.target.value)}
                      onFocus={() => pickupResults.length > 0 && setShowPickupResults(true)}
                    />
                    {isSearchingPickup && (
                      <Loader2 className="h-4 w-4 animate-spin absolute right-2 top-3.5 text-muted-foreground" />
                    )}
                    {pickup && !isSearchingPickup && (
                      <button
                        onClick={handleClearPickup}
                        className="absolute right-2 top-3.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Pickup results dropdown */}
                {showPickupResults && pickupResults.length > 0 && (
                  <Card className="absolute top-full left-8 right-0 mt-1 z-20 max-h-48 overflow-y-auto shadow-lg">
                    {pickupResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectPickup(result)}
                        className="w-full text-left px-3 py-2 hover:bg-muted border-b last:border-b-0 text-sm"
                      >
                        <div className="font-medium">{result.label}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {result.displayName}
                        </div>
                      </button>
                    ))}
                  </Card>
                )}
              </div>
              
              {/* Dropoff input */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-destructive flex-shrink-0" />
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Drop-off location (e.g., Larnaca Airport)"
                      className="h-11 pr-8"
                      value={dropoffQuery}
                      onChange={(e) => setDropoffQuery(e.target.value)}
                      onFocus={() => dropoffResults.length > 0 && setShowDropoffResults(true)}
                    />
                    {isSearchingDropoff && (
                      <Loader2 className="h-4 w-4 animate-spin absolute right-2 top-3.5 text-muted-foreground" />
                    )}
                    {dropoff && !isSearchingDropoff && (
                      <button
                        onClick={handleClearDropoff}
                        className="absolute right-2 top-3.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Dropoff results dropdown */}
                {showDropoffResults && dropoffResults.length > 0 && (
                  <Card className="absolute top-full left-8 right-0 mt-1 z-20 max-h-48 overflow-y-auto shadow-lg">
                    {dropoffResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectDropoff(result)}
                        className="w-full text-left px-3 py-2 hover:bg-muted border-b last:border-b-0 text-sm"
                      >
                        <div className="font-medium">{result.label}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {result.displayName}
                        </div>
                      </button>
                    ))}
                  </Card>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Fare estimate */}
        {fareEstimate && pickup && dropoff && (
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
                  {Math.round(
                    Math.sqrt(
                      Math.pow(dropoff.lat - pickup.lat, 2) + 
                      Math.pow(dropoff.lon - pickup.lon, 2)
                    ) * 111
                  )} km
                </Badge>
              </div>
              
              <Button onClick={handleRequestRide} className="w-full h-12">
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
