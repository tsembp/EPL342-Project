from flask import Blueprint, jsonify, session, request
from db import get_connection
from decorators import require_auth, require_role

driver_bp = Blueprint("driver", __name__, url_prefix="/api/driver")

@driver_bp.route("/profile", methods=["GET"])
@require_auth
@require_role("D")
def get_driver_profile():
    """Get driver profile - requires driver role"""
    user_id = session["user_id"]
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM dbo.Driver WHERE UserId = ?", user_id)
                row = cur.fetchone()
                if row:
                    columns = [column[0] for column in cur.description]
                    return jsonify(dict(zip(columns, row))), 200
                return jsonify({"error": "Profile not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@driver_bp.route("/service-enroll/check", methods=["POST"])
@require_auth
@require_role("D")
def check_service_enroll():
    """
    Driver-side: check if a given vehicle + service type can be enrolled.
    Calls dbo.usp_Service_Enroll_Check.
    """
    user_id = session["user_id"]
    data = request.get_json() or {}

    vehicle_id = data.get("vehicleId")
    service_type_id = data.get("serviceTypeId")

    if vehicle_id is None or service_type_id is None:
        return jsonify({"error": "vehicleId and serviceTypeId are required"}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Service_Enroll_Check 
                        @UserId = ?, 
                        @VehicleId = ?, 
                        @ServiceTypeId = ?
                    """,
                    user_id,
                    vehicle_id,
                    service_type_id,
                )
                # Adapt this to whatever your sproc actually returns
                if cur.description:
                    columns = [col[0] for col in cur.description]
                    rows = [dict(zip(columns, row)) for row in cur.fetchall()]
                else:
                    rows = []

        return jsonify(rows), 200
    except Exception as e:
        print("Error in /service-enroll/check:", e)
        return jsonify({"error": str(e)}), 500


@driver_bp.route("/service-enroll/create", methods=["POST"])
@require_auth
@require_role("D")
def create_service_enroll():
    """
    Driver-side: actually create an enrollment.
    Calls dbo.usp_Service_Enroll_Create.
    """
    user_id = session["user_id"]
    data = request.get_json() or {}

    vehicle_id = data.get("vehicleId")
    service_type_id = data.get("serviceTypeId")

    if vehicle_id is None or service_type_id is None:
        return jsonify({"error": "vehicleId and serviceTypeId are required"}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Service_Enroll_Create 
                        @UserId = ?, 
                        @VehicleId = ?, 
                        @ServiceTypeId = ?
                    """,
                    user_id,
                    vehicle_id,
                    service_type_id,
                )
                # Return whatever the sproc outputs (e.g. new enrollment row)
                if cur.description:
                    columns = [col[0] for col in cur.description]
                    rows = [dict(zip(columns, row)) for row in cur.fetchall()]
                else:
                    rows = []

        return jsonify({"success": True, "data": rows}), 200
    except Exception as e:
        print("Error in /service-enroll/create:", e)
        return jsonify({"error": str(e)}), 500
