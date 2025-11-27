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
        doc_number = request.form.get("docNumber") # Optional
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
                        @IssueDate = ?,
                        @ExpiryDate = ?
                    """,
                    vehicle_id,
                    doc_type,
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
