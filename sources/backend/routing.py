from flask import Blueprint, request, jsonify
import pyodbc

from db import get_connection

route_bp = Blueprint("route", __name__, url_prefix="/api/route")


@route_bp.route("/visualization", methods=["GET"])
def get_route_visualization():
    """Get route waypoints including bridge points for visualization"""
    pickup_point_id = request.args.get("pickupPointId", type=int)
    dropoff_point_id = request.args.get("dropoffPointId", type=int)

    if not pickup_point_id or not dropoff_point_id:
        return jsonify({
            "success": False,
            "error": "Both pickupPointId and dropoffPointId are required",
        }), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                print(f"Calling usp_GetRouteVisualization with pickup={pickup_point_id}, dropoff={dropoff_point_id}")
                cur.execute("""
                    EXEC dbo.usp_GetRouteVisualization 
                        @PickupPointId=?, 
                        @DropoffPointId=?
                """, pickup_point_id, dropoff_point_id)

                waypoints = []
                for row in cur.fetchall():
                    print(f"Row: {row}")
                    waypoints.append({
                        "sequenceNumber": row[0],
                        "pointId": row[1],
                        "latitude": float(row[2]),
                        "longitude": float(row[3]),
                        "pointType": row[4],
                        "pointName": row[5] if row[5] else f"Point {row[1]}",
                        "zoneId": row[6],
                        "pointRole": row[7],
                    })

                print(f"Retrieved {len(waypoints)} waypoints")
                return jsonify({
                    "success": True,
                    "waypoints": waypoints,
                    "totalWaypoints": len(waypoints),
                }), 200

    except pyodbc.Error as e:
        print(f"Database error getting route visualization: {e}")
        print(f"Error details: {e.args}")
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        print(f"Error getting route visualization: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
