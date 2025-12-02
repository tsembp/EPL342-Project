#!/usr/bin/env python3
"""
Generate Cyprus geofence zones, station points, and bridges
for free (Republic of) Cyprus only - excluding water and northern areas.

Usage:
    python generate_cyprus_zones.py

Requirements:
    pip install geopandas shapely pandas numpy
"""

import argparse
import random
from pathlib import Path
from typing import List, Tuple, Set

import geopandas as gpd
import numpy as np
import pandas as pd
import requests
from shapely.geometry import Point, Polygon, box, shape


# ============================================================================
# CONFIGURATION - Adjust these parameters as needed
# ============================================================================

CONFIG = {
    # Input/Output
    'LAND_BOUNDARY_FILE': 'seed_data/cyprus_boundary.geojson',
    'OUTPUT_DIR': './output',
    
    # Grid Configuration
    'MIN_LAT': 34.56,
    'MAX_LAT': 35.16,
    'MIN_LNG': 32.30,
    'MAX_LNG': 34.10,
    'LAT_STEP': 0.19,  # Latitude step size (degrees) - ~21km
    'LNG_STEP': 0.19,  # Longitude step size (degrees) - ~21km
    
    # Points Configuration
    'STATIONS_PER_ZONE': 4,  # Number of pickup/drop stations per zone
    'RANDOM_SEED': 42,  # For reproducibility
    
    # Bridge Configuration
    'GENERATE_4_BRIDGES_PER_ZONE': True,  # If True, creates N/S/E/W bridges for each zone
    'BRIDGE_LAND_BUFFER': 0.01,  # Buffer distance for bridge land check (degrees ~1km)
    'MIN_LAND_RATIO_FOR_BRIDGE': 0.15,  # Minimum land area ratio in zone to create bridge
}


def load_land_boundary(file_path: str):
    """Load the land boundary from shapefile or GeoJSON for free Cyprus"""
    print(f"Loading land boundary from: {file_path}")
    
    # Check if file exists
    path = Path(file_path)
    if not path.exists():
        print(f"  Error: File not found: {file_path}")
        print(f"  Attempting to download free Cyprus boundary...")
        return download_free_cyprus_boundary()
    
    try:
        gdf = gpd.read_file(file_path)
        
        # Ensure CRS is WGS84 (EPSG:4326)
        if gdf.crs != "EPSG:4326":
            print(f"  Reprojecting from {gdf.crs} to EPSG:4326")
            gdf = gdf.to_crs("EPSG:4326")
        
        # Combine all geometries into a single polygon/multipolygon
        land_boundary = gdf.unary_union
        print(f"  Land boundary loaded: {land_boundary.geom_type}")
        return land_boundary
    except Exception as e:
        print(f"  Error loading file: {e}")
        print(f"  Attempting to download free Cyprus boundary...")
        return download_free_cyprus_boundary()


def download_free_cyprus_boundary():
    """Download Republic of Cyprus boundary (excluding Northern Cyprus)"""
    import requests
    from shapely.geometry import shape
    
    print("  Downloading Republic of Cyprus boundary from Overpass API...")
    
    # Query for Republic of Cyprus (admin_level=2, excluding Northern Cyprus)
    overpass_url = "http://overpass-api.de/api/interpreter"
    query = """
    [out:json][timeout:60];
    (
      relation["ISO3166-1"="CY"]["admin_level"="2"]["name:en"="Republic of Cyprus"];
    );
    out geom;
    """
    
    try:
        response = requests.post(overpass_url, data={"data": query}, timeout=120)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("elements"):
            print("  Warning: No data from Overpass, using simple bounding box")
            return create_simple_cyprus_boundary()
        
        # Extract geometry from first relation
        for element in data["elements"]:
            if element["type"] == "relation" and "members" in element:
                # Build polygon from outer ways
                coords = []
                for member in element["members"]:
                    if member.get("role") == "outer" and "geometry" in member:
                        for node in member["geometry"]:
                            coords.append((node["lon"], node["lat"]))
                
                if coords:
                    from shapely.geometry import Polygon
                    land_boundary = Polygon(coords)
                    print(f"  Downloaded boundary: {land_boundary.geom_type}")
                    return land_boundary
        
        print("  Warning: Could not parse Overpass data, using simple bounding box")
        return create_simple_cyprus_boundary()
        
    except Exception as e:
        print(f"  Error downloading boundary: {e}")
        print("  Using simple bounding box instead")
        return create_simple_cyprus_boundary()


def create_simple_cyprus_boundary():
    """Create a simple rectangular boundary for Cyprus (approximation)"""
    from shapely.geometry import box
    print("  Using simplified rectangular boundary for Republic of Cyprus")
    # Approximate bounds for southern (free) Cyprus
    return box(32.27, 34.55, 34.65, 35.17)


def generate_grid_zones(
    min_lat: float,
    max_lat: float,
    min_lng: float,
    max_lng: float,
    lat_step: float,
    lng_step: float,
    land_boundary
) -> pd.DataFrame:
    """Generate rectangular grid zones that intersect with land"""
    print(f"\nGenerating zones:")
    print(f"  Bounds: ({min_lat}, {min_lng}) to ({max_lat}, {max_lng})")
    print(f"  Step: {lat_step}° lat × {lng_step}° lng")
    
    zones = []
    zone_id = 1
    
    lat = min_lat
    while lat < max_lat:
        lng = min_lng
        while lng < max_lng:
            # Create zone polygon
            zone_poly = box(lng, lat, lng + lng_step, lat + lat_step)
            
            # Check if zone intersects with land
            if zone_poly.intersects(land_boundary):
                zones.append({
                    'ZoneId': zone_id,
                    'MinLat': round(lat, 6),
                    'MinLng': round(lng, 6),
                    'MaxLat': round(lat + lat_step, 6),
                    'MaxLng': round(lng + lng_step, 6),
                    'Name': f'Zone {zone_id}',
                })
                zone_id += 1
            
            lng += lng_step
        lat += lat_step
    
    df = pd.DataFrame(zones)
    print(f"  Generated {len(df)} zones with land coverage")
    return df


def generate_station_points(
    zones_df: pd.DataFrame,
    land_boundary,
    stations_per_zone: int,
    seed: int = 42
) -> pd.DataFrame:
    """Generate random station points within land areas of each zone"""
    print(f"\nGenerating station points ({stations_per_zone} per zone)...")
    
    random.seed(seed)
    np.random.seed(seed)
    
    station_points = []
    point_id = 1
    
    for _, zone in zones_df.iterrows():
        zone_id = zone['ZoneId']
        min_lat, max_lat = zone['MinLat'], zone['MaxLat']
        min_lng, max_lng = zone['MinLng'], zone['MaxLng']
        
        # Create zone polygon
        zone_poly = box(min_lng, min_lat, max_lng, max_lat)
        
        # Get the intersection with land
        land_in_zone = zone_poly.intersection(land_boundary)
        
        # Skip if no land in zone (shouldn't happen after filtering)
        if land_in_zone.is_empty:
            continue
        
        # Generate random points within the land area
        attempts = 0
        stations_created = 0
        max_attempts = stations_per_zone * 200  # Increased max attempts
        
        while stations_created < stations_per_zone and attempts < max_attempts:
            # Random point within zone bounds
            lat = random.uniform(min_lat, max_lat)
            lng = random.uniform(min_lng, max_lng)
            point = Point(lng, lat)
            
            # Strict check: point must be on land (no buffer)
            if land_boundary.contains(point):
                station_points.append({
                    'PointId': point_id,
                    'ZoneId': zone_id,
                    'Latitude': round(lat, 6),
                    'Longitude': round(lng, 6),
                    'Location': f'0xE6100000010C{point_id:016X}',  # Placeholder for WKB
                    'PointType': 'S',
                    'Name': f'Station {stations_created + 1}',
                    'IsPickupAllowed': 1,
                    'IsDropoffAllowed': 1,
                })
                point_id += 1
                stations_created += 1
            
            attempts += 1
        
        if stations_created < stations_per_zone:
            print(f"  Warning: Zone {zone_id} only got {stations_created}/{stations_per_zone} stations")
    
    df = pd.DataFrame(station_points)
    print(f"  Generated {len(df)} station points")
    return df, point_id


def find_adjacent_zones(zones_df: pd.DataFrame) -> List[Tuple[int, int, str]]:
    """Find pairs of adjacent zones (sharing a boundary)"""
    print("\nFinding adjacent zones for bridges...")
    
    adjacencies = []
    zones_list = zones_df.to_dict('records')
    
    for i, zone1 in enumerate(zones_list):
        z1_id = zone1['ZoneId']
        z1_min_lat, z1_max_lat = zone1['MinLat'], zone1['MaxLat']
        z1_min_lng, z1_max_lng = zone1['MinLng'], zone1['MaxLng']
        
        for zone2 in zones_list[i+1:]:
            z2_id = zone2['ZoneId']
            z2_min_lat, z2_max_lat = zone2['MinLat'], zone2['MaxLat']
            z2_min_lng, z2_max_lng = zone2['MinLng'], zone2['MaxLng']
            
            # Check if zones share a boundary
            direction = None
            
            # North-South adjacency (share horizontal edge)
            if (abs(z1_max_lat - z2_min_lat) < 0.0001 and 
                not (z1_max_lng <= z2_min_lng or z1_min_lng >= z2_max_lng)):
                direction = "North"
            elif (abs(z1_min_lat - z2_max_lat) < 0.0001 and 
                  not (z1_max_lng <= z2_min_lng or z1_min_lng >= z2_max_lng)):
                direction = "South"
            
            # East-West adjacency (share vertical edge)
            elif (abs(z1_max_lng - z2_min_lng) < 0.0001 and 
                  not (z1_max_lat <= z2_min_lat or z1_min_lat >= z2_max_lat)):
                direction = "East"
            elif (abs(z1_min_lng - z2_max_lng) < 0.0001 and 
                  not (z1_max_lat <= z2_min_lat or z1_min_lat >= z2_max_lat)):
                direction = "West"
            
            if direction:
                adjacencies.append((z1_id, z2_id, direction))
    
    print(f"  Found {len(adjacencies)} adjacent zone pairs")
    return adjacencies


def generate_bridge_points(
    zones_df: pd.DataFrame,
    adjacencies: List[Tuple[int, int, str]],
    land_boundary,
    starting_point_id: int,
    config: dict
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Generate bridge points randomly within zones on land - at least 1 per zone"""
    print("\nGenerating bridge points (random placement, at least 1 per zone)...")
    
    random.seed(config['RANDOM_SEED'])
    np.random.seed(config['RANDOM_SEED'])
    
    bridge_points = []
    bridges = []
    point_id = starting_point_id
    bridge_id = 1
    
    # Build adjacency lookup for finding neighbors
    adjacency_map = {}
    for z1_id, z2_id, direction in adjacencies:
        if z1_id not in adjacency_map:
            adjacency_map[z1_id] = {}
        adjacency_map[z1_id][direction] = z2_id
    
    # For each zone, generate at least 1 bridge point
    for _, zone in zones_df.iterrows():
        zone_id = zone['ZoneId']
        min_lat, max_lat = zone['MinLat'], zone['MaxLat']
        min_lng, max_lng = zone['MinLng'], zone['MaxLng']
        
        # Calculate zone's land coverage
        zone_poly = box(min_lng, min_lat, max_lng, max_lat)
        land_in_zone = zone_poly.intersection(land_boundary)
        
        if land_in_zone.is_empty:
            continue
        
        # Get all directions where this zone has neighbors
        neighbors = adjacency_map.get(zone_id, {})
        bridges_created_for_zone = 0
        edges_with_bridges = set()  # Track which edges already have bridges
        
        # Try to create bridge points for each adjacent direction (max 1 per edge)
        for direction, neighbor_id in neighbors.items():
            # Skip if this edge already has a bridge
            if direction in edges_with_bridges:
                continue
                
            max_attempts = 150
            
            for attempt in range(max_attempts):
                # Generate random point on the border edge with neighbor (exactly on the line)
                if direction == "North":
                    lat = max_lat  # Exactly on the north edge
                    lng = random.uniform(min_lng + 0.01, max_lng - 0.01)
                elif direction == "South":
                    lat = min_lat  # Exactly on the south edge
                    lng = random.uniform(min_lng + 0.01, max_lng - 0.01)
                elif direction == "East":
                    lng = max_lng  # Exactly on the east edge
                    lat = random.uniform(min_lat + 0.01, max_lat - 0.01)
                else:  # West
                    lng = min_lng  # Exactly on the west edge
                    lat = random.uniform(min_lat + 0.01, max_lat - 0.01)
                
                bridge_point = Point(lng, lat)
                
                # Strict check: bridge point MUST be on land (no buffer tolerance)
                if land_boundary.contains(bridge_point):
                    # Create bridge point entry
                    bridge_points.append({
                        'PointId': point_id,
                        'ZoneId': zone_id,
                        'Latitude': round(lat, 6),
                        'Longitude': round(lng, 6),
                        'Location': f'0xE6100000010C{point_id:016X}',
                        'PointType': 'B',
                        'Name': f'Bridge {direction}',
                        'IsPickupAllowed': 0,
                        'IsDropoffAllowed': 0,
                    })
                    
                    # Create bridge connection to adjacent zone
                    bridges.append({
                        'BridgeId': bridge_id,
                        'PointId': point_id,
                        'FromZoneId': zone_id,
                        'ToZoneId': neighbor_id,
                        'Name': f'Bridge {zone_id}-{neighbor_id}',
                    })
                    
                    point_id += 1
                    bridge_id += 1
                    bridges_created_for_zone += 1
                    edges_with_bridges.add(direction)  # Mark this edge as used
                    break
        
        # If no bridge was created via adjacencies, try to place on ANY zone border
        if bridges_created_for_zone == 0:
            # Try all 4 edges to find one on land
            edges_to_try = [
                ('North', lambda: (max_lat, random.uniform(min_lng + 0.01, max_lng - 0.01))),
                ('South', lambda: (min_lat, random.uniform(min_lng + 0.01, max_lng - 0.01))),
                ('East', lambda: (random.uniform(min_lat + 0.01, max_lat - 0.01), max_lng)),
                ('West', lambda: (random.uniform(min_lat + 0.01, max_lat - 0.01), min_lng)),
            ]
            random.shuffle(edges_to_try)
            
            for edge_name, coord_generator in edges_to_try:
                max_attempts = 150
                for attempt in range(max_attempts):
                    lat, lng = coord_generator()
                    bridge_point = Point(lng, lat)
                    
                    # MUST be on land - strict check
                    if land_boundary.contains(bridge_point):
                        bridge_points.append({
                            'PointId': point_id,
                            'ZoneId': zone_id,
                            'Latitude': round(lat, 6),
                            'Longitude': round(lng, 6),
                            'Location': f'0xE6100000010C{point_id:016X}',
                            'PointType': 'B',
                            'Name': f'Bridge {edge_name}',
                            'IsPickupAllowed': 0,
                            'IsDropoffAllowed': 0,
                        })
                        point_id += 1
                        bridges_created_for_zone += 1
                        break
                
                if bridges_created_for_zone > 0:
                    break
            
            if bridges_created_for_zone == 0:
                print(f"  Warning: Could not place bridge in Zone {zone_id} (no border on land)")
    
    points_df = pd.DataFrame(bridge_points)
    bridges_df = pd.DataFrame(bridges)
    
    print(f"  Generated {len(points_df)} bridge points")
    print(f"  Generated {len(bridges_df)} bridge connections")
    
    return points_df, bridges_df


def main():
    print("=" * 70)
    print("Cyprus Geofence Zone Generator")
    print("=" * 70)
    print("\nCurrent Configuration:")
    print(f"  Land File: {CONFIG['LAND_BOUNDARY_FILE']}")
    print(f"  Output Dir: {CONFIG['OUTPUT_DIR']}")
    print(f"  Grid: {CONFIG['LAT_STEP']}° × {CONFIG['LNG_STEP']}° (~{CONFIG['LAT_STEP']*111:.1f}km cells)")
    print(f"  Bounds: ({CONFIG['MIN_LAT']}, {CONFIG['MIN_LNG']}) to ({CONFIG['MAX_LAT']}, {CONFIG['MAX_LNG']})")
    print(f"  Stations per zone: {CONFIG['STATIONS_PER_ZONE']}")
    print(f"  Bridge land buffer: {CONFIG['BRIDGE_LAND_BUFFER']}° (~{CONFIG['BRIDGE_LAND_BUFFER']*111:.1f}km)")
    print(f"  Min land ratio for bridge: {CONFIG['MIN_LAND_RATIO_FOR_BRIDGE']*100:.0f}%")
    print("\nTo adjust parameters, edit the CONFIG dictionary at the top of this file.")
    print("=" * 70)
    
    # Create output directory
    output_dir = Path(CONFIG['OUTPUT_DIR'])
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Load land boundary
    land_boundary = load_land_boundary(CONFIG['LAND_BOUNDARY_FILE'])
    
    # Generate zones
    zones_df = generate_grid_zones(
        CONFIG['MIN_LAT'], CONFIG['MAX_LAT'],
        CONFIG['MIN_LNG'], CONFIG['MAX_LNG'],
        CONFIG['LAT_STEP'], CONFIG['LNG_STEP'],
        land_boundary
    )
    
    # Generate station points
    station_points_df, next_point_id = generate_station_points(
        zones_df, land_boundary, CONFIG['STATIONS_PER_ZONE'], CONFIG['RANDOM_SEED']
    )
    
    # Find adjacent zones
    adjacencies = find_adjacent_zones(zones_df)
    
    # Generate bridge points
    bridge_points_df, bridges_df = generate_bridge_points(
        zones_df, adjacencies, land_boundary, next_point_id, CONFIG
    )
    
    # Combine all points
    all_points_df = pd.concat([station_points_df, bridge_points_df], ignore_index=True)
    all_points_df = all_points_df.sort_values('PointId').reset_index(drop=True)
    
    # Save to CSV files
    print("\nSaving CSV files...")
    zones_file = output_dir / 'zones'
    points_file = output_dir / 'zone_points'
    bridges_file = output_dir / 'bridges'
    
    zones_df.to_csv(zones_file, index=False)
    print(f"  ✓ {zones_file} ({len(zones_df)} rows)")
    
    all_points_df.to_csv(points_file, index=False)
    print(f"  ✓ {points_file} ({len(all_points_df)} rows)")
    
    bridges_df.to_csv(bridges_file, index=False)
    print(f"  ✓ {bridges_file} ({len(bridges_df)} rows)")
    
    print("\n" + "=" * 70)
    print("✅ Generation complete!")
    print("=" * 70)
    print(f"\nSummary:")
    print(f"  Zones:          {len(zones_df)}")
    print(f"  Station points: {len(station_points_df)}")
    print(f"  Bridge points:  {len(bridge_points_df)}")
    print(f"  Total points:   {len(all_points_df)}")
    print(f"  Bridges:        {len(bridges_df)}")


if __name__ == '__main__':
    main()
