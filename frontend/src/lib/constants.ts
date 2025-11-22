// Static enums (mirrored from DB seed for UX)

export const RIDE_TYPES = [
  ["vehicle_with_driver", "Ride with a driver"],
  ["vehicle_no_driver", "Driverless car"],
  ["teledriving", "Teleoperated vehicle"],
  ["fully_autonomous", "Autonomous vehicle"],
  ["small_cargo_van", "Cargo van (small)"],
] as const;

export const SERVICES = [
  ["simple_route", "A→B passenger"],
  ["luxury_route", "A→B premium"],
  ["light_cargo", "Light cargo"],
  ["heavy_cargo", "Heavy cargo"],
  ["bridged_route", "Geofenced multi-hop"],
] as const;

export const VEH_TYPES = [
  "Sedan",
  "Hatchback",
  "SUV",
  "Coupe",
  "Convertible",
  "Pickup Truck",
  "Minivan",
  "Van",
  "Wagon",
  "Crossover",
  "Luxury Car",
  "Sports Car",
  "Electric Car",
  "Hybrid Car",
  "Truck",
] as const;

export const DEFAULT_MAP_CENTER: [number, number] = [35.1264, 33.4299]; // Nicosia, Cyprus
export const DEFAULT_MAP_ZOOM = 13;
