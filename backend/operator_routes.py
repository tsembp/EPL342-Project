from flask import Blueprint, jsonify, request, session
from db import get_connection
from decorators import require_auth, require_role

operator_bp = Blueprint("operator", __name__, url_prefix="/api/operator")


@operator_bp.route("/dashboard", methods=["GET"])
@require_auth
@require_role("O", "I")  # Operator or Inspector
def get_operator_dashboard():
    """Get operator dashboard - requires operator or inspector role"""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT COUNT(*) as PendingDocs 
                    FROM dbo.UserDocumentVerification 
                    WHERE VerificationStatusId = 1
                    """
                )
                row = cur.fetchone()
                return jsonify(
                    {
                        "pendingDocuments": row[0] if row else 0,
                        "operatorId": session["user_id"],
                    }
                ), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@operator_bp.route("/pending-person-documents", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_pending_person_documents():
    operator_id = session["user_id"]
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    EXEC dbo.usp_GetPendingPersonDocuments @OperatorId=?
                """, operator_id)
                columns = [column[0] for column in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]
                return jsonify(rows), 200
    except Exception as e:
        print("Error in pending-person-documents endpoint:", e)
        return jsonify({"error": str(e)}), 500


@operator_bp.route("/accepted-person-documents", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_accepted_person_documents():
    operator_id = session["user_id"]
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    EXEC dbo.usp_GetAcceptedPersonDocuments @OperatorId=?
                """, operator_id)
                columns = [column[0] for column in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]
                return jsonify(rows), 200
    except Exception as e:
        print("Error in accepted-person-documents endpoint:", e)
        return jsonify({"error": str(e)}), 500


@operator_bp.route("/rejected-person-documents", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_rejected_person_documents():
    operator_id = session["user_id"]
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    EXEC dbo.usp_GetRejectedPersonDocuments @OperatorId=?
                """, operator_id)
                columns = [column[0] for column in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]
                return jsonify(rows), 200
    except Exception as e:
        print("Error in rejected-person-documents endpoint:", e)
        return jsonify({"error": str(e)}), 500


@operator_bp.route("/pending-vehicle-documents", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_pending_vehicle_documents():
    """
    Returns ALL vehicle documents (Pending, Accepted, Rejected).
    Uses dbo.usp_GetVehicleDocumentsByStatus with @Status = NULL.
    Frontend filters by status tab.
    """
    operator_id = session["user_id"]
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_GetVehicleDocumentsByStatus
                        @OperatorId=?,
                        @Status=?
                    """,
                    (operator_id, None),
                )
                columns = [column[0] for column in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]
                return jsonify(rows), 200
    except Exception as e:
        print("Error in pending-vehicle-documents endpoint:", e)
        return jsonify({"error": str(e)}), 500


@operator_bp.route("/review-person-document", methods=["POST"])
@require_auth
@require_role("O", "I")
def review_person_document():
    data = request.get_json() or {}
    operator_id = session["user_id"]
    doc_id = data.get("docId")
    status = data.get("status")
    comment = data.get("comment", None)
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_ReviewPersonDocument 
                        @OperatorId=?, @DocId=?, @NewStatus=?, @ReviewComment=?
                    """,
                    (operator_id, doc_id, status, comment),
                )
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@operator_bp.route("/review-vehicle-document", methods=["POST"])
@require_auth
@require_role("O", "I")
def review_vehicle_document():
    data = request.get_json() or {}
    operator_id = session["user_id"]
    veh_doc_id = data.get("vehDocId")
    status = data.get("status")
    comment = data.get("comment", None)
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_ReviewVehicleDocument 
                        @OperatorId=?, @VehDocId=?, @NewStatus=?, @ReviewComments=?
                    """,
                    (operator_id, veh_doc_id, status, comment),
                )
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@operator_bp.route("/vehicles-overview", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_vehicles_overview():
    """
    Operator-side: fleet overview for all vehicles.
    Uses dbo.usp_Operator_GetVehiclesOverview.
    """
    operator_id = session["user_id"]
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "EXEC dbo.usp_Operator_GetVehiclesOverview @OperatorId=?",
                    operator_id,
                )
                columns = [col[0] for col in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]
        return jsonify(rows), 200
    except Exception as e:
        print("Error in /vehicles-overview:", e)
        return jsonify({"error": str(e)}), 500


@operator_bp.route("/service-enrollments", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_service_enrollments():
    """
    Operator-side: list all service enrollments.
    Uses dbo.usp_GetServiceEnrollmentsForReview.
    """
    operator_id = session["user_id"]
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_GetServiceEnrollmentsForReview @OperatorId=?
                    """,
                    operator_id,
                )
                columns = [col[0] for col in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]
        return jsonify(rows), 200
    except Exception as e:
        print("Error in /service-enrollments:", e)
        return jsonify({"error": str(e)}), 500


@operator_bp.route("/service-enroll/review", methods=["POST"])
@require_auth
@require_role("O", "I")
def review_service_enrollment():
    data = request.get_json(silent=True) or {}

    enroll_id = data.get("enrollId")
    status = data.get("status")
    comment = data.get("comment") or ""

    if not enroll_id or status not in ("Approved", "Rejected"):
        return jsonify({"error": "enrollId and valid status are required"}), 400

    operator_id = session["user_id"]   # or however you store authenticated user

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_ReviewServiceEnrollment
                        @OperatorId = ?,
                        @EnrollmentId = ?,
                        @NewStatus   = ?,
                        @ReviewComment = ?
                    """,
                    (operator_id, enroll_id, status, comment),
                )
                conn.commit()

        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@operator_bp.route("/service-types", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_service_types():
    """
    Returns all service types so the operator can view them in the dashboard.
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("EXEC dbo.usp_GetServiceTypes")
                columns = [col[0] for col in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]
        return jsonify(rows), 200
    except Exception as e:
        print("Error in /service-types:", e)
        return jsonify({"error": str(e)}), 500


@operator_bp.route("/service-types", methods=["POST"])
@require_auth
@require_role("O", "I")
def create_service_type():
    data = request.get_json(force=True) or {}
    name = data.get("name")
    description = data.get("description")
    base_fare = data.get("baseFare")
    per_km = data.get("perKm")
    per_min = data.get("perMin")
    valid_from = data.get("validFrom")  # optional, ISO string ή None
    valid_to = data.get("validTo")      # optional
    active = data.get("active", True)

    # basic validation
    if not name:
        return jsonify({"error": "Name is required"}), 400
    if not description:
        return jsonify({"error": "Description is required"}), 400
    if base_fare is None or per_km is None or per_min is None:
        return jsonify(
            {"error": "BaseFare, PerKm and PerMin are required"}
        ), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Operator_CreateServiceType
                        @Name=?,
                        @Description=?,
                        @BaseFare=?,
                        @PerKm=?,
                        @PerMin=?,
                        @ValidFrom=?,
                        @ValidTo=?,
                        @Active=?;
                    """,
                    (
                        name,
                        description,
                        base_fare,
                        per_km,
                        per_min,
                        valid_from,
                        valid_to,
                        1 if active else 0,
                    ),
                )
                cols = [c[0] for c in cur.description]
                row = dict(zip(cols, cur.fetchone()))
        return jsonify(row), 201
    except Exception as e:
        print("Error in create_service_type:", e)
        return jsonify({"error": "Failed to create service type"}), 500


@operator_bp.route("/service-types/<int:service_type_id>", methods=["PUT"])
@require_auth
@require_role("O", "I")
def update_service_type(service_type_id):
    data = request.get_json(force=True) or {}
    name = data.get("name")
    description = data.get("description")
    active = data.get("active", True)

    base_fare = data.get("baseFare")
    per_km = data.get("perKm")
    per_min = data.get("perMin")

    if not name:
        return jsonify({"error": "Name is required"}), 400
    if not description:
        return jsonify({"error": "Description is required"}), 400
    if base_fare is None or per_km is None or per_min is None:
        return jsonify(
            {"error": "BaseFare, PerKm and PerMin are required"}
        ), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Operator_UpdateServiceType
                        @ServiceTypeId=?,
                        @Name=?,
                        @Description=?,
                        @BaseFare=?,
                        @PerKm=?,
                        @PerMin=?,
                        @Active=?;
                    """,
                    (
                        service_type_id,
                        name,
                        description,
                        base_fare,
                        per_km,
                        per_min,
                        1 if active else 0,
                    ),
                )
                cols = [c[0] for c in cur.description]
                row = dict(zip(cols, cur.fetchone()))
        return jsonify(row), 200
    except Exception as e:
        print("Error in update_service_type:", e)
        return jsonify({"error": "Failed to update service type"}), 500


@operator_bp.route("/allowed-ride-profiles", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_allowed_ride_profiles():
    """
    Returns all allowed ride profiles (ServiceType x RideType x VehicleType).
    Adjust column names if your table uses different ones.
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("EXEC dbo.usp_Operator_GetAllowedRideProfiles")
                columns = [col[0] for col in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]
        return jsonify(rows), 200
    except Exception as e:
        print("Error in /allowed-ride-profiles:", e)
        return jsonify({"error": str(e)}), 500


@operator_bp.route("/allowed-ride-profiles", methods=["POST"])
@require_auth
@require_role("O", "I")
def create_allowed_ride_profile():
    data = request.get_json(force=True) or {}

    service_type_id = data.get("serviceTypeId")
    ride_type_id = data.get("rideTypeId")
    vehicle_type_id = data.get("vehicleTypeId")
    profile_name = data.get("profileName")

    if service_type_id is None or ride_type_id is None or vehicle_type_id is None:
        return jsonify(
            {"error": "serviceTypeId, rideTypeId and vehicleTypeId are required"}
        ), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Operator_CreateAllowedRideProfile
                        @ServiceTypeId=?,
                        @RideTypeId=?,
                        @VehicleTypeId=?,
                        @ProfileName=?;
                    """,
                    (service_type_id, ride_type_id, vehicle_type_id, profile_name),
                )
                cols = [c[0] for c in cur.description]
                row = dict(zip(cols, cur.fetchone()))
        return jsonify(row), 201
    except Exception as e:
        print("Error in create_allowed_ride_profile:", e)
        return jsonify({"error": "Failed to create allowed ride profile"}), 500


@operator_bp.route("/allowed-ride-profiles/<ride_profile_id>", methods=["PUT"])
@require_auth
@require_role("O", "I")
def update_allowed_ride_profile(ride_profile_id):
    data = request.get_json(force=True) or {}

    service_type_id = data.get("serviceTypeId")
    ride_type_id = data.get("rideTypeId")
    vehicle_type_id = data.get("vehicleTypeId")
    profile_name = data.get("profileName")

    if service_type_id is None or ride_type_id is None or vehicle_type_id is None:
        return jsonify(
            {"error": "serviceTypeId, rideTypeId and vehicleTypeId are required"}
        ), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Operator_UpdateAllowedRideProfile
                        @RideProfileId=?,
                        @ServiceTypeId=?,
                        @RideTypeId=?,
                        @VehicleTypeId=?,
                        @ProfileName=?;
                    """,
                    (
                        ride_profile_id,  # string GUID, SQL Server will cast to UNIQUEIDENTIFIER
                        service_type_id,
                        ride_type_id,
                        vehicle_type_id,
                        profile_name,
                    ),
                )
                cols = [c[0] for c in cur.description]
                row = dict(zip(cols, cur.fetchone()))
        return jsonify(row), 200
    except Exception as e:
        print("Error in update_allowed_ride_profile:", e)
        return jsonify(
            {"error": "Failed to update allowed ride profile"}
        ), 500
