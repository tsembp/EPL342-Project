from flask import Blueprint, jsonify, request, session
from db import get_connection
from decorators import require_auth, require_role
import json

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


# Create ride request
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


# Cancel ride request
@passenger_bp.route("/ride-requests/<int:request_id>/cancel", methods=["POST"])
@require_auth
@require_role("P")
def cancel_ride_request(request_id: int):
    user_id = session["user_id"]
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Check if the ride request belongs to the user and is cancellable
                cur.execute("""
                    SELECT Status
                    FROM dbo.RideRequest
                    WHERE RequestId = ? AND PassengerId = ?
                """, request_id, user_id)
                row = cur.fetchone()
                if not row:
                    return jsonify({"success": False, "error": "RideRequest not found"}), 404
                if row[0] not in ("Pending", "Edited"):
                    return jsonify({"success": False, "error": "RideRequest cannot be cancelled"}), 400

                # Run the cancel sproc
                cur.execute("""
                    EXEC dbo.usp_RideRequest_Cancel
                        @RequestId=?
                """, request_id)
                conn.commit()

        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


# Generate alternative routes for ride request
@passenger_bp.route("/ride-requests/<int:request_id>/alternatives", methods=["GET"])
@require_auth
@require_role("P")
def get_ride_alternatives(request_id: int):
    user_id = session["user_id"]

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # 1) Get pickup & dropoff points for this ride
                cur.execute("""
                    SELECT PickUpPoint, DropOffPoint
                    FROM dbo.RideRequest
                    WHERE RequestId = ? AND PassengerId = ?
                """, request_id, user_id)
                row = cur.fetchone()
                if not row:
                    return jsonify({"success": False, "error": "RideRequest not found"}), 404

                pickup_point_id, dropoff_point_id = row

                if pickup_point_id is None or dropoff_point_id is None:
                    return jsonify({"success": False, "error": "RideRequest has no pickup/dropoff points"}), 400

                # 2) Call the route sproc to get all alternatives as JSON
                cur.execute("""
                    EXEC dbo.usp_Route_GetAllAlternatives
                        @PickUpPointId=?,
                        @DropOffPointId=?,
                        @MaxHops=?,
                        @MaxAlternatives=?
                """, pickup_point_id, dropoff_point_id, 6, 50)

                result = cur.fetchone()
                if not result or result[0] is None:
                    return jsonify({"success": False, "error": "No alternatives found"}), 400

                alternatives_json_str = result[0]

                # 3) Return as proper JSON
                alternatives = json.loads(alternatives_json_str)

                return jsonify({
                    "success": True,
                    "requestId": request_id,
                    "alternatives": alternatives
                }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


# Select from route alternatives for ride request
@passenger_bp.route("/ride-requests/<int:request_id>/select-alternative", methods=["POST"])
@require_auth
@require_role("P")
def select_alternative(request_id: int):
    user_id = session["user_id"]
    data = request.json or {}

    try:
        alternative_no = data.get("alternativeNo")
        legs = data.get("legs", [])

        if not legs:
            return jsonify({"success": False, "error": "No legs provided"}), 400

        itinerary_json = json.dumps({"legs": legs})

        with get_connection() as conn:
            with conn.cursor() as cur:
                # Validate user owns this request + status Pending
                cur.execute("""
                    SELECT Status
                    FROM dbo.RideRequest
                    WHERE RequestId = ? AND PassengerId = ?
                """, request_id, user_id)
                row = cur.fetchone()
                if not row:
                    return jsonify({"success": False, "error": "RideRequest not found"}), 404
                if row[0] not in ("Pending", "Edited"):
                    return jsonify({"success": False, "error": "RideRequest not in selectable state"}), 400

                # Save itinerary legs in DB
                cur.execute("""
                    EXEC dbo.usp_RideRequest_SaveItineraryFromAlternative
                        @RequestId=?,
                        @ItineraryJson=?
                """, request_id, itinerary_json)

                # Expect sproc to return LegIds we just created
                leg_ids = [r[0] for r in cur.fetchall()]

                # For each leg, create dispatch offers (existing sproc)
                for leg_id in leg_ids:
                    cur.execute("""
                        EXEC dbo.usp_DispatchOfferCreation
                            @ItineraryLegId=?,
                            @SearchRadiusMeters=?
                    """, leg_id, 5000.0)

                conn.commit()

        return jsonify({
            "success": True,
            "requestId": request_id,
            "createdLegIds": leg_ids
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


# Get ride request details
@passenger_bp.route("/ride-requests/<int:request_id>", methods=["GET"])
@require_auth
@require_role("P")
def get_ride_request_details(request_id: int):
    """Return basic ride request details for the logged-in passenger."""
    user_id = session["user_id"]

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Basic request info + pickup/dropoff station names/zones
                cur.execute(
                    """
                    SELECT 
                        RR.RequestId,
                        RR.Status,
                        RR.NumOfPeople,
                        RR.PickupAt,
                        sp_from.PointId AS FromPointId,
                        sp_from.ZoneId  AS FromZoneId,
                        sp_from.Name    AS FromName,
                        sp_to.PointId   AS ToPointId,
                        sp_to.ZoneId    AS ToZoneId,
                        sp_to.Name      AS ToName
                    FROM dbo.RideRequest RR
                    JOIN dbo.StationPoint sp_from ON sp_from.PointId = RR.PickUpPointId
                    JOIN dbo.StationPoint sp_to   ON sp_to.PointId   = RR.DropOffPointId
                    WHERE RR.RequestId = ? AND RR.PassengerId = ?
                    """,
                    request_id,
                    user_id,
                )
                row = cur.fetchone()

                if not row:
                    return (
                        jsonify(
                            {"success": False, "error": "RideRequest not found"}
                        ),
                        404,
                    )

        return (
            jsonify(
                {
                    "success": True,
                    "request": {
                        "requestId": row.RequestId,
                        "status": row.Status,
                        "numOfPeople": row.NumOfPeople,
                        "pickupAt": row.PickupAt,
                        "pickup": {
                            "pointId": row.FromPointId,
                            "zoneId": row.FromZoneId,
                            "name": row.FromName,
                        },
                        "dropoff": {
                            "pointId": row.ToPointId,
                            "zoneId": row.ToZoneId,
                            "name": row.ToName,
                        },
                    }
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400
