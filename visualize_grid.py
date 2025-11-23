from pathlib import Path

import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon, LineString, Point
import matplotlib.pyplot as plt
import contextily as cx

# -------------------------------------------------
# Config
# -------------------------------------------------
CSV_DIR = Path("seed_data")
ZONE_CSV = CSV_DIR / "Geofencezone.csv"
BRIDGE_CSV = CSV_DIR / "Bridge.csv"
POINTS_CSV = CSV_DIR / "ZonePoint_land_only.csv"  # Updated points file

FIGSIZE = (14, 12)
SHOW_LABELS = False  # set True if you want zone IDs at centers


def load_zones():
    df = pd.read_csv(ZONE_CSV)
    # Expecting columns: ZoneId, MinLat, MinLng, MaxLat, MaxLng, ...
    geometries = []
    for _, row in df.iterrows():
        min_lat = row["MinLat"]
        max_lat = row["MaxLat"]
        min_lng = row["MinLng"]
        max_lng = row["MaxLng"]

        # Polygon in lon/lat order (x=lng, y=lat)
        poly = Polygon([
            (min_lng, min_lat),
            (max_lng, min_lat),
            (max_lng, max_lat),
            (min_lng, max_lat),
        ])
        geometries.append(poly)

    gdf = gpd.GeoDataFrame(df, geometry=geometries, crs="EPSG:4326")
    return gdf


def load_bridges(zones_gdf):
    dfb = pd.read_csv(BRIDGE_CSV)
    # Expecting columns: BridgeId, Name, FromZoneId, ToZoneId
    zones_by_id = zones_gdf.set_index("ZoneId")

    lines = []
    bridge_ids = []

    for _, row in dfb.iterrows():
        z_from = row["FromZoneId"]
        z_to = row["ToZoneId"]

        if z_from not in zones_by_id.index or z_to not in zones_by_id.index:
            continue

        poly_from = zones_by_id.loc[z_from].geometry
        poly_to = zones_by_id.loc[z_to].geometry

        c_from = poly_from.centroid
        c_to = poly_to.centroid

        line = LineString([c_from, c_to])
        lines.append(line)
        bridge_ids.append(row["BridgeId"])

    bridges_gdf = gpd.GeoDataFrame({"BridgeId": bridge_ids}, geometry=lines, crs="EPSG:4326")
    return bridges_gdf


def load_points():
    """Load station and bridge points"""
    dfp = pd.read_csv(POINTS_CSV)
    # Columns: PointId, ZoneId, Latitude, Longitude, PointType, Name, IsPickupAllowed, IsDropoffAllowed
    
    points = []
    for _, row in dfp.iterrows():
        point = Point(row['Longitude'], row['Latitude'])
        points.append(point)
    
    points_gdf = gpd.GeoDataFrame(dfp, geometry=points, crs="EPSG:4326")
    return points_gdf


def plot_on_cyprus_map():
    if not ZONE_CSV.exists():
        print(f"Zone CSV not found: {ZONE_CSV}")
        return
    if not BRIDGE_CSV.exists():
        print(f"Bridge CSV not found: {BRIDGE_CSV}")
        return
    if not POINTS_CSV.exists():
        print(f"Points CSV not found: {POINTS_CSV}")
        return

    zones = load_zones()
    bridges = load_bridges(zones)
    points = load_points()

    stations = points[points['PointType'] == 'S']
    bridge_points = points[points['PointType'] == 'B']

    print(f"Loaded {len(zones)} zones, {len(bridges)} bridges, and {len(points)} points")
    print(f"  - Stations: {len(stations)}")
    print(f"  - Bridge points: {len(bridge_points)}")

    # Reproject to Web Mercator for contextily / web tiles
    zones_web = zones.to_crs(epsg=3857)
    bridges_web = bridges.to_crs(epsg=3857)
    stations_web = stations.to_crs(epsg=3857)
    bridge_points_web = bridge_points.to_crs(epsg=3857)

    fig, ax = plt.subplots(figsize=FIGSIZE)

    # Plot basemap extent bounds from zones
    minx, miny, maxx, maxy = zones_web.total_bounds
    ax.set_xlim(minx - 5000, maxx + 5000)
    ax.set_ylim(miny - 5000, maxy + 5000)

    # Draw basemap (OSM)
    cx.add_basemap(ax, source=cx.providers.OpenStreetMap.Mapnik)

    # Plot zones as outlines on top
    zones_web.boundary.plot(ax=ax, linewidth=0.8, color='darkblue', alpha=0.6)

    # Plot bridges as lines
    if len(bridges_web) > 0:
        bridges_web.plot(ax=ax, linewidth=0.5, color='red', alpha=0.5)

    # Plot stations (green circles)
    if len(stations_web) > 0:
        stations_web.plot(ax=ax, markersize=15, color='green', alpha=0.7, label='Stations (Pickup/Drop)')

    # Plot bridge points (red squares)
    if len(bridge_points_web) > 0:
        bridge_points_web.plot(ax=ax, markersize=10, color='red', marker='s', alpha=0.6, label='Bridge Points')

    # Optional labels at zone centers
    if SHOW_LABELS:
        centers = zones_web.geometry.centroid
        for zone_id, center in zip(zones_web["ZoneId"], centers):
            ax.text(
                center.x,
                center.y,
                str(zone_id),
                ha="center",
                va="center",
                fontsize=5,
                color="black",
                bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.7)
            )

    ax.set_axis_off()
    ax.set_title(f"Geofence Grid over Cyprus\n{len(zones)} Zones | {len(stations)} Stations | {len(bridge_points)} Bridge Points", 
                 fontsize=12, fontweight='bold')
    ax.legend(loc='upper right', fontsize=10)

    plt.tight_layout()
    out_file = "grid_pictures/cyprus_grid_with_points.png"
    Path("grid_pictures").mkdir(exist_ok=True)
    plt.savefig(out_file, dpi=300, bbox_inches='tight')
    print(f"✅ Saved visualization to {out_file}")


if __name__ == "__main__":
    plot_on_cyprus_map()
