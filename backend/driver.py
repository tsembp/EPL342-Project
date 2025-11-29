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

# NOTE: This endpoint is unauthenticated on purpose to allow newly
# registered users to upload their documents before their account is verified or active.
@driver_bp.route("/documents", methods=["POST"])
def upload_document():
    """
    Handles document uploads for drivers and company reps (post-signup).
    Calls the dbo.usp_AddPersonDocument stored procedure.
    The uploaded file is noted but not stored by this endpoint, as the SP
    creates a dummy URL.
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        # Extract data from the form
        user_id = request.form.get("userId")
        doc_type = request.form.get("docType")
        doc_number = request.form.get("docNumber")
        issue_date = request.form.get("issueDate")
        expiry_date = request.form.get("expiryDate") # This can be None

        # Basic validation
        if not all([user_id, doc_type, doc_number, issue_date]):
            return jsonify({"error": "Missing required form fields"}), 400

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_AddPersonDocument
                        @UserId = ?,
                        @DocType = ?,
                        @DocNumber = ?,
                        @IssueDate = ?,
                        @ExpiryDate = ?
                    """,
                    user_id,
                    doc_type,
                    doc_number,
                    issue_date,
                    expiry_date,
                )
                
                # Check if the stored procedure returned a result
                row = cur.fetchone()
                if row and row[0]:
                    return jsonify({"success": True, "docId": row[0]}), 201
                else:
                    # This case might happen if the SP has a logic path with no output
                    # but doesn't raise an error. We'll assume success if no error.
                    return jsonify({"success": True, "message": "Document processed."}), 200


    except Exception as e:
        # Log the full error for debugging
        print(f"Error in /documents endpoint: {e}")
        # Return a generic error to the client
        return jsonify({"error": "An internal error occurred.", "details": str(e)}), 500
    
@driver_bp.route("/offers", methods=["GET"])
@require_auth
@require_role("D")
def get_dispatch_offers_for_driver():
    """
    Return dispatch offers for the logged-in driver.
    Wraps dbo.usp_GetDispatchOffersForDriver.
    """
    user_id = session["user_id"]

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_GetDispatchOffersForDriver
                        @DriverUserId = ?
                    """,
                    user_id,
                )

                if cur.description:
                    columns = [col[0] for col in cur.description]
                    rows = [dict(zip(columns, row)) for row in cur.fetchall()]
                else:
                    rows = []

        return jsonify({"success": True, "offers": rows}), 200
    except Exception as e:
        print("Error in /api/driver/offers:", e)
        return jsonify({"success": False, "error": str(e)}), 500

@driver_bp.route("/offers/<int:offer_id>/respond", methods=["POST"])
@require_auth
@require_role("D")
def respond_to_dispatch_offer(offer_id: int):
    """
    Driver accepts or rejects a dispatch offer.
    Calls dbo.usp_RespondToDispatchOffer.
    Body: { "action": "accept" | "reject" }
    """
    user_id = session["user_id"]
    data = request.get_json() or {}
    action = (data.get("action") or "").lower()

    if action not in ("accept", "reject"):
        return jsonify({"error": "action must be 'accept' or 'reject'"}), 400

    # Map to DB casing
    db_action = "Accept" if action == "accept" else "Reject"

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_RespondToDispatchOffer
                        @OfferId = ?,
                        @DriverUserId = ?,
                        @Action = ?
                    """,
                    offer_id,
                    user_id,
                    db_action,
                )

                updated = []
                if cur.description:
                    columns = [col[0] for col in cur.description]
                    updated = [dict(zip(columns, row)) for row in cur.fetchall()]

        return jsonify({"success": True, "offer": updated[0] if updated else None}), 200
    except Exception as e:
        print("Error in /driver/offers/<offer_id>/respond:", e)
        return jsonify({"success": False, "error": str(e)}), 500

@driver_bp.route("/rides/upcoming", methods=["GET"])
@require_auth
@require_role("D")
def get_upcoming_rides():
    driver_id = session["user_id"]

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("EXEC dbo.usp_Driver_GetUpcomingRides @DriverUserId = ?", (driver_id,))
            rows = cur.fetchall()

    rides = []
    for r in rows:
        rides.append({
            "RideId": r.RideId,
            "RequestId": r.RequestId,
            "LegId": r.LegId,
            "NumOfPeople": r.NumOfPeople,
            "Status": r.Status,
            "ScheduledStart": r.ScheduledStart.isoformat() if r.ScheduledStart else None,
            "ScheduledEnd": r.ScheduledEnd.isoformat() if r.ScheduledEnd else None,
            "FromName": r.FromName,
            "ToName": r.ToName,
        })

    return jsonify({"success": True, "rides": rides})


@driver_bp.route("/rides/<int:ride_id>/start", methods=["POST"])
@require_auth
@require_role("D")
def start_ride(ride_id: int):
    driver_id = session["user_id"]

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "EXEC dbo.usp_Driver_StartRide @DriverUserId = ?, @RideId = ?",
                    (driver_id, ride_id),
                )
                conn.commit()
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

    return jsonify({"success": True})


@driver_bp.route("/rides/<int:ride_id>/end", methods=["POST"])
@require_auth
@require_role("D")
def end_ride(ride_id: int):
    driver_id = session["user_id"]
    data = request.get_json(silent=True) or {}
    payment_method = data.get("payment_method", "Cash")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Driver_EndRide
                        @DriverUserId = ?,
                        @RideId       = ?,
                        @PaymentMethod = ?
                    """,
                    (driver_id, ride_id, payment_method),
                )
                conn.commit()
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

    return jsonify({"success": True})

@driver_bp.route("/rides/history", methods=["GET"])
@require_auth
@require_role("D")
def get_ride_history():
    """
    Return past rides for the logged-in driver.
    Wraps dbo.usp_Driver_GetRideHistory.
    """
    driver_id = session["user_id"]

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "EXEC dbo.usp_Driver_GetRideHistory @DriverUserId = ?",
                    (driver_id,),
                )
                rows = cur.fetchall()

        rides = []
        for r in rows:
            rides.append(
                {
                    "RideId": r.RideId,
                    "LegId": getattr(r, "LegId", None),
                    "RequestId": getattr(r, "RequestId", None),
                    "NumOfPeople": getattr(r, "NumOfPeople", None),
                    "Status": r.Status,
                    "FromName": r.FromName,
                    "ToName": r.ToName,
                    "StartedAt": (
                        r.StartedAt.isoformat()
                        if getattr(r, "StartedAt", None)
                        else None
                    ),
                    "EndedAt": (
                        r.EndedAt.isoformat()
                        if getattr(r, "EndedAt", None)
                        else None
                    ),
                    "PriceFinal": (
                        float(r.PriceFinal)
                        if getattr(r, "PriceFinal", None) is not None
                        else None
                    ),
                    "PaymentMethod": getattr(r, "PaymentMethod", None),
                    "PaymentStatus": getattr(r, "PaymentStatus", None),
                    "PaymentPaidAt": (
                        r.PaymentPaidAt.isoformat()
                        if getattr(r, "PaymentPaidAt", None)
                        else None
                    ),
                }
            )

        return jsonify({"success": True, "rides": rides}), 200
    except Exception as e:
        print("Error in /api/driver/rides/history:", e)
        return jsonify({"success": False, "error": str(e)}), 500

from datetime import datetime, date

@driver_bp.route("/availability", methods=["GET"])
@require_auth
@require_role("D")
def get_driver_daily_availability():
    """
    Get daily availability for the logged-in driver.

    Query param:
      ?date=YYYY-MM-DD (if missing, defaults to today)
    Response:
    {
      "success": true,
      "availability": {
        "date": "2025-12-01",
        "enabled": true/false,
        "startTime": "08:00" | null,
        "endTime":   "18:00" | null
      }
    }
    """
    user_id = session["user_id"]

    date_str = request.args.get("date")
    if not date_str:
        target_date = date.today()
        date_str = target_date.isoformat()
    else:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"success": False, "error": "Invalid date format. Use YYYY-MM-DD."}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Get one approved enrollment for this driver
                cur.execute(
                    """
                    SELECT TOP (1) EnrollId
                    FROM dbo.UserServiceEnrollment
                    WHERE UserId = ? AND Status = 'Approved'
                    ORDER BY EnrollId
                    """,
                    user_id,
                )
                row = cur.fetchone()

                if not row:
                    # No enrollment -> no availability yet
                    return jsonify({
                        "success": True,
                        "availability": {
                            "date": date_str,
                            "enabled": False,
                            "startTime": None,
                            "endTime": None,
                        },
                    }), 200

                enroll_id = row.EnrollId

                # Get existing availability for that date (if any)
                cur.execute(
                    """
                    SELECT TOP (1) StartsAt, EndsAt
                    FROM dbo.DriverAvailability
                    WHERE EnrollId = ? AND AvailabilityDate = ?
                    ORDER BY StartsAt
                    """,
                    (enroll_id, target_date),
                )
                avail = cur.fetchone()

        if not avail:
            availability = {
                "date": date_str,
                "enabled": False,
                "startTime": None,
                "endTime": None,
            }
        else:
            availability = {
                "date": date_str,
                "enabled": True,
                "startTime": avail.StartsAt.strftime("%H:%M"),
                "endTime": avail.EndsAt.strftime("%H:%M"),
            }

        return jsonify({"success": True, "availability": availability}), 200

    except Exception as e:
        print("Error in /api/driver/availability [GET]:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@driver_bp.route("/availability", methods=["PUT"])
@require_auth
@require_role("D")
def set_driver_daily_availability():
    """
    Set daily availability for the logged-in driver.

    Body:
    {
      "date": "2025-12-01",
      "enabled": true/false,
      "startTime": "08:00" | null,
      "endTime": "18:00"  | null
    }
    If enabled = false -> deletes any availability for that date.
    If enabled = true  -> upserts a single block using sp_AddDriverAvailability
                          with @IsRecurring = 0 (no weekly pattern).
    """
    user_id = session["user_id"]
    payload = request.get_json(silent=True) or {}

    date_str = payload.get("date")
    enabled = bool(payload.get("enabled", False))
    start_time = payload.get("startTime")
    end_time = payload.get("endTime")

    if not date_str:
        return jsonify({"success": False, "error": "date is required"}), 400

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"success": False, "error": "Invalid date format. Use YYYY-MM-DD."}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # 1. Get one approved enrollment for this driver
                cur.execute(
                    """
                    SELECT TOP (1) EnrollId
                    FROM dbo.UserServiceEnrollment
                    WHERE UserId = ? AND Status = 'Approved'
                    ORDER BY EnrollId
                    """,
                    user_id,
                )
                row = cur.fetchone()
                if not row:
                    return jsonify({"success": False, "error": "No approved enrollment found."}), 400

                enroll_id = row.EnrollId

                # 2. If disabling availability -> delete existing rows for that day
                if not enabled:
                    cur.execute(
                        """
                        DELETE FROM dbo.DriverAvailability
                        WHERE EnrollId = ? AND AvailabilityDate = ?
                        """,
                        (enroll_id, target_date),
                    )
                    conn.commit()
                    return jsonify({"success": True}), 200

                # 3. Validate times if enabling
                if not start_time or not end_time:
                    return jsonify({
                        "success": False,
                        "error": "startTime and endTime are required when enabled = true."
                    }), 400

                # 4. Choose a Geofence zone (for now: first ZoneId)
                cur.execute(
                    "SELECT TOP (1) ZoneId FROM dbo.Geofencezone ORDER BY ZoneId"
                )
                zone_row = cur.fetchone()
                if not zone_row:
                    return jsonify({
                        "success": False,
                        "error": "No Geofencezone configured in the system."
                    }), 400

                geofence_zone_id = zone_row.ZoneId

                # 5. Delete existing availability for that date & enroll
                cur.execute(
                    """
                    DELETE FROM dbo.DriverAvailability
                    WHERE EnrollId = ? AND AvailabilityDate = ?
                    """,
                    (enroll_id, target_date),
                )

                # 6. Insert new daily availability using existing sproc
                #    (no weekly recurrence)
                cur.execute(
                    """
                    EXEC dbo.sp_AddDriverAvailability
                        @EnrollId        = ?,
                        @AvailabilityDate = ?,
                        @GeofencezoneId  = ?,
                        @StartsAt        = ?,
                        @EndsAt          = ?,
                        @IsRecurring     = 0
                    """,
                    (
                        enroll_id,
                        target_date,
                        geofence_zone_id,
                        start_time,
                        end_time,
                    ),
                )

                conn.commit()

        return jsonify({"success": True}), 200

    except Exception as e:
        print("Error in /api/driver/availability [PUT]:", e)
        return jsonify({"success": False, "error": str(e)}), 500


# Get driver's vehicle location for ride
@driver_bp.route("/vehicle/location", methods=["POST"])
@require_auth
@require_role("D")
def update_vehicle_location():
    """
    Driver pushes their current vehicle location.
    Body:
    {
      "vehicleId": "<uuid>",
      "lat": 34.123456,
      "lng": 32.123456
    }

    Upserts into dbo.VehicleLocationLive.
    """
    user_id = session["user_id"]
    data = request.get_json(silent=True) or {}

    vehicle_id = data.get("vehicleId")
    lat = data.get("lat")
    lng = data.get("lng")

    if not vehicle_id or lat is None or lng is None:
        return jsonify({
            "success": False,
            "error": "vehicleId, lat and lng are required"
        }), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Upsert into VehicleLocationLive
                cur.execute(
                    """
                    MERGE dbo.VehicleLocationLive AS target
                    USING (VALUES (?, ?, ?)) AS src(VehicleId, Lat, Lng)
                        ON target.VehicleId = src.VehicleId
                    WHEN MATCHED THEN
                        UPDATE SET 
                            Lat = src.Lat,
                            Lng = src.Lng,
                            UpdatedAt = SYSUTCDATETIME()
                    WHEN NOT MATCHED THEN
                        INSERT (VehicleId, Lat, Lng, UpdatedAt)
                        VALUES (src.VehicleId, src.Lat, src.Lng, SYSUTCDATETIME());
                    """,
                    (vehicle_id, lat, lng),
                )
                conn.commit()

        return jsonify({"success": True}), 200
    except Exception as e:
        print("Error in /api/driver/vehicle/location:", e)
        return jsonify({"success": False, "error": str(e)}), 500
