from datetime import date, datetime
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

@driver_bp.route("/vehicle-types", methods=["GET"])
@require_auth
@require_role("D")
def get_vehicle_types():
    """
    Retrieve all available vehicle types.
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT VehicleTypeId, Type, Description FROM dbo.VehicleType")
                rows = cur.fetchall()
                if rows:
                    columns = [column[0] for column in cur.description]
                    vehicle_types = [dict(zip(columns, row)) for row in rows]
                    return jsonify(vehicle_types), 200
                return jsonify([]), 200 # Return empty array if no vehicle types found
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@driver_bp.route("/add-vehicle", methods=["POST"])
@require_auth
@require_role("D")
def add_vehicle():
    """
    Driver-side: add a new vehicle.
    Calls dbo.usp_AddVehicle.
    """
    user_id = session["user_id"]
    data = request.get_json() or {}

    vehicle_type_id = data.get("vehicleTypeId")
    plate_number = data.get("plateNumber")
    brand = data.get("brand")
    model = data.get("model")
    color = data.get("color")
    seats = data.get("seats")
    cargo_volume = data.get("cargoVolume", 0)
    cargo_weight = data.get("cargoWeight", 0)

    if not all([vehicle_type_id, plate_number, brand, model, color, seats]):
        return jsonify({"error": "Missing required vehicle fields"}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_AddVehicle
                        @OwnerUserId = ?,
                        @VehicleTypeId = ?,
                        @PlateNumber = ?,
                        @Brand = ?,
                        @Model = ?,
                        @Color = ?,
                        @Seats = ?,
                        @CargoVolume = ?,
                        @CargoWeight = ?
                    """,
                    user_id,
                    vehicle_type_id,
                    plate_number,
                    brand,
                    model,
                    color,
                    seats,
                    cargo_volume,
                    cargo_weight,
                )
                row = cur.fetchone()
                if row:
                    return jsonify({"success": True, "vehicleId": str(row[0])}), 201
                else:
                    return jsonify({"success": False, "error": "Failed to add vehicle"}), 400
    except Exception as e:
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

@driver_bp.route("/vehicle-documents", methods=["POST"])
@require_auth
@require_role("D")
def upload_vehicle_document():
    """
    Handles vehicle document uploads for a given vehicle owned by the driver.
    Calls the dbo.usp_AddVehicleDocument stored procedure.
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        # Extract data from the form
        vehicle_id = request.form.get("vehicleId")
        doc_type = request.form.get("docType")
        doc_number = request.form.get("docNumber") # This is now passed to SP
        issue_date = request.form.get("issueDate")
        expiry_date = request.form.get("expiryDate") # Optional

        # Basic validation
        if not all([vehicle_id, doc_type, issue_date]):
            return jsonify({"error": "Missing required form fields (vehicleId, docType, issueDate)"}), 400

        # Ensure the vehicle belongs to the authenticated driver
        user_id = session["user_id"]
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT OwnerUserId FROM dbo.Vehicle WHERE VehicleId = ?", vehicle_id)
                owner_id_row = cur.fetchone()
                if not owner_id_row or str(owner_id_row[0]) != user_id:
                    return jsonify({"error": "Vehicle not found or does not belong to the current driver"}), 403

                cur.execute(
                    """
                    EXEC dbo.usp_AddVehicleDocument
                        @VehicleId = ?,
                        @DocType = ?,
                        @DocNo = ?,
                        @IssueDate = ?,
                        @ExpiryDate = ?
                    """,
                    vehicle_id,
                    doc_type,
                    doc_number,
                    issue_date,
                    expiry_date,
                )
                
                row = cur.fetchone()
                if row and row[0]:
                    return jsonify({"success": True, "vehDocId": row[0]}), 201
                else:
                    return jsonify({"success": True, "message": "Vehicle document processed."}), 200

    except Exception as e:
        print(f"Error in /vehicle-documents endpoint: {e}")
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



@driver_bp.route("/vehicle-documents-status", methods=["GET"])
@require_auth
@require_role("D")
def get_vehicle_documents_status():
    """
    Retrieve the status of all documents for a given vehicle.
    Calls dbo.usp_GetVehicleDocumentStatus.
    """
    vehicle_id = request.args.get("vehicleId")
    if not vehicle_id:
        return jsonify({"error": "Vehicle ID is required"}), 400

    user_id = session["user_id"]
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # First, verify the vehicle belongs to the authenticated driver
                cur.execute("SELECT OwnerUserId FROM dbo.Vehicle WHERE VehicleId = ?", vehicle_id)
                owner_id_row = cur.fetchone()
                if not owner_id_row or str(owner_id_row[0]) != user_id:
                    return jsonify({"error": "Vehicle not found or does not belong to the current driver"}), 403

                cur.execute(
                    """
                    EXEC dbo.usp_GetVehicleDocumentStatus @VehicleId = ?
                    """,
                    vehicle_id,
                )
                rows = cur.fetchall()
                if rows:
                    columns = [column[0] for column in cur.description]
                    documents = [dict(zip(columns, row)) for row in rows]
                    return jsonify(documents), 200
                return jsonify([]), 200 # Return empty array if no documents found
    except Exception as e:
        print(f"Error in /vehicle-documents-status endpoint: {e}")
        return jsonify({"error": str(e)}), 500
    
@driver_bp.route("/service-enrollments", methods=["GET"])
@require_auth
@require_role("D")
def get_driver_service_enrollments():
    """
    Driver-side: list this driver's APPROVED service enrollments.

    Returns:
    {
      "success": true,
      "enrollments": [
        {
          "EnrollId": 1,
          "Status": "Approved",
          "VehiclePlate": "KAA123",
          "ServiceTypeId": 2,
          "ServiceTypeName": "Taxi",
          "RideTypeId": 1,
          "RideTypeName": "With Driver"
        },
        ...
      ]
    }
    """
    user_id = session["user_id"]

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        SE.EnrollId,
                        SE.Status,
                        V.PlateNumber AS VehiclePlate,
                        ST.ServiceTypeId,
                        ST.Name        AS ServiceTypeName,
                        RT.RideTypeId,
                        RT.Name        AS RideTypeName
                    FROM dbo.UserServiceEnrollment AS SE
                    JOIN dbo.Vehicle      AS V  ON SE.VehicleId  = V.VehicleId
                    JOIN dbo.ServiceType  AS ST ON SE.ServiceType = ST.ServiceTypeId
                    JOIN dbo.RideType     AS RT ON SE.RideType   = RT.RideTypeId
                    WHERE SE.UserId = ? AND SE.Status = 'Approved'
                    ORDER BY SE.EnrollId
                    """,
                    (user_id,),
                )
                rows = cur.fetchall()
                columns = [col[0] for col in cur.description]
                enrollments = [dict(zip(columns, row)) for row in rows]

        return jsonify({"success": True, "enrollments": enrollments}), 200
    except Exception as e:
        print("Error in /service-enrollments:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    
@driver_bp.route("/vehicles", methods=["GET"])
@require_auth
@require_role("D")
def get_driver_vehicles():
    """
    Retrieve all vehicles for the authenticated driver.
    Calls dbo.usp_GetDriverVehicles.
    """
    user_id = session["user_id"]
    
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_GetDriverVehicles @UserId = ?
                    """,
                    user_id,
                )
                rows = cur.fetchall()
                if rows:
                    columns = [column[0] for column in cur.description]
                    vehicles = [dict(zip(columns, row)) for row in rows]
                    return jsonify(vehicles), 200
                return jsonify([]), 200 # Return empty array if no vehicles found
    except Exception as e:
        print(f"Error in /vehicles endpoint: {e}")
        return jsonify({"error": str(e)}), 500
    

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
            "FromLat": float(r.FromLat) if getattr(r, "FromLat", None) is not None else None,
            "FromLng": float(r.FromLng) if getattr(r, "FromLng", None) is not None else None,
            "ToLat":   float(r.ToLat)   if getattr(r, "ToLat", None)   is not None else None,
            "ToLng":   float(r.ToLng)   if getattr(r, "ToLng", None)   is not None else None,
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
                    "PaymentGrossAmount": (
                        float(r.PaymentGrossAmount)
                        if getattr(r, "PaymentGrossAmount", None) is not None
                        else None
                    ),
                    "PaymentOsrhFee": (
                        float(r.PaymentOsrhFee)
                        if getattr(r, "PaymentOsrhFee", None) is not None
                        else None
                    ),
                    "PaymentDriverPayout": (
                        float(r.PaymentDriverPayout)
                        if getattr(r, "PaymentDriverPayout", None) is not None
                        else None
                    ),
                }
            )

        return jsonify({"success": True, "rides": rides}), 200
    except Exception as e:
        print("Error in /api/driver/rides/history:", e)
        return jsonify({"success": False, "error": str(e)}), 500

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
        "date": "2025-11-30",
        "enabled": true/false,
        "enrollId": 123 | null,
        "startTime": "08:00" | null,
        "endTime": "18:00" | null,
        "locked": true/false
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
            return (
                jsonify({"success": False, "error": "Invalid date format. Use YYYY-MM-DD."}),
                400,
            )

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Driver_GetDailyAvailability
                        @DriverUserId = ?,
                        @Date         = ?
                    """,
                    (user_id, target_date),
                )
                row = cur.fetchone()

        if not row:
            availability = {
                "date": date_str,
                "enabled": False,
                "enrollId": None,
                "startTime": None,
                "endTime": None,
                "locked": False,
            }
        else:
            availability = {
                "date": date_str,
                "enabled": True,
                "enrollId": row.EnrollId,
                "startTime": row.StartsAt.strftime("%H:%M"),
                "endTime": row.EndsAt.strftime("%H:%M"),
                "locked": bool(row.IsLocked),
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
      "date": "2025-11-30",
      "enabled": true/false,
      "enrollId": 123 | null,
      "startTime": "08:00" | null,
      "endTime": "18:00" | null
    }
    """
    user_id = session["user_id"]
    payload = request.get_json(silent=True) or {}

    date_str = payload.get("date")
    enabled = bool(payload.get("enabled", False))
    enroll_id = payload.get("enrollId")
    start_time = payload.get("startTime")
    end_time = payload.get("endTime")

    if not date_str:
        return jsonify({"success": False, "error": "date is required"}), 400

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return (
            jsonify({"success": False, "error": "Invalid date format. Use YYYY-MM-DD."}),
            400,
        )

    # Convert times to TIME(0) compatible Python objects when enabled
    starts_at = None
    ends_at = None
    if enabled:
        if start_time:
            try:
                starts_at = datetime.strptime(start_time, "%H:%M").time().replace(microsecond=0)
            except ValueError:
                return (
                    jsonify({"success": False, "error": "Invalid startTime format. Use HH:MM."}),
                    400,
                )
        if end_time:
            try:
                ends_at = datetime.strptime(end_time, "%H:%M").time().replace(microsecond=0)
            except ValueError:
                return (
                    jsonify({"success": False, "error": "Invalid endTime format. Use HH:MM."}),
                    400,
                )

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Driver_SetDailyAvailability
                        @DriverUserId = ?,
                        @Date         = ?,
                        @Enabled      = ?,
                        @EnrollId     = ?,
                        @StartsAt     = ?,
                        @EndsAt       = ?
                    """,
                    (
                        user_id,
                        target_date,
                        1 if enabled else 0,
                        enroll_id,
                        starts_at,
                        ends_at,
                    ),
                )
                conn.commit()

        return jsonify({"success": True}), 200

    except Exception as e:
        print("Error in /api/driver/availability [PUT]:", e)
        # THROW from SQL will come through here as an error message
        return jsonify({"success": False, "error": str(e)}), 400

@driver_bp.route("/service-enrollments/<int:enroll_id>/cancel", methods=["POST"])
@require_auth
@require_role("D")
def cancel_driver_service_enrollment(enroll_id: int):
  """
  Driver cancels (withdraws) their own service enrollment.

  Rules:
  - Only the owner (UserId) can cancel.
  - Only allowed when Status = 'Pending'.
  - Once enrollment is Approved or Rejected, it cannot be cancelled by the driver.
  - For simplicity, we DELETE the pending enrollment row.
  """
  user_id = session["user_id"]

  try:
    with get_connection() as conn:
      with conn.cursor() as cur:
        # 1. Fetch enrollment for this driver
        cur.execute(
          """
          SELECT Status
          FROM dbo.UserServiceEnrollment
          WHERE EnrollId = ? AND UserId = ?
          """,
          (enroll_id, user_id),
        )
        row = cur.fetchone()

        if not row:
          return (
            jsonify(
              {
                "success": False,
                "error": "Enrollment not found for this driver.",
              }
            ),
            404,
          )

        status = row.Status

        # 2. Only pending can be cancelled
        if status != "Pending":
          # "Confirmed" = Approved (or already reviewed)
          return (
            jsonify(
              {
                "success": False,
                "error": "This enrollment has already been reviewed and cannot be cancelled.",
              }
            ),
            400,
          )

        # 3. Safe to delete pending enrollment
        cur.execute(
          """
          DELETE FROM dbo.UserServiceEnrollment
          WHERE EnrollId = ? AND UserId = ? AND Status = 'Pending'
          """,
          (enroll_id, user_id),
        )

        conn.commit()

    return jsonify({"success": True}), 200

  except Exception as e:
    print("Error in cancel_driver_service_enrollment:", e)
    return jsonify({"success": False, "error": str(e)}), 500
  
@driver_bp.route("/availability/confirm", methods=["POST"])
@require_auth
@require_role("D")
def confirm_driver_daily_availability():
    """
    Confirm today's (or given date's) availability for the logged-in driver.
    Once confirmed, changes are blocked in the sproc.
    
    Body: { "date": "YYYY-MM-DD" } // optional, defaults to today
    """
    user_id = session["user_id"]
    payload = request.get_json(silent=True) or {}
    date_str = payload.get("date")

    if not date_str:
        target_date = date.today()
        date_str = target_date.isoformat()
    else:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return (
                jsonify({"success": False, "error": "Invalid date format. Use YYYY-MM-DD."}),
                400,
            )

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Driver_ConfirmDailyAvailability
                        @DriverUserId = ?,
                        @Date         = ?
                    """,
                    (user_id, target_date),
                )
                conn.commit()

        return jsonify({"success": True}), 200

    except Exception as e:
        print("Error in /api/driver/availability/confirm:", e)
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

@driver_bp.route("/rides/<int:ride_id>/messages", methods=["GET"])
@require_auth
@require_role("D")
def get_ride_messages_for_driver(ride_id: int):
    """
    Get in-app chat messages for a ride (driver view).
    Wraps dbo.usp_GetMessage.
    """
    user_id = session["user_id"]

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Ensure ride exists and get participants
                passenger_user_id, driver_user_id = get_ride_participants(cur, ride_id)
                if not passenger_user_id or not driver_user_id:
                    return jsonify({"success": False, "error": "Ride not found"}), 404

                # Make sure the logged-in driver is one of the participants
                if str(user_id) not in (str(passenger_user_id), str(driver_user_id)):
                    return jsonify({"success": False, "error": "Not a participant of this ride"}), 403

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
        print("Error in /api/driver/rides/<ride_id>/messages [GET]:", e)
        return jsonify({"success": False, "error": str(e)}), 400


@driver_bp.route("/rides/<int:ride_id>/messages", methods=["POST"])
@require_auth
@require_role("D")
def send_ride_message_for_driver(ride_id: int):
    """
    Send a new in-app message from the driver (or passenger if ever reused).
    Wraps dbo.usp_SendMessage.
    """
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

                # Logged-in user must be a participant
                if str(user_id) not in (str(passenger_user_id), str(driver_user_id)):
                    return jsonify({"success": False, "error": "Not a participant of this ride"}), 403

                # Decide recipient
                if str(user_id) == str(driver_user_id):
                    recipient_id = passenger_user_id
                else:
                    recipient_id = driver_user_id

                cur.execute(
                    "EXEC dbo.usp_SendMessage ?, ?, ?, ?",
                    user_id,
                    recipient_id,
                    ride_id,
                    text,
                )

                inserted = cur.fetchone()
                conn.commit()

        msg_id = inserted.MsgId
        sent_at = inserted.SentAt.isoformat() if inserted.SentAt else None

        return jsonify(
            {
                "success": True,
                "message": {
                    "msgId": msg_id,
                    "body": text,
                    "sentAt": sent_at,
                    "isMine": True,
                },
            }
        ), 200

    except Exception as e:
        print("Error in /api/driver/rides/<ride_id>/messages [POST]:", e)
        return jsonify({"success": False, "error": str(e)}), 400
      

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
