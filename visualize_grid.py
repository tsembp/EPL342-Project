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

FIGSIZE = (10, 10)
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
    # Expecting columns: BridgeId, Name, FromZone, ToZone
    zones_by_id = zones_gdf.set_index("ZoneId")

    lines = []
    bridge_ids = []

    for _, row in dfb.iterrows():
        z_from = row["FromZone"]
        z_to = row["ToZone"]

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


def plot_on_cyprus_map():
    if not ZONE_CSV.exists():
        print(f"Zone CSV not found: {ZONE_CSV}")
        return
    if not BRIDGE_CSV.exists():
        print(f"Bridge CSV not found: {BRIDGE_CSV}")
        return

    zones = load_zones()
    bridges = load_bridges(zones)

    print(f"Loaded {len(zones)} zones and {len(bridges)} bridges.")

    # Reproject to Web Mercator for contextily / web tiles
    zones_web = zones.to_crs(epsg=3857)
    bridges_web = bridges.to_crs(epsg=3857)

    fig, ax = plt.subplots(figsize=FIGSIZE)

    # Plot basemap extent bounds from zones
    minx, miny, maxx, maxy = zones_web.total_bounds
    ax.set_xlim(minx - 5000, maxx + 5000)
    ax.set_ylim(miny - 5000, maxy + 5000)

    # Draw basemap (OSM)
    cx.add_basemap(ax, source=cx.providers.OpenStreetMap.Mapnik)

    # Plot zones as outlines on top
    zones_web.boundary.plot(ax=ax, linewidth=0.6)

    # Plot bridges
    if len(bridges_web) > 0:
        bridges_web.plot(ax=ax, linewidth=0.7, alpha=0.7)

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
            )

    ax.set_axis_off()
    ax.set_title("Geofence Grid & Bridges over Cyprus (OSM)")

    plt.tight_layout()
    out_file = "cyprus_grid_over_map.png"
    plt.savefig(out_file, dpi=300)
    print(f"Saved visualization to {out_file}")


if __name__ == "__main__":
    plot_on_cyprus_map()
