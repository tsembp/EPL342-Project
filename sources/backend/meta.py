from flask import Blueprint, jsonify
from db import get_connection

meta_bp = Blueprint("meta", __name__, url_prefix="/api/meta")


@meta_bp.route("/enums", methods=["GET"])
def get_enums():
    """Return valid ride profiles (service, ride, vehicle combos) and enums"""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT ServiceTypeId, Name FROM dbo.Servicetype WHERE Active = 1")
                services = [(row[0], row[1]) for row in cur.fetchall()]

                cur.execute("SELECT RideTypeId, Name FROM dbo.Ridetype")
                ride_types = [(row[0], row[1]) for row in cur.fetchall()]

                cur.execute("SELECT VehicleTypeId, Name, NumOfSeats FROM dbo.VehicleType")
                veh_types = [(row[0], row[1], row[2]) for row in cur.fetchall()]

                cur.execute("SELECT * FROM dbo.vw_AllowedRideProfiles")

                combo_specs = []
                for row in cur.fetchall():
                    combo_specs.append({
                        "ride_profile_id": str(row[0]),
                        "service_type_id": row[1],
                        "service_type_name": row[2],
                        "ride_type_id": row[3],
                        "ride_type_name": row[4],
                        "vehicle_type_id": row[5],
                        "vehicle_type_name": row[6],
                        "num_seats": row[7],
                    })

                return jsonify({
                    "services": services,
                    "ride_types": ride_types,
                    "veh_types": veh_types,
                    "combo_specs": combo_specs,
                }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
