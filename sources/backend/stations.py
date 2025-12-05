from flask import Blueprint, request, jsonify
from db import get_connection

stations_bp = Blueprint("stations", __name__, url_prefix="/api")


@stations_bp.route("/stations", methods=["GET"])
def get_stations():
    """
    Get available stations (ZonePoints) filtered by:
    - pointType: 'S' (station), 'B' (bridge), or both (default: both)
    - isPickupAllowed: true/false (optional)
    - isDropoffAllowed: true/false (optional)
    """
    point_type = request.args.get("pointType")
    is_pickup_allowed = request.args.get("isPickupAllowed")
    is_dropoff_allowed = request.args.get("isDropoffAllowed")

    where_clauses = []
    params = []

    if point_type in ("S", "B"):
        where_clauses.append("zp.PointType = ?")
        params.append(point_type)
    else:
        where_clauses.append("zp.PointType IN ('S', 'B')")

    if is_pickup_allowed is not None:
        where_clauses.append("zp.IsPickupAllowed = ?")
        params.append(1 if is_pickup_allowed.lower() == "true" else 0)

    if is_dropoff_allowed is not None:
        where_clauses.append("zp.IsDropoffAllowed = ?")
        params.append(1 if is_dropoff_allowed.lower() == "true" else 0)

    where_sql = " AND ".join(where_clauses)

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                sql = f"""
                    SELECT 
                        zp.PointId,
                        zp.ZoneId,
                        zp.Latitude,
                        zp.Longitude,
                        zp.Name,
                        zp.IsPickupAllowed,
                        zp.IsDropoffAllowed,
                        gz.Name as ZoneName,
                        zp.PointType
                    FROM [dbo].[ZonePoint] zp
                    JOIN [dbo].[Geofencezone] gz ON zp.ZoneId = gz.ZoneId
                    WHERE {where_sql}
                    ORDER BY gz.Name, zp.Name
                """
                cur.execute(sql, *params)
                stations = []
                for row in cur.fetchall():
                    stations.append({
                        "pointId": row[0],
                        "zoneId": row[1],
                        "latitude": float(row[2]),
                        "longitude": float(row[3]),
                        "name": row[4],
                        "isPickupAllowed": bool(row[5]),
                        "isDropoffAllowed": bool(row[6]),
                        "zoneName": row[7],
                        "pointType": row[8],
                    })
                return jsonify({
                    "success": True,
                    "stations": stations,
                    "total": len(stations),
                }), 200
    except Exception as e:
        print(f"Error fetching stations: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@stations_bp.route("/zones", methods=["GET"])
def get_zones():
    """Get all geofence zones"""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        ZoneId,
                        MinLat,
                        MinLng,
                        MaxLat,
                        MaxLng,
                        Name
                    FROM [dbo].[Geofencezone]
                    ORDER BY ZoneId
                """)

                zones = []
                for row in cur.fetchall():
                    zones.append({
                        "zoneId": row[0],
                        "minLat": float(row[1]),
                        "minLng": float(row[2]),
                        "maxLat": float(row[3]),
                        "maxLng": float(row[4]),
                        "name": row[5],
                    })

                return jsonify({
                    "success": True,
                    "zones": zones,
                    "total": len(zones),
                }), 200

    except Exception as e:
        print(f"Error fetching zones: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
