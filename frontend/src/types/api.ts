// API Response Types
export type FareEstimate = { 
  min: number; 
  max: number; 
  currency: "€" | "$" 
};

export type VehiclePin = { 
  id: string; 
  lat: number; 
  lon: number; 
  eta_min: number; 
  price_min: number; 
  price_max: number;
  vehicle_type?: string;
};

export type TripRow = { 
  id: string; 
  started_at: string; 
  from_label: string; 
  to_label: string; 
  price: number; 
  status: "requested" | "assigned" | "enroute" | "completed" | "cancelled";
  driver_name?: string;
  vehicle_type?: string;
};

export type TripDetail = TripRow & {
  stages: TripStage[];
  driver?: DriverInfo;
  receipt?: Receipt;
};

export type TripStage = {
  status: string;
  timestamp: string;
  location?: string;
};

export type DriverInfo = {
  id: string;
  name: string;
  rating: number;
  photo_url?: string;
  vehicle_plate: string;
};

export type Receipt = {
  base_fare: number;
  distance_fare: number;
  time_fare: number;
  total: number;
  currency: string;
};

export type ReportRow = { 
  label: string; 
  value: number; 
  extra?: string;
};

export type GeofenceBox = { 
  id: string; 
  name: string; 
  bounds: [number, number, number, number]; // [south, west, north, east]
};

export type BridgeNode = { 
  id: string; 
  name: string; 
  lat: number; 
  lon: number;
};

export type GeofenceData = {
  boxes: GeofenceBox[];
  bridges: BridgeNode[];
};

export type BridgedPath = {
  segments: Array<{
    from: { lat: number; lon: number };
    to: { lat: number; lon: number };
    bridge_id?: string;
  }>;
};

// Enums
export type RideType = 
  | "vehicle_with_driver"
  | "vehicle_rental"
  | "teledriving"
  | "fully_autonomous"
  | "small_cargo_van";

export type ServiceType = 
  | "simple_route"
  | "luxury_route"
  | "light_cargo"
  | "heavy_cargo"
  | "bridged_route";

export type VehicleType = 
  | "Sedan"
  | "Hatchback"
  | "SUV"
  | "Coupe"
  | "Convertible"
  | "Pickup Truck"
  | "Minivan"
  | "Van"
  | "Wagon"
  | "Crossover"
  | "Luxury Car"
  | "Sports Car"
  | "Electric Car"
  | "Hybrid Car"
  | "Truck";

export type EnumsResponse = {
  ride_types: Array<[RideType, string]>;
  services: Array<[ServiceType, string]>;
  veh_types: VehicleType[];
  combo_specs: Array<{
    service_type_id: ServiceType;
    vehicle_type_id: VehicleType;
  }>;
};

export type DriverEarnings = {
  month: number;
  year: number;
  net: number;
  gross: number;
  trips: Array<{
    id: string;
    date: string;
    amount: number;
    from: string;
    to: string;
  }>;
};

export type UserRole = "passenger" | "driver" | "operator" | "inspector" | "company_representative" | "admin";

export type LoginResponse = {
  success: boolean;
  userId: string;
  username: string;
  role: string;
  accountType: string;
  email: string;
  verificationStatus: string;
  error?: string;
}

export type SignupResponse = {
  success: boolean;
  userId: string;
  role: string;
  email: string;
  message: string;
};

export type Location = {
  lat: number;
  lon: number;
  label: string;
};

export type Station = {
  pointId: number;
  zoneId: number;
  latitude: number;
  longitude: number;
  name: string;
  isPickupAllowed: boolean;
  isDropoffAllowed: boolean;
  zoneName: string;
};

export type Zone = {
  zoneId: number;
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  name: string;
};

export type RouteWaypoint = {
  sequenceNumber: number;
  pointId: number;
  latitude: number;
  longitude: number;
  pointType: 'S' | 'B';
  pointName: string;
  zoneId: number;
  pointRole: 'pickup' | 'dropoff' | 'bridge_exit' | 'bridge_entry' | 'waypoint';
};
