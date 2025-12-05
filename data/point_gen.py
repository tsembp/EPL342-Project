import csv
import random
import math
from shapely.geometry import Point, Polygon
from shapely.prepared import prep

# Configuration
RANDOM_SEED = 42
TARGET_ZONES = 29  # Adjusted for fewer eastern zones
STATIONS_PER_ZONE = (6, 8)  # Random between 6-8 stations (increased from 5-6)

# Define the valid land area using the coordinates you provided
# Extended to include eastern areas (Oroklini, Ayia Napa) - upper portions only
LAND_AREA_COORDS = [
    (32.6453774275646, 34.9629997107002),
    (32.6774364516923, 34.9833497143627),
    (32.8125015270163, 34.9188877371282),
    (32.69116205773, 34.8718975366485),
    (32.6114412353729, 35.1256460288175),
    (32.5088575835255, 34.7974989507092),
    (33.2992489660072, 34.7617665807178),
    (32.5853270850566, 34.6855772692548),
    (32.7965958689225, 35.0887602795267),
    (33.0977522622122, 35.1087892424654),
    (32.8299223157808, 35.0672164179712),
    (32.9052764984223, 34.8948282195422),
    (32.913049289415, 34.871207091712),
    (32.9481228596164, 34.6995278870196),
    (33.3062538540977, 34.9499544080854),
    (33.3932151108084, 35.1838572256226),
    (33.182412355158, 35.0349981436248),
    (33.1588654307502, 35.0540923440837),
    (33.3785581053164, 34.755068852301),
    (32.7360479145729, 34.9940561077779),
    (33.3826778454001, 35.1486735298513),
    (32.9346937728148, 34.7668078135002),
    (33.386540733291, 34.816329423958),
    (33.0393042883232, 34.692093030181),
    (33.5866973583401, 34.890445704516),
    (33.3784351917225, 35.083223072597),
    (32.5631449810508, 35.156861481384),
    (33.4256441933035, 35.0252038090097),
    (32.6755187251059, 34.6788398268129),
    (33.2653943031966, 35.0766759140582),
    (32.4040973110793, 34.9500802029977),
    (33.4512356711321, 35.0733871728221),
    (33.3457914625646, 34.7381252391104),
    (33.0596712261919, 34.9792326787868),
    (33.3711843816543, 34.7661914186207),
    (32.9896203542094, 34.7720193002948),
    (33.0964963104216, 34.9206755489564),
    (33.022175774362, 35.0391152755271),
    (32.9705344431254, 34.9440424751623),
    (33.1949326527408, 35.0523952214267),
    (33.4799858833462, 34.8636985094255),
    (33.574165482336, 34.9961555996527),
    (33.2619906286392, 34.7754946837734),
    (32.4934167591197, 35.0773878861588),
    (33.365959074093, 34.7385107441548),
    (32.6174911480992, 35.0278403076671),
    (32.5943049491232, 35.1612546026005),
    (33.3267367374849, 34.7557253760115),
    (33.071559387083, 35.1308744408447),
    (33.1885826111364, 35.012228417115),
    (33.1338299878992, 34.7584473119642),
    (32.7761604510537, 34.9004486395493),
    (33.3091569471599, 35.1390951659371),
    (32.629889940043, 35.0750925273137),
    (33.1740573958513, 34.7134680153138),
    (32.5430343243728, 34.779685826823),
    (32.7363526315305, 35.0638560302765),
    (32.9103344669331, 34.9836800727562),
    (32.4220975162616, 34.8518598253158),
    (33.0745377940321, 34.9660965354607),
    (32.6829734089515, 34.7534378545993),
    (33.3861287152793, 34.8031191155218),
    (33.2882442890136, 34.9401652914994),
    (33.39003211714, 35.082706193306),
    (32.8919031758181, 34.8601700934714),
    (32.6078720680843, 34.9215481742196),
    (33.5560599207548, 34.880916203813),
    (32.6765151336648, 34.6792253396901),
    (33.2618080927499, 35.0724973910697),
    (33.6383182989508, 34.9438779342977),
    (33.6333430612316, 35.0099850914846),
    (33.3026298338414, 34.9824365160574),
    (33.1520533696103, 34.9566354426846),
    (33.2130889502575, 34.8534847240092),
    (33.0527367153983, 34.863293076479),
    (33.3414585615014, 35.0645838339173),
    (32.3632212831946, 34.8934927905086),
    (32.9474899416849, 34.9751947628616),
    (33.233457229313, 35.0663948128832),
    (33.0187183084708, 34.904478747638),
    (33.1855294362049, 35.0229897451051),
    (33.1844879044205, 34.9493598615171),
    (32.9977815176682, 34.7630863854075),
    (32.9918807608637, 34.7914406007153),
    (33.3961188416565, 35.0108570871297),
    (32.4214692903071, 34.764783243835),
    (32.3978786311529, 34.9295634000437),
    (33.3996418831075, 35.1694482344787),
    (33.0846739059701, 34.8047370163222),
    (32.5718087795854, 34.7128247559517),
    (33.3401440022542, 34.9279256056528),
    (32.3449731190883, 35.0349771594487),
    (33.2799118420156, 34.8316857552751),
    (33.2290947071969, 34.8842895591885),
    (33.4243322376355, 34.8403593562406),
    (33.3887578460414, 35.1488389909348),
    (33.6197890012235, 34.9356510514032),
    (32.9229777569737, 34.8779269042025),
    (32.8680635790864, 34.9111779575694),
    (33.5617289110829, 34.8209890340457),
    # Extended eastern points - moved up to cover upper areas only (Oroklini, Paralimni)
    (33.9500000000000, 35.0200000000000),
    (33.9800000000000, 35.0500000000000),
    (34.0000000000000, 35.0300000000000),
    (34.0000000000000, 34.9800000000000),
    (33.9800000000000, 34.9400000000000),
    (33.9500000000000, 34.9200000000000),
]

# Create Shapely polygon for the land area
# Note: Shapely uses (lng, lat) format
land_polygon = Polygon(LAND_AREA_COORDS)
prepared_land = prep(land_polygon)

# Calculate bounding box from the polygon
MIN_LNG = min(coord[0] for coord in LAND_AREA_COORDS)
MAX_LNG = max(coord[0] for coord in LAND_AREA_COORDS)
MIN_LAT = min(coord[1] for coord in LAND_AREA_COORDS)
MAX_LAT = max(coord[1] for coord in LAND_AREA_COORDS)

# Set random seed for reproducibility
random.seed(RANDOM_SEED)

def is_point_on_land(lat, lng):
    """Check if a point is within the land polygon"""
    point = Point(lng, lat)  # Shapely uses (lng, lat)
    return prepared_land.contains(point)

def calculate_grid_dimensions(target_zones, lat_range, lng_range):
    """Calculate optimal grid dimensions based on area aspect ratio"""
    aspect_ratio = lng_range / lat_range
    rows = int(math.sqrt(target_zones / aspect_ratio))
    cols = int(math.ceil(target_zones / rows))
    
    # Adjust to get closer to target
    while rows * cols < target_zones:
        if cols / rows < aspect_ratio:
            cols += 1
        else:
            rows += 1
    
    return rows, cols

def zone_has_land(min_lat, max_lat, min_lng, max_lng, sample_points=20):
    """Check if a zone contains any land by sampling points"""
    for i in range(sample_points):
        for j in range(sample_points):
            lat = min_lat + (max_lat - min_lat) * i / sample_points
            lng = min_lng + (max_lng - min_lng) * j / sample_points
            if is_point_on_land(lat, lng):
                return True
    return False

def generate_geofence_zones():
    """
    Generate geofence zones:
      - main grid: 3 rows × 8 columns spanning the whole island
      - extra band: 3 additional columns to the east,
        centered around the latitude between the top and middle row.
    Zones with no land (according to LAND_AREA_COORDS) are skipped.
    """
    # --- grid layout definition ---
    BASE_ROWS = 3          # top / middle / bottom
    BASE_COLS = 8          # main island columns
    EXTRA_COLS = 3         # extra eastern columns (band only)

    rows = BASE_ROWS
    cols = BASE_COLS + EXTRA_COLS  # used for adjacency logic later

    lat_range = MAX_LAT - MIN_LAT
    lng_range = MAX_LNG - MIN_LNG

    # vertical step is uniform
    lat_step = lat_range / BASE_ROWS

    # horizontally: first 8 columns use ~8/11 of width, last 3 columns use ~3/11
    base_lng_range = lng_range * (BASE_COLS / (BASE_COLS + EXTRA_COLS))
    base_max_lng = MIN_LNG + base_lng_range

    base_lng_step = base_lng_range / BASE_COLS
    extra_lng_step = (MAX_LNG - base_max_lng) / EXTRA_COLS

    zones = []
    zone_id = 1
    skipped = 0

    print(f"Main grid: {BASE_ROWS} rows × {BASE_COLS} cols")
    print(f"Extra band: 1 row × {EXTRA_COLS} cols (east side)\n")

    # -------------------------
    # 1) MAIN 3×8 GRID
    # -------------------------
    for row in range(BASE_ROWS):
        for col in range(BASE_COLS):
            min_lat = MIN_LAT + row * lat_step
            max_lat = min_lat + lat_step

            min_lng = MIN_LNG + col * base_lng_step
            max_lng = min_lng + base_lng_step

            if zone_has_land(min_lat, max_lat, min_lng, max_lng):
                zones.append({
                    'ZoneId': zone_id,
                    'MinLat': round(min_lat, 6),
                    'MinLng': round(min_lng, 6),
                    'MaxLat': round(max_lat, 6),
                    'MaxLng': round(max_lng, 6),
                    'Name': f'Zone {zone_id}',
                    'grid_row': row,      # 0 = bottom, 1 = middle, 2 = top
                    'grid_col': col       # 0..7
                })
                zone_id += 1
            else:
                skipped += 1
                print(f"  Skipping main zone at row={row}, col={col} (no land)")

    # -------------------------
    # 2) EXTRA 3 COLUMNS (BAND)
    #    centered between top & middle rows
    # -------------------------

    # latitude of boundary between top & middle rows
    boundary_lat = MIN_LAT + 2 * lat_step

    # make the band one row tall, centered on that boundary
    band_height = lat_step
    extra_min_lat = max(MIN_LAT, boundary_lat - band_height / 2)
    extra_max_lat = min(MAX_LAT, boundary_lat + band_height / 2)

    # we’ll treat this band as "grid_row = 1" (middle row) for adjacency
    extra_row_index = 1

    for extra_col_idx in range(EXTRA_COLS):
        col = BASE_COLS + extra_col_idx  # 8, 9, 10

        min_lng = base_max_lng + extra_col_idx * extra_lng_step
        max_lng = min_lng + extra_lng_step

        min_lat = extra_min_lat
        max_lat = extra_max_lat

        if zone_has_land(min_lat, max_lat, min_lng, max_lng):
            zones.append({
                'ZoneId': zone_id,
                'MinLat': round(min_lat, 6),
                'MinLng': round(min_lng, 6),
                'MaxLat': round(max_lat, 6),
                'MaxLng': round(max_lng, 6),
                'Name': f'Zone {zone_id}',
                'grid_row': extra_row_index,   # sits around top/middle boundary
                'grid_col': col
            })
            zone_id += 1
        else:
            skipped += 1
            print(f"  Skipping extra band zone at col={col} (no land)")

    print(f"\nFinal zones: {len(zones)} zones created, {skipped} zones skipped")
    return zones, rows, cols



def generate_stations_in_zone(zone, num_stations):
    """Generate evenly distributed stations within a zone using grid-based approach"""
    stations = []
    min_lat, max_lat = zone['MinLat'], zone['MaxLat']
    min_lng, max_lng = zone['MinLng'], zone['MaxLng']
    
    # Create a grid that covers the zone
    grid_size = math.ceil(math.sqrt(num_stations * 2))  # Oversample grid
    lat_step = (max_lat - min_lat) / grid_size
    lng_step = (max_lng - min_lng) / grid_size
    
    # Generate candidate points from grid cells
    candidates = []
    for i in range(grid_size):
        for j in range(grid_size):
            # Calculate grid cell center
            cell_center_lat = min_lat + (i + 0.5) * lat_step
            cell_center_lng = min_lng + (j + 0.5) * lng_step
            
            # Add small random offset (±20% of cell size) for natural distribution
            offset_lat = random.uniform(-0.2, 0.2) * lat_step
            offset_lng = random.uniform(-0.2, 0.2) * lng_step
            
            lat = cell_center_lat + offset_lat
            lng = cell_center_lng + offset_lng
            
            # Keep within zone bounds
            lat = max(min_lat, min(max_lat, lat))
            lng = max(min_lng, min(max_lng, lng))
            
            # Check if point is on land
            if is_point_on_land(lat, lng):
                # Calculate distance to zone center (for sorting)
                center_lat = (min_lat + max_lat) / 2
                center_lng = (min_lng + max_lng) / 2
                dist_to_center = math.sqrt((lat - center_lat)**2 + (lng - center_lng)**2)
                
                candidates.append({
                    'lat': lat,
                    'lng': lng,
                    'dist_to_center': dist_to_center
                })
    
    if len(candidates) == 0:
        return []
    
    # Sort candidates by distance to center (helps with even distribution)
    candidates.sort(key=lambda x: x['dist_to_center'])
    
    # Select stations using greedy algorithm for maximum spacing
    min_distance = min((max_lat - min_lat), (max_lng - min_lng)) * 0.15
    
    for candidate in candidates:
        if len(stations) >= num_stations:
            break
        
        lat = candidate['lat']
        lng = candidate['lng']
        
        # Check minimum distance from existing stations
        too_close = False
        for existing in stations:
            dist_sq = (lat - existing['Latitude'])**2 + (lng - existing['Longitude'])**2
            if dist_sq < min_distance**2:
                too_close = True
                break
        
        if not too_close:
            stations.append({
                'Latitude': round(lat, 6),
                'Longitude': round(lng, 6),
                'PointType': 'S',
                'Name': f'Station {len(stations) + 1}',
                'IsPickupAllowed': 1,
                'IsDropoffAllowed': 1
            })
    
    # If we don't have enough stations, relax the distance constraint
    if len(stations) < num_stations:
        min_distance = min_distance * 0.6  # Reduce spacing requirement
        
        for candidate in candidates:
            if len(stations) >= num_stations:
                break
            
            lat = candidate['lat']
            lng = candidate['lng']
            
            # Skip if already added
            if any(abs(s['Latitude'] - lat) < 0.0001 and abs(s['Longitude'] - lng) < 0.0001 for s in stations):
                continue
            
            # Check minimum distance from existing stations
            too_close = False
            for existing in stations:
                dist_sq = (lat - existing['Latitude'])**2 + (lng - existing['Longitude'])**2
                if dist_sq < min_distance**2:
                    too_close = True
                    break
            
            if not too_close:
                stations.append({
                    'Latitude': round(lat, 6),
                    'Longitude': round(lng, 6),
                    'PointType': 'S',
                    'Name': f'Station {len(stations) + 1}',
                    'IsPickupAllowed': 1,
                    'IsDropoffAllowed': 1
                })
    
    return stations

def get_adjacent_zones(zone, all_zones, rows, cols):
    """Get adjacent zones (north, south, east, west)"""
    row, col = zone['grid_row'], zone['grid_col']
    adjacent = []
    
    # North (row + 1)
    if row < rows - 1:
        adj = next((z for z in all_zones if z['grid_row'] == row + 1 and z['grid_col'] == col), None)
        if adj:
            adjacent.append(('north', adj))
    
    # South (row - 1)
    if row > 0:
        adj = next((z for z in all_zones if z['grid_row'] == row - 1 and z['grid_col'] == col), None)
        if adj:
            adjacent.append(('south', adj))
    
    # East (col + 1)
    if col < cols - 1:
        adj = next((z for z in all_zones if z['grid_row'] == row and z['grid_col'] == col + 1), None)
        if adj:
            adjacent.append(('east', adj))
    
    # West (col - 1)
    if col > 0:
        adj = next((z for z in all_zones if z['grid_row'] == row and z['grid_col'] == col - 1), None)
        if adj:
            adjacent.append(('west', adj))
    
    return adjacent

def create_bridge_point(zone1, zone2, direction):
    """Create a bridge point on the shared edge between two zones, ensuring it's on land"""
    # Calculate the midpoint of the shared edge
    if direction in ['north', 'south']:
        # Shared longitude edge
        if direction == 'north':
            lat = zone1['MaxLat']
        else:
            lat = zone1['MinLat']
        lng = (zone1['MinLng'] + zone1['MaxLng']) / 2
    else:  # east or west
        # Shared latitude edge
        if direction == 'east':
            lng = zone1['MaxLng']
        else:
            lng = zone1['MinLng']
        lat = (zone1['MinLat'] + zone1['MaxLat']) / 2
    
    # If midpoint is not on land, try to find a valid point along the edge
    if not is_point_on_land(lat, lng):
        # Try multiple points along the edge
        for offset in [0.25, -0.25, 0.4, -0.4, 0.1, -0.1, 0.3, -0.3, 0.45, -0.45]:
            if direction in ['north', 'south']:
                test_lng = zone1['MinLng'] + (zone1['MaxLng'] - zone1['MinLng']) * (0.5 + offset)
                test_lng = max(zone1['MinLng'], min(zone1['MaxLng'], test_lng))
                if is_point_on_land(lat, test_lng):
                    lng = test_lng
                    break
            else:
                test_lat = zone1['MinLat'] + (zone1['MaxLat'] - zone1['MinLat']) * (0.5 + offset)
                test_lat = max(zone1['MinLat'], min(zone1['MaxLat'], test_lat))
                if is_point_on_land(test_lat, lng):
                    lat = test_lat
                    break
    
    return {
        'Latitude': round(lat, 6),
        'Longitude': round(lng, 6),
        'PointType': 'B',
        'Name': None,  # Will be set later
        'IsPickupAllowed': 0,
        'IsDropoffAllowed': 0
    }

def generate_all_data():
    """Generate all CSV data"""
    # Generate zones
    zones, rows, cols = generate_geofence_zones()
    
    # Generate zone points and bridges
    all_points = []
    bridges = []
    bridge_lookup = {}  # Key: (zone1_id, zone2_id), Value: bridge_id
    point_id = 1
    bridge_id = 1
    
    for zone in zones:
        zone_id = zone['ZoneId']
        
        # Generate stations for this zone
        num_stations = random.randint(*STATIONS_PER_ZONE)
        stations = generate_stations_in_zone(zone, num_stations)
        
        for station in stations:
            all_points.append({
                'PointId': point_id,
                'ZoneId': zone_id,
                **station
            })
            point_id += 1
        
        # Generate bridge points for adjacent zones
        adjacent = get_adjacent_zones(zone, zones, rows, cols)
        
        for direction, adj_zone in adjacent:
            adj_zone_id = adj_zone['ZoneId']
            
            # Check if we already created this bridge
            bridge_key = tuple(sorted([zone_id, adj_zone_id]))
            
            if bridge_key not in bridge_lookup:
                # Create bridge point in current zone
                bridge_point = create_bridge_point(zone, adj_zone, direction)
                bridge_point['Name'] = f'Bridge {bridge_id}'
                
                # Only create bridge if point is on land
                if is_point_on_land(bridge_point['Latitude'], bridge_point['Longitude']):
                    all_points.append({
                        'PointId': point_id,
                        'ZoneId': zone_id,
                        **bridge_point
                    })
                    
                    bridge_point_id = point_id
                    point_id += 1
                    
                    # Create bridge entry
                    bridges.append({
                        'BridgeId': bridge_id,
                        'PointId': bridge_point_id,
                        'FromZoneId': zone_id,
                        'ToZoneId': adj_zone_id,
                        'Name': f'Bridge {bridge_id}'
                    })
                    
                    bridge_lookup[bridge_key] = bridge_id
                    bridge_id += 1
    
    return zones, all_points, bridges

def write_geofence_zones(zones, filename='GeofenceZone.csv'):
    """Write GeofenceZone CSV"""
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['ZoneId', 'MinLat', 'MinLng', 'MaxLat', 'MaxLng', 'Name'])
        
        for zone in zones:
            writer.writerow([
                zone['ZoneId'],
                f"{zone['MinLat']:.6f}",
                f"{zone['MinLng']:.6f}",
                f"{zone['MaxLat']:.6f}",
                f"{zone['MaxLng']:.6f}",
                zone['Name']
            ])
    
    print(f"✓ Generated {filename} with {len(zones)} zones")

def write_zone_points(points, filename='ZonePoint.csv'):
    """Write ZonePoint CSV"""
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['PointId', 'ZoneId', 'Latitude', 'Longitude', 'PointType', 'Name', 'IsPickupAllowed', 'IsDropoffAllowed'])
        
        for point in points:
            writer.writerow([
                point['PointId'],
                point['ZoneId'],
                f"{point['Latitude']:.6f}",
                f"{point['Longitude']:.6f}",
                point['PointType'],
                point['Name'],
                point['IsPickupAllowed'],
                point['IsDropoffAllowed']
            ])
    
    stations = sum(1 for p in points if p['PointType'] == 'S')
    bridge_points = sum(1 for p in points if p['PointType'] == 'B')
    print(f"✓ Generated {filename} with {len(points)} points ({stations} stations, {bridge_points} bridge points)")

def write_bridges(bridges, filename='Bridge.csv'):
    """Write Bridge CSV"""
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['BridgeId', 'PointId', 'FromZoneId', 'ToZoneId', 'Name'])
        
        for bridge in bridges:
            writer.writerow([
                bridge['BridgeId'],
                bridge['PointId'],
                bridge['FromZoneId'],
                bridge['ToZoneId'],
                bridge['Name']
            ])
    
    print(f"✓ Generated {filename} with {len(bridges)} bridges")

def main():
    """Main execution"""
    print("Generating Cyprus zone data...")
    print(f"Area: Lat {MIN_LAT:.4f} to {MAX_LAT:.4f}, Lng {MIN_LNG:.4f} to {MAX_LNG:.4f}")
    print(f"Target zones: ~{TARGET_ZONES}\n")
    
    zones, points, bridges = generate_all_data()
    
    write_geofence_zones(zones)
    write_zone_points(points)
    write_bridges(bridges)
    
    print("\n✓ All CSV files generated successfully!")

if __name__ == "__main__":
    main()