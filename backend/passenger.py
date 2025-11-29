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
                        @PassengerId=?,
                        @RequestId=?
                """, user_id, request_id)
                conn.commit()

        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


# Get all ride requests for passenger (optionally filter by status)
@passenger_bp.route("/ride-requests/", methods=["GET"])
@require_auth
@require_role("P")
def get_ride_requests():
    user_id = session["user_id"]
    status = request.args.get("status")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                sql = """
                    SELECT
                        RequestId,
                        NumOfPeople,
                        PickupAt,
                        PickUpPoint AS pickupPointId,
                        DropOffPoint AS dropOffPointId,
                        RideProfileId,
                        Status
                    FROM dbo.RideRequest
                    WHERE PassengerId = ?
                        AND (
                            ? IS NULL
                            OR ? = ''
                            OR Status = ?
                        )
                    ORDER BY PickupAt DESC
                """
                params = (user_id, status, status, status)
                cur.execute(sql, params)
                rows = cur.fetchall()

                columns = [col[0] for col in cur.description]
                requests = [dict(zip(columns, row)) for row in rows]

        return jsonify({"success": True, "requests": requests}), 200

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
    """Return ride request details (incl. rides) for the logged-in passenger."""
    user_id = session["user_id"]

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # 1) Basic request info + pickup/dropoff station names/zones + coords
                cur.execute(
                    """
                    SELECT 
                        RR.RequestId,
                        RR.Status,
                        RR.NumOfPeople,
                        RR.PickupAt,
                        zp_from.PointId   AS FromPointId,
                        zp_from.ZoneId    AS FromZoneId,
                        zp_from.Name      AS FromName,
                        zp_from.Latitude  AS FromLatitude,
                        zp_from.Longitude AS FromLongitude,
                        zp_to.PointId     AS ToPointId,
                        zp_to.ZoneId      AS ToZoneId,
                        zp_to.Name        AS ToName,
                        zp_to.Latitude    AS ToLatitude,
                        zp_to.Longitude   AS ToLongitude
                    FROM dbo.RideRequest RR
                    JOIN dbo.ZonePoint zp_from ON zp_from.PointId = RR.PickUpPoint
                    JOIN dbo.ZonePoint zp_to   ON zp_to.PointId   = RR.DropOffPoint
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

                # 2) RideRequestProgress
                cur.execute(
                    """
                    SELECT Status
                    FROM dbo.RideRequestProgress
                    WHERE RequestId = ?
                    """,
                    request_id,
                )
                progress_row = cur.fetchone()
                progress_status = progress_row[0] if progress_row else None
                print("DEBUG get_ride_request_details: RequestId", request_id, "progress_status =", progress_status)

                # 3) If rides have been created/accepted, load them
                rides: list[dict] = []

                cur.execute(
                    """
                    SELECT
                        R.RideId,
                        IL.SeqNo            AS LegIndex,
                        zp_leg_from.Name    AS FromName,
                        zp_leg_to.Name      AS ToName,
                        R.Status            AS RideStatus,
                        U.FirstName + ' ' + U.LastName AS DriverName,
                        V.PlateNumber       AS VehiclePlate,
                        VT.Name             AS VehicleType,
                        IL.ApproxStartTime AS PlannedStart,
                        IL.ApproxEndTime   AS PlannedEnd,
                        R.PriceFinal        AS PriceFinal
                    FROM dbo.Ride R
                    JOIN dbo.DispatchOffer DO
                        ON DO.OfferId = R.OfferId
                    JOIN dbo.ItineraryLeg IL
                        ON IL.LegId = DO.LegId
                    JOIN dbo.ZonePoint zp_leg_from
                        ON zp_leg_from.PointId = IL.FromPointId
                    JOIN dbo.ZonePoint zp_leg_to
                        ON zp_leg_to.PointId = IL.ToPointId
                    LEFT JOIN dbo.[User] U
                        ON U.UserId = R.DriverUserId
                    LEFT JOIN dbo.Vehicle V
                        ON V.VehicleId = R.VehicleId
                    LEFT JOIN dbo.VehicleType VT
                        ON VT.VehicleTypeId = V.VehicleTypeId

                    WHERE DO.Status = 'Accepted' AND IL.RideRequestId = ?
                    ORDER BY IL.SeqNo
                    """,
                    request_id,
                )
                ride_rows = cur.fetchall()

                for r in ride_rows:
                    rides.append(
                        {
                            "rideId": r.RideId,
                            "legIndex": r.LegIndex,
                            "fromName": r.FromName,
                            "toName": r.ToName,
                            "status": r.RideStatus,
                            "driverName": r.DriverName,
                            "vehiclePlate": r.VehiclePlate,
                            "vehicleType": r.VehicleType,
                            "plannedStart": (
                                r.PlannedStart.isoformat()
                                if getattr(r, "PlannedStart", None)
                                else None
                            ),
                            "plannedEnd": (
                                r.PlannedEnd.isoformat()
                                if getattr(r, "PlannedEnd", None)
                                else None
                            ),
                            "priceFinal": float(r.PriceFinal) if getattr(r, "PriceFinal", None) is not None else None,
                        }
                    )

        # 4) Build response JSON
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
                            "latitude": float(row.FromLatitude)
                            if row.FromLatitude is not None
                            else None,
                            "longitude": float(row.FromLongitude)
                            if row.FromLongitude is not None
                            else None,
                        },
                        "dropoff": {
                            "pointId": row.ToPointId,
                            "zoneId": row.ToZoneId,
                            "name": row.ToName,
                            "latitude": float(row.ToLatitude)
                            if row.ToLatitude is not None
                            else None,
                            "longitude": float(row.ToLongitude)
                            if row.ToLongitude is not None
                            else None,
                        },
                        "progressStatus": progress_status,
                        "rides": rides,  # 👈 NEW
                    },
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


# Get ride history for passenger
@passenger_bp.route("/ride-history", methods=["GET"])
@require_auth
@require_role("P")
def get_ride_history():
    user_id = session["user_id"]

    page = int(request.args.get("page", 1) or 1)
    page_size = int(request.args.get("page_size", 50) or 50)
    page_size = max(1, min(page_size, 50))

    status_filter = request.args.get("status")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                sql = """
                WITH ReqAgg AS (
                    SELECT
                        rr.RequestId,
                        rr.Status AS RequestStatus,
                        rr.PickupAt,
                        zp_from.Name AS FromName,
                        zp_to.Name   AS ToName,
                        -- trip-level aggregates
                        CASE WHEN COUNT(r.RideId) > 0 THEN 1 ELSE 0 END AS HasRides,
                        COUNT(DISTINCT r.RideId)          AS RideCount,
                        MIN(r.StartedAt)                  AS FirstRideStart,
                        MAX(r.EndedAt)                    AS LastRideEnd,
                        SUM(ISNULL(r.PriceFinal, 0))      AS TotalPrice,
                        -- a simple "latest" ride status (for list display)
                        MAX(r.Status)                     AS LatestRideStatus
                    FROM dbo.RideRequest rr
                    LEFT JOIN dbo.ItineraryLeg il
                        ON rr.RequestId = il.RideRequestId
                    LEFT JOIN dbo.DispatchOffer dof
                        ON dof.LegId = il.LegId
                    LEFT JOIN dbo.Ride r
                        ON r.OfferId = dof.OfferId
                    LEFT JOIN dbo.ZonePoint zp_from
                        ON rr.PickUpPoint = zp_from.PointId
                    LEFT JOIN dbo.ZonePoint zp_to
                        ON rr.DropOffPoint = zp_to.PointId
                    WHERE rr.PassengerId = ?
                      AND (
                            ? IS NULL
                            OR ? = ''
                            OR rr.Status = ?
                          )
                    GROUP BY
                        rr.RequestId,
                        rr.Status,
                        rr.PickupAt,
                        zp_from.Name,
                        zp_to.Name
                )
                SELECT
                    RequestId,
                    RequestStatus,
                    PickupAt,
                    FromName,
                    ToName,
                    HasRides,
                    RideCount,
                    FirstRideStart,
                    LastRideEnd,
                    TotalPrice,
                    LatestRideStatus,
                    COUNT(*) OVER() AS TotalCount
                FROM ReqAgg
                ORDER BY PickupAt DESC
                OFFSET (? - 1) * ? ROWS
                FETCH NEXT ? ROWS ONLY;
                """

                params = (
                    user_id,
                    status_filter,
                    status_filter,
                    status_filter,
                    page,
                    page_size,
                    page_size,
                )

                cur.execute(sql, params)
                rows = cur.fetchall()

                if not rows:
                    return jsonify({
                        "success": True,
                        "history": [],
                        "page": page,
                        "page_size": page_size,
                        "total_count": 0,
                        "total_pages": 0,
                    }), 200

                columns = [col[0] for col in cur.description]
                history = [dict(zip(columns, row)) for row in rows]

                total_count = history[0].get("TotalCount", 0) or 0
                total_pages = (total_count + page_size - 1) // page_size

                # Strip TotalCount from each entry (we send it separately)
                for item in history:
                    item.pop("TotalCount", None)

                return jsonify({
                    "success": True,
                    "history": history,
                    "page": page,
                    "page_size": page_size,
                    "total_count": total_count,
                    "total_pages": total_pages,
                }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


def get_ride_participants(cur, ride_id: int):
  """
  Returns (passenger_user_id, driver_user_id) for a ride, or (None, None) if not found.
  """
  cur.execute(
      """
      SELECT PassengerUserId, DriverUserId
      FROM dbo.vw_RideParticipants
        WHERE RideId = ?
      """,
      ride_id,
  )
  row = cur.fetchone()
  if not row:
      return None, None
  return row.PassengerUserId, row.DriverUserId

# Get messages for ride
@passenger_bp.route("/rides/<int:ride_id>/messages", methods=["GET"])
@require_auth
@require_role("P")
def get_ride_messages(ride_id: int):
    user_id = session["user_id"]

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Ensure ride exists and get participants
                passenger_user_id, driver_user_id = get_ride_participants(cur, ride_id)
                if not passenger_user_id or not driver_user_id:
                    return jsonify({"success": False, "error": "Ride not found"}), 404

                cur.execute(
                    "EXEC dbo.usp_GetMessage ?, ?",
                    ride_id,
                    user_id,
                )
                rows = cur.fetchall()

        messages = []
        for r in rows:
            messages.append(
                {
                    "msgId": r.MsgId,
                    "body": r.Body,
                    "sentAt": r.SentAt.isoformat() if r.SentAt else None,
                    "isMine": str(r.SenderUserId) == str(user_id),
                }
            )

        return jsonify({"success": True, "messages": messages}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


# Send new message passenger -> driver
@passenger_bp.route("/rides/<int:ride_id>/messages", methods=["POST"])
@require_auth
@require_role("P")
def send_ride_message(ride_id: int):
    user_id = session["user_id"]
    body = request.get_json(silent=True) or {}
    text = (body.get("body") or "").strip()

    if not text:
        return jsonify({"success": False, "error": "Message body is required"}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                passenger_user_id, driver_user_id = get_ride_participants(cur, ride_id)
                if not passenger_user_id or not driver_user_id:
                    return jsonify({"success": False, "error": "Ride not found"}), 404

                cur.execute(
                    "EXEC dbo.usp_SendMessage ?, ?, ?, ?",
                    user_id,
                    driver_user_id,
                    ride_id,
                    text,
                )

                inserted = cur.fetchone()
                conn.commit()

        msg_id = inserted.MsgId
        sent_at = inserted.SentAt.isoformat() if inserted.SentAt else None

        return (
            jsonify(
                {
                    "success": True,
                    "message": {
                        "msgId": msg_id,
                        "body": text,
                        "sentAt": sent_at,
                        "isMine": True,
                    }
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# Create review for ride (from passenger->driver but can be reused for driver->passenger)
@passenger_bp.route("/rides/<int:ride_id>/rating", methods=["POST"])
@require_auth
@require_role("P")
def create_ride_rating(ride_id: int):
    """
    Passenger creates a rating for a completed ride.
    We only accept stars + comment from the client; we derive author/target
    from the session and the Ride row.
    """
    user_id = session["user_id"]  # Author
    data = request.json or {}

    try:
        stars = int(data.get("stars", 0))
        comment = data.get("comment")

        if stars < 1 or stars > 5:
            return (
                jsonify({"success": False, "error": "Stars must be between 1 and 5."}),
                400,
            )

        with get_connection() as conn:
            with conn.cursor() as cur:
                # Get ride participants
                cur.execute(
                    """
                    SELECT DriverUserId, PassengerUserId, Status
                    FROM dbo.Ride
                    WHERE RideId = ?
                    """,
                    ride_id,
                )
                row = cur.fetchone()
                if not row:
                    return jsonify({"success": False, "error": "Ride not found"}), 404

                driver_id, passenger_id, ride_status = row

                # Decide target user based on who is logged in
                if user_id == passenger_id:
                    target_id = driver_id
                elif user_id == driver_id:
                    target_id = passenger_id
                else:
                    # Shouldn't happen. Guard anyway
                    return (
                        jsonify(
                            {"success": False, "error": "User did not participate in this ride."}
                        ),
                        403,
                    )

                # Call sproc
                cur.execute(
                    """
                    EXEC dbo.usp_CreateRating
                        @RideId=?,
                        @AuthorUserId=?,
                        @TargetUserId=?,
                        @Stars=?,
                        @Comment=?
                    """,
                    ride_id,
                    user_id,
                    target_id,
                    stars,
                    comment,
                )

                row = cur.fetchone()
                conn.commit()

                rating_id = row[0] if row else None

                return (
                    jsonify(
                        {
                            "success": True,
                            "ratingId": rating_id,
                        }
                    ),
                    201,
                )

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# Pay for rides of ride request
@passenger_bp.route("/ride-requests/<int:request_id>/pay", methods=["POST"])
@require_auth
@require_role("P")
def pay_for_ride_request(request_id: int):
    """
    Create payments for all completed rides of this ride request
    that belong to the logged-in passenger and have no payment yet.
    Expects JSON: { "paymentMethod": "CreditCard" | "Cash" }
    """
    user_id = session["user_id"]
    data = request.json or {}

    payment_method = data.get("paymentMethod", "CreditCard")
    if payment_method not in ("CreditCard", "Cash"):
        return jsonify({
            "success": False,
            "error": "Invalid payment method. Must be 'CreditCard' or 'Cash'."
        }), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # 1) Verify ride request belongs to user and is Completed
                cur.execute("""
                    SELECT Status
                    FROM dbo.RideRequest
                    WHERE RequestId = ? AND PassengerId = ?
                """, request_id, user_id)
                row = cur.fetchone()
                if not row:
                    return jsonify({
                        "success": False,
                        "error": "RideRequest not found"
                    }), 404

                request_status = row[0]
                if request_status != "Completed":
                    return jsonify({
                        "success": False,
                        "error": f"RideRequest is not in Completed status (current: {request_status})"
                    }), 400

                # 2) Find all completed rides for this request with no payment
                cur.execute("""
                    SELECT DISTINCT r.RideId
                    FROM dbo.Ride r
                    JOIN dbo.DispatchOffer dof ON r.OfferId = dof.OfferId
                    JOIN dbo.ItineraryLeg il   ON dof.LegId = il.LegId
                    WHERE il.RideRequestId = ?
                      AND r.PassengerUserId = ?
                      AND r.Status = 'Completed'
                      AND r.Payment IS NULL
                    ORDER BY r.RideId
                """, request_id, user_id)
                ride_rows = cur.fetchall()

                if not ride_rows:
                    return jsonify({
                        "success": True,
                        "requestId": request_id,
                        "payments": [],
                        "message": "No rides pending payment for this request."
                    }), 200

                payments = []

                for r in ride_rows:
                    ride_id = r[0]

                    # Call the payment sproc for each ride
                    cur.execute("""
                        EXEC dbo.usp_CompleteRidePayment
                            @RideId = ?,
                            @PaymentMethod = ?
                    """, ride_id, payment_method)

                    result = cur.fetchone()
                    if not result:
                        raise Exception(f"No result returned from usp_CompleteRidePayment for RideId {ride_id}")

                    # pyodbc row: access by attribute or index
                    result_code = getattr(result, "Result", None) or result[0]

                    if result_code != "SUCCESS":
                        error_msg = getattr(result, "ErrorMessage", None) or "Unknown payment error"
                        raise Exception(f"Payment failed for RideId {ride_id}: {error_msg}")

                    payments.append({
                        "rideId": int(getattr(result, "RideId", ride_id)),
                        "paymentId": str(getattr(result, "PaymentId", "")),
                        "finalPrice": float(getattr(result, "FinalPrice", 0)),
                        "grossAmount": float(getattr(result, "GrossAmount", 0)),
                        "platformFee": float(getattr(result, "PlatformFee", 0)),
                        "driverPayout": float(getattr(result, "DriverPayout", 0)),
                        "paymentMethod": getattr(result, "PaymentMethod", payment_method),
                    })

                conn.commit()

        return jsonify({
            "success": True,
            "requestId": request_id,
            "payments": payments,
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400
    

# Get live vehicle location for ride
@passenger_bp.route("/rides/<int:ride_id>/vehicle-location-live", methods=["GET"])
@require_auth
@require_role("P")
def get_ride_vehicle_location_live(ride_id: int):
    """
    Return the live vehicle location for a given ride,
    only if the ride belongs to the logged-in passenger and
    ride status is Scheduled or InProgress.
    """
    user_id = session["user_id"]

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # 1) Verify ride belongs to passenger and get status + vehicle
                cur.execute(
                    """
                    SELECT r.VehicleId, r.Status
                    FROM dbo.Ride r
                    WHERE r.RideId = ? AND r.PassengerUserId = ?
                    """,
                    (ride_id, user_id),
                )
                row = cur.fetchone()
                if not row:
                    return jsonify({
                        "success": False,
                        "error": "Ride not found for this passenger."
                    }), 404

                vehicle_id, status = row

                if status not in ("Scheduled", "InProgress"):
                    # We simply say no live location outside active phase
                    return jsonify({
                        "success": True,
                        "hasLocation": False,
                        "reason": f"Live tracking only available when ride is Scheduled or InProgress (current: {status}).",
                    }), 200

                # 2) Fetch latest location for that vehicle
                cur.execute(
                    """
                    SELECT Lat, Lng, UpdatedAt
                    FROM dbo.VehicleLocationLive
                    WHERE VehicleId = ?
                    """,
                    (vehicle_id,),
                )
                loc = cur.fetchone()
                if not loc:
                    return jsonify({
                        "success": True,
                        "hasLocation": False,
                        "reason": "No live location available for this vehicle yet."
                    }), 200

                lat, lng, updated_at = loc

        return jsonify({
            "success": True,
            "hasLocation": True,
            "rideId": ride_id,
            "vehicleId": str(vehicle_id),
            "lat": float(lat),
            "lng": float(lng),
            "updatedAt": updated_at.isoformat() if updated_at else None,
        }), 200

    except Exception as e:
        print("Error in /passenger/rides/<ride_id>/vehicle-location-live:", e)
        return jsonify({"success": False, "error": str(e)}), 500


