from flask import Blueprint, jsonify, request, session
from db import get_connection
from decorators import require_auth, require_role

passenger_bp = Blueprint("passenger", __name__, url_prefix="/api/passenger")


@passenger_bp.route("/profile", methods=["GET"])
@require_auth
@require_role("P")
def get_passenger_profile():
    """Get passenger profile - requires passenger role"""
    user_id = session["user_id"]
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM dbo.Passenger WHERE UserId = ?", user_id)
                row = cur.fetchone()
                if row:
                    columns = [column[0] for column in cur.description]
                    return jsonify(dict(zip(columns, row))), 200
                return jsonify({"error": "Profile not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@passenger_bp.route("/request-ride", methods=["POST"])
@require_auth
@require_role("P")
def request_ride():
    """
    Create a new ride request for the logged-in passenger.
    Expects: JSON with pickupPointId, dropoffPointId, rideProfileId, numOfPeople, pickupAt (ISO string)
    """
    data = request.json or {}
    user_id = session["user_id"]

    try:
        pickup_point_id = int(data.get("pickupPointId"))
        dropoff_point_id = int(data.get("dropoffPointId"))
        ride_profile_id = data.get("rideProfileId")
        num_of_people = int(data.get("numOfPeople", 1))
        pickup_at = data.get("pickupAt")

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    EXEC dbo.usp_RideRequest_Create
                        @PassengerId=?,
                        @NumOfPeople=?,
                        @PickupAt=?,
                        @PickUpPointId=?,
                        @DropOffPointId=?,
                        @RideProfileId=?
                """, user_id, num_of_people, pickup_at,
                     pickup_point_id, dropoff_point_id, ride_profile_id)
                row = cur.fetchone()
                if row:
                    return jsonify({"success": True, "requestId": row[0]}), 201
                else:
                    return jsonify({"success": False, "error": "No requestId returned"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400
