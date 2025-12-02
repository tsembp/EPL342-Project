import pyodbc
import pandas as pd
from pathlib import Path

DB_HOST = "10.16.1.133"
DB_NAME = "ptsemb01"
DB_USER = "ptsemb01"
DB_PASS = "jBrC2y6f"

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    f"SERVER={DB_HOST},1433;"
    f"DATABASE={DB_NAME};"
    f"UID={DB_USER};"
    f"PWD={DB_PASS};"
    "Encrypt=no;"
    "TrustServerCertificate=yes;"
)

cursor = conn.cursor()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "map_zones"

zones_path = DATA_DIR / "zones"
zone_points_path = DATA_DIR / "zone_points"
bridges_path = DATA_DIR / "bridges"

print("Using paths:")
print("  zones       ->", zones_path)
print("  zone_points ->", zone_points_path)
print("  bridges     ->", bridges_path)

zones = pd.read_csv(zones_path)
zone_points = pd.read_csv(zone_points_path)
bridges = pd.read_csv(bridges_path)

# === INSERT INTO GeofenceZone ==========================================
print("Seeding GeofenceZone...")

cursor.execute("DELETE FROM Bridge")
cursor.execute("DELETE FROM ZonePoint")
cursor.execute("DELETE FROM GeofenceZone")
conn.commit()

for _, row in zones.iterrows():
    cursor.execute("""
        INSERT INTO GeofenceZone (MinLat, MinLng, MaxLat, MaxLng, Name, CreatedAt)
        VALUES (?, ?, ?, ?, ?, GETUTCDATE())
    """, 
    float(row["MinLat"]),
    float(row["MinLng"]),
    float(row["MaxLat"]),
    float(row["MaxLng"]),
    row["Name"]
    )

conn.commit()
print("✔ GeofenceZone seeded")

# === INSERT INTO ZonePoint ==============================================
print("Seeding ZonePoint...")

for _, row in zone_points.iterrows():
    cursor.execute("""
        INSERT INTO ZonePoint (ZoneId, Latitude, Longitude, PointType, Name, IsPickupAllowed, IsDropoffAllowed)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """,
    int(row["ZoneId"]),
    float(row["Latitude"]),
    float(row["Longitude"]),
    row["PointType"],
    row["Name"],
    int(row["IsPickupAllowed"]),
    int(row["IsDropoffAllowed"])
    )

conn.commit()
print("✔ ZonePoint seeded")

# === INSERT INTO Bridge ===================================================
print("Seeding Bridge...")

for _, row in bridges.iterrows():
    cursor.execute("""
        INSERT INTO Bridge (PointId, FromZoneId, ToZoneId, Name)
        VALUES (?, ?, ?, ?)
    """,
    int(row["PointId"]),
    int(row["FromZoneId"]),
    int(row["ToZoneId"]),
    row["Name"]
    )

conn.commit()
print("✔ Bridge seeded")

# === DONE ================================================================
cursor.close()
conn.close()

print("\nALL DONE ✔✔✔")
