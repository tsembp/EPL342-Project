#!/usr/bin/env python3
"""
Visualize the generated Cyprus zones, stations, and bridges on OpenStreetMap.
"""

from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
import contextily as cx

# Paths
DATA_DIR = Path("/output")
zones_file = DATA_DIR / "zones"
points_file = DATA_DIR / "zone_points"
bridges_file = DATA_DIR / "bridges"

# Load data
print("Loading data...")
zones = pd.read_csv(zones_file)
points = pd.read_csv(points_file)
bridges = pd.read_csv(bridges_file)

print(f"  Zones: {len(zones)}")
print(f"  Points: {len(points)}")
print(f"  Bridges: {len(bridges)}")

# Split stations and bridge points
stations = points[points['PointType'] == 'S']
bridge_points = points[points['PointType'] == 'B']

print(f"    Stations: {len(stations)}")
print(f"    Bridge points: {len(bridge_points)}")

# Create visualization with larger figure
fig, ax = plt.subplots(figsize=(20, 10))

# Plot zones first (background)
print("\nPlotting zones...")
for _, zone in zones.iterrows():
    rect = Rectangle(
        (zone['MinLng'], zone['MinLat']),
        zone['MaxLng'] - zone['MinLng'],
        zone['MaxLat'] - zone['MinLat'],
        linewidth=1.5,
        edgecolor='blue',
        facecolor='none',
        alpha=0.6,
        zorder=3
    )
    ax.add_patch(rect)

    # Compute center of the zone
    center_x = (zone['MinLng'] + zone['MaxLng']) / 2
    center_y = (zone['MinLat'] + zone['MaxLat']) / 2

    # Add zone ID label inside the box
    ax.text(
        center_x, center_y,
        str(zone['ZoneId']),
        ha='center', va='center',
        fontsize=8, fontweight='bold',
        color='blue',
        zorder=6,
        bbox=dict(facecolor='white', edgecolor='none', alpha=0.6)
    )

# Plot stations (green circles)
print("Plotting stations...")
ax.scatter(stations['Longitude'], stations['Latitude'], 
           c='green', s=40, marker='o', alpha=0.9, 
           label=f'Stations (Pickup/Drop)', zorder=5,
           edgecolors='darkgreen', linewidths=0.5)

# Plot bridge points (red squares)
print("Plotting bridge points...")
ax.scatter(bridge_points['Longitude'], bridge_points['Latitude'], 
           c='red', s=60, marker='s', alpha=0.9, 
           label='Bridge Points', zorder=5,
           edgecolors='darkred', linewidths=0.5)

# Set axis limits to Cyprus bounds
ax.set_xlim(zones['MinLng'].min() - 0.05, zones['MaxLng'].max() + 0.05)
ax.set_ylim(zones['MinLat'].min() - 0.05, zones['MaxLat'].max() + 0.05)

# Add OpenStreetMap basemap
print("Adding OpenStreetMap basemap...")
try:
    cx.add_basemap(ax, crs='EPSG:4326', source=cx.providers.OpenStreetMap.Mapnik, 
                   zoom=10, alpha=0.7, zorder=1)
    print("  ✓ Basemap added successfully")
except Exception as e:
    print(f"  Warning: Could not add basemap: {e}")
    ax.set_facecolor('#E8F4F8')  # Light blue background as fallback

# Formatting
ax.set_xlabel('Longitude', fontsize=14, fontweight='bold')
ax.set_ylabel('Latitude', fontsize=14, fontweight='bold')

# Title with statistics
title = f'Actual Database Points\n{len(zones)} Zones | {len(stations)} Stations | {len(bridge_points)} Bridge Points'
ax.set_title(title, fontsize=16, fontweight='bold', pad=20)

ax.set_aspect('equal')

# Legend with custom styling
legend = ax.legend(fontsize=12, loc='upper right', 
                   framealpha=0.95, edgecolor='black', fancybox=True)
legend.get_frame().set_facecolor('white')

# Add grid
ax.grid(True, alpha=0.3, linestyle='--', linewidth=0.5, zorder=2)

plt.tight_layout()

# Save
output_file = "cyprus_zones_visualization.png"
plt.savefig(output_file, dpi=300, bbox_inches='tight', facecolor='white')
print(f"\n✅ Visualization saved to: {output_file}")

plt.show()
