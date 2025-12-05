from flask import Blueprint, jsonify, request, session
from db import get_connection
from decorators import require_auth, require_role

operator_bp = Blueprint("operator", __name__, url_prefix="/api/operator")


@operator_bp.route("/dashboard", methods=["GET"])
@require_auth
@require_role("O", "I")  # Operator or Inspector
def get_operator_dashboard():
    """Get operator dashboard with comprehensive metrics"""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Pending person documents
                cur.execute(
                    """
                    SELECT COUNT(*) 
                    FROM dbo.PersonDocument 
                    WHERE Status = 'Pending'
                    """
                )
                pending_person_docs = cur.fetchone()[0] or 0
                
                # Pending vehicle documents
                cur.execute(
                    """
                    SELECT COUNT(*) 
                    FROM dbo.VehicleDocument 
                    WHERE Status = 'Pending'
                    """
                )
                pending_vehicle_docs = cur.fetchone()[0] or 0
                
                # Pending service enrollments
                cur.execute(
                    """
                    SELECT COUNT(*) 
                    FROM dbo.UserServiceEnrollment 
                    WHERE Status = 'Pending'
                    """
                )
                pending_enrollments = cur.fetchone()[0] or 0
                
                # Pending GDPR requests
                cur.execute(
                    """
                    SELECT COUNT(*) 
                    FROM dbo.GdprRequest 
                    WHERE Status IN ('Pending', 'Under-Review')
                    """
                )
                pending_gdpr = cur.fetchone()[0] or 0
                
                # Active rides (ongoing rides)
                cur.execute(
                    """
                    SELECT COUNT(*) 
                    FROM dbo.Ride 
                    WHERE Status = 'InProgress'
                    """
                )
                active_rides = cur.fetchone()[0] or 0
                
                # Recent activity (last 10 verification actions from person documents)
                cur.execute(
                    """
                    SELECT TOP 10 
                        'Document ' + pd.Status as ActionType,
                        COALESCE(u.FirstName + ' ' + u.LastName, 'Unknown User') as UserName,
                        DATEDIFF(MINUTE, COALESCE(pd.ReviewedAt, pd.UploadedAt), GETUTCDATE()) as MinutesAgo
                    FROM dbo.PersonDocument pd
                    LEFT JOIN dbo.[User] u ON pd.UserId = u.UserId
                    WHERE pd.ReviewedAt IS NOT NULL
                    ORDER BY pd.ReviewedAt DESC
                    """
                )
                activities = []
                for row in cur.fetchall():
                    action_type, user_name, minutes_ago = row
                    if minutes_ago < 60:
                        time_str = f"{minutes_ago}m ago"
                    elif minutes_ago < 1440:
                        time_str = f"{minutes_ago // 60}h ago"
                    else:
                        time_str = f"{minutes_ago // 1440}d ago"
                    activities.append({
                        "type": action_type,
                        "user": user_name,
                        "time": time_str
                    })
                
                return jsonify(
                    {
                        "pendingPersonDocuments": pending_person_docs,
                        "pendingVehicleDocuments": pending_vehicle_docs,
                        "pendingEnrollments": pending_enrollments,
                        "pendingGdpr": pending_gdpr,
                        "activeRides": active_rides,
                        "recentActivity": activities,
                        "operatorId": session["user_id"],
                    }
                ), 200
    except Exception as e:
        print("Error in dashboard:", e)
        return jsonify({"error": str(e)}), 500
    
@operator_bp.route("/pending-vehicle-documents", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_pending_vehicle_documents():

    operator_id = session["user_id"]
    vehicle_id = request.args.get("vehicleId")  # optional query param

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_GetVehicleDocumentsByStatus
                        @OperatorId = ?,
                        @Status     = ?
                    """,
                    (operator_id, None),
                )
                columns = [column[0] for column in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]

        # Optional filter by VehicleId (done in Python, no sproc change needed)
        if vehicle_id:
            key_candidates = ["VehicleId", "VehId", "Id"]

            def matches_vehicle(r: dict) -> bool:
                for k in key_candidates:
                    if k in r and str(r[k]) == str(vehicle_id):
                        return True
                return False

            rows = [r for r in rows if matches_vehicle(r)]

        return jsonify(rows), 200

    except Exception as e:
        print("Error in pending-vehicle-documents endpoint:", e)
        return jsonify({"error": str(e)}), 500


@operator_bp.route("/pending-person-documents", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_pending_person_documents():

    operator_id = session["user_id"]

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_GetPersonDocumentsByStatus
                        @OperatorId = ?,
                        @Status     = ?
                    """,
                    (operator_id, 'Pending'),
                )
                columns = [column[0] for column in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]

        return jsonify(rows), 200

    except Exception as e:
        print("Error in pending-vehicle-documents endpoint:", e)
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


@operator_bp.route("/vehicle-documents", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_vehicle_documents():

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
    valid_from = data.get("validFrom")  # optional, ISO string ή None
    valid_to = data.get("validTo")      # optional
    active = data.get("active", True)

    # basic validation
    if not name:
        return jsonify({"error": "Name is required"}), 400
    if not description:
        return jsonify({"error": "Description is required"}), 400
    if base_fare is None:
        return jsonify(
            {"error": "BaseFare is required"}
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
                        @ValidFrom=?,
                        @ValidTo=?,
                        @Active=?;
                    """,
                    (
                        name,
                        description,
                        base_fare,
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

    if not name:
        return jsonify({"error": "Name is required"}), 400
    if not description:
        return jsonify({"error": "Description is required"}), 400
    if base_fare is None:
        return jsonify(
            {"error": "BaseFare is required"}
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
                        @Active=?;
                    """,
                    (
                        service_type_id,
                        name,
                        description,
                        base_fare,
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
        print(f"Error in create_allowed_ride_profile: {e}")
        print(f"Data received: serviceTypeId={service_type_id}, rideTypeId={ride_type_id}, vehicleTypeId={vehicle_type_id}, profileName={profile_name}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to create allowed ride profile: {str(e)}"}), 500


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

@operator_bp.route("/ride-types", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_ride_types():
    """
    Returns all ride types.
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("EXEC dbo.usp_GetRideTypes")
                columns = [col[0] for col in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]
        return jsonify(rows), 200
    except Exception as e:
        print("Error in /ride-types:", e)
        return jsonify({"error": str(e)}), 500

@operator_bp.route("/vehicle-types", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_vehicle_types():
    """
    Returns all vehicle types.
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("EXEC dbo.usp_GetVehicleTypes")
                columns = [col[0] for col in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]
        return jsonify(rows), 200
    except Exception as e:
        print("Error in /vehicle-types:", e)
        return jsonify({"error": str(e)}), 500

@operator_bp.route("/gdpr-requests", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_gdpr_requests():
    """
    Operator-side: list pending/under-review GDPR requests.
    We filter to DataCorrection by default.
    """
    # Optional query param ?type=DataCorrection
    type_filter = request.args.get("type") or "DataCorrection"

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                if type_filter:
                    cur.execute(
                        """
                        EXEC dbo.usp_Gdpr_GetPendingRequests
                        """
                    )
                else:
                    cur.execute("EXEC dbo.usp_Gdpr_GetPendingRequests")

                columns = [c[0] for c in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]

        return jsonify(rows), 200
    except Exception as e:
        print("Error in /gdpr-requests:", e)
        return jsonify({"error": "Failed to load GDPR requests"}), 500

@operator_bp.route("/review-gdpr-request", methods=["POST"])
@require_auth
@require_role("O", "I")
def review_gdpr_request():
    """
    Operator-side: resolve a GDPR DataCorrection request.
    Body: { "gdprId": 1, "status": "Completed" | "Denied", "note": "..." }
    """
    data = request.get_json(silent=True) or {}
    operator_id = session["user_id"]

    gdpr_id = data.get("gdprId")
    status = data.get("status")
    note = (data.get("note") or "").strip()

    if not gdpr_id or status not in ("Completed", "Denied"):
        return jsonify({"error": "gdprId and valid status ('Completed' | 'Denied') are required"}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Gdpr_ResolveDataCorrection
                        @GdprId       = ?,
                        @ActorAdminId = ?,
                        @NewStatus    = ?,
                        @ActorNote    = ?
                    """,
                    (gdpr_id, operator_id, status, note),
                )
                conn.commit()

        return jsonify({"success": True}), 200
    except Exception as e:
        print("Error in /review-gdpr-request:", e)
        return jsonify({"error": "Failed to update GDPR request"}), 500


# Reports endpoints

# Avg cost by category report
@operator_bp.route("/reports/average-cost-by-category", methods=["GET"])
@require_auth
@require_role("O", "I")
def report_average_cost_by_category():
    """
    Runs dbo.usp_Report_AverageCostByCategory and returns the result set as JSON.
    Query params:
      fromDate, toDate, frequency, serviceTypeId, rideStatus, paymentStatus,
      pickupZoneId, dropoffZoneId
    """
    # Helpers to parse optional params
    def to_int(name):
        val = request.args.get(name)
        if val is None or val == "":
            return None
        try:
            return int(val)
        except ValueError:
            return None

    def to_str(name, default=None):
        val = request.args.get(name)
        if val is None or val == "":
            return default
        return val

    from_date = request.args.get("fromDate") or None
    to_date = request.args.get("toDate") or None
    frequency = to_str("frequency", None)
    service_type_id = to_int("serviceTypeId")
    # Keep the stored procedure defaults ("Completed") unless client overrides
    ride_status = to_str("rideStatus", "Completed")
    payment_status = to_str("paymentStatus", "Completed")
    pickup_zone_id = to_int("pickupZoneId")
    dropoff_zone_id = to_int("dropoffZoneId")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Report_AverageCostByCategory
                        @FromDate      = ?,
                        @ToDate        = ?,
                        @Frequency     = ?,
                        @ServiceTypeId = ?,
                        @RideStatus    = ?,
                        @PaymentStatus = ?,
                        @PickupZoneId  = ?,
                        @DropoffZoneId = ?
                    """,
                    (
                        from_date,
                        to_date,
                        frequency,
                        service_type_id,
                        ride_status,
                        payment_status,
                        pickup_zone_id,
                        dropoff_zone_id,
                    ),
                )
                columns = [c[0] for c in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]

        return jsonify(rows), 200

    except Exception as e:
        print("Error in /reports/average-cost-by-category:", e)
        return jsonify({"error": "Failed to load average cost report"}), 500


# High/Low cost tripts report
@operator_bp.route("/reports/high-low-cost-trips", methods=["GET"])
@require_auth
@require_role("O", "I")
def report_high_low_cost_trips():
    """
    Runs dbo.usp_Report_HighLowCostTrips and returns the result set as JSON.
    Query params:
      fromDate, toDate, serviceTypeId, rideStatus, paymentStatus,
      pickupZoneId, dropoffZoneId, topN
    """
    def to_int(name, default=None):
        val = request.args.get(name)
        if val is None or val == "":
            return default
        try:
            return int(val)
        except ValueError:
            return default

    def to_str(name, default=None):
        val = request.args.get(name)
        if val is None or val == "":
            return default
        return val

    from_date = request.args.get("fromDate") or None
    to_date = request.args.get("toDate") or None
    service_type_id = to_int("serviceTypeId")
    ride_status = to_str("rideStatus", "Completed")
    payment_status = to_str("paymentStatus", "Completed")
    pickup_zone_id = to_int("pickupZoneId")
    dropoff_zone_id = to_int("dropoffZoneId")
    top_n = to_int("topN", 10)

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Report_HighLowCostTrips
                        @FromDate      = ?,
                        @ToDate        = ?,
                        @ServiceTypeId = ?,
                        @RideStatus    = ?,
                        @PaymentStatus = ?,
                        @PickupZoneId  = ?,
                        @DropoffZoneId = ?,
                        @TopN          = ?
                    """,
                    (
                        from_date,
                        to_date,
                        service_type_id,
                        ride_status,
                        payment_status,
                        pickup_zone_id,
                        dropoff_zone_id,
                        top_n,  # default to 10
                    ),
                )
                columns = [c[0] for c in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]

        return jsonify(rows), 200

    except Exception as e:
        print("Error in /reports/high-low-cost-trips:", e)
        return jsonify({"error": "Failed to load high/low cost trips report"}), 500


# Driver/Vehicle earnings report
@operator_bp.route("/reports/driver-vehicle-earnings", methods=["GET"])
@require_auth
@require_role("O", "I")
def report_driver_vehicle_earnings():
    """
    Runs dbo.usp_Report_DriverVehicleEarnings and returns the result as JSON.

    Query params (all optional):
      groupBy: 'DRIVER' | 'VEHICLE' | 'BOTH'
      serviceTypeId: int
      rideStatus: string (default 'Completed')
      paymentStatus: string (default 'Completed')
      pickupZoneId: int
      dropoffZoneId: int
      minTrips: int
      minEarnings: number
      includeCurrentYear: bool (1/0, true/false)
      includeLast3Years: bool (1/0, true/false)
      currentYearOverride: int
    """

    def to_int(name):
        val = request.args.get(name)
        if val is None or val == "":
            return None
        try:
            return int(val)
        except ValueError:
            return None

    def to_float(name):
        val = request.args.get(name)
        if val is None or val == "":
            return None
        try:
            return float(val)
        except ValueError:
            return None

    def to_str(name, default=None):
        val = request.args.get(name)
        if val is None or val == "":
            return default
        return val

    def to_bit(name, default=None):
        """
        Accepts: 1/0, '1'/'0', 'true'/'false', 'True'/'False'
        Returns: 1, 0 or None
        """
        val = request.args.get(name)
        if val is None or val == "":
            return default
        v = str(val).strip().lower()
        if v in ("1", "true", "yes", "y"):
            return 1
        if v in ("0", "false", "no", "n"):
            return 0
        return default

    group_by = to_str("groupBy", None)  # default 'DRIVER' by sproc
    service_type_id = to_int("serviceTypeId")
    ride_status = to_str("rideStatus", "Completed")
    payment_status = to_str("paymentStatus", "Completed")
    pickup_zone_id = to_int("pickupZoneId")
    dropoff_zone_id = to_int("dropoffZoneId")
    min_trips = to_int("minTrips")
    min_earnings = to_float("minEarnings")
    include_current_year = to_bit("includeCurrentYear", None)  # default 1
    include_last3_years = to_bit("includeLast3Years", None)
    current_year_override = to_int("currentYearOverride")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Report_DriverVehicleEarnings
                        @GroupBy            = ?,
                        @ServiceTypeId      = ?,
                        @RideStatus         = ?,
                        @PaymentStatus      = ?,
                        @PickupZoneId       = ?,
                        @DropoffZoneId      = ?,
                        @MinTrips           = ?,
                        @MinEarnings        = ?,
                        @IncludeCurrentYear = ?,
                        @IncludeLast3Years  = ?,
                        @CurrentYearOverride = ?
                    """,
                    (
                        group_by,
                        service_type_id,
                        ride_status,
                        payment_status,
                        pickup_zone_id,
                        dropoff_zone_id,
                        min_trips,
                        min_earnings,
                        include_current_year,
                        include_last3_years,
                        current_year_override,
                    ),
                )
                columns = [c[0] for c in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]

        return jsonify(rows), 200

    except Exception as e:
        print("Error in /reports/driver-vehicle-earnings:", e)
        return jsonify({"error": "Failed to load driver/vehicle earnings report"}), 500


# Driver/Vehicle performance report
@operator_bp.route("/reports/driver-vehicle-performance", methods=["GET"])
@require_auth
@require_role("O", "I")
def report_driver_vehicle_performance():
    """
    Runs dbo.usp_Report_DriverVehiclePerformance and returns the result as JSON.

    Query params:
      fromDate: date string (optional)
      toDate: date string (optional)
      periodGranularity: 'day' | 'week' | 'month' | 'quarter' | 'year' (optional)
      serviceTypeId: int (optional)
      rideStatus: string (default 'Completed')
      paymentStatus: string (default 'Completed')
      pickupZoneId: int (optional)
      dropoffZoneId: int (optional)
      minRating: float (optional) - minimum average rating filter
      minTrips: int (optional) - minimum number of trips filter
      groupBy: 'DRIVER' | 'VEHICLE' | 'BOTH' (default 'DRIVER')
      topN: int (optional) - return only top N performers
      orderBy: 'TRIPS' | 'RATING' (default 'TRIPS')
    """

    from flask import request, jsonify

    def to_int(name):
        val = request.args.get(name)
        if val is None or val == "":
            return None
        try:
            return int(val)
        except ValueError:
            return None

    def to_float(name):
        val = request.args.get(name)
        if val is None or val == "":
            return None
        try:
            return float(val)
        except ValueError:
            return None

    def to_str(name, default=None):
        val = request.args.get(name)
        if val is None or val == "":
            return default
        return val

    def to_bit(name, default=None):
        """
        Accepts: 1/0, '1'/'0', 'true'/'false', 'True'/'False'
        Returns: 1, 0 or None
        """
        val = request.args.get(name)
        if val is None or val == "":
            return default
        v = str(val).strip().lower()
        if v in ("1", "true", "yes", "y"):
            return 1
        if v in ("0", "false", "no", "n"):
            return 0
        return default

    from_date = request.args.get("fromDate") or None
    to_date = request.args.get("toDate") or None
    period_granularity = to_str("periodGranularity", None)
    service_type_id = to_int("serviceTypeId")
    ride_status = to_str("rideStatus", "Completed")
    payment_status = to_str("paymentStatus", "Completed")
    pickup_zone_id = to_int("pickupZoneId")
    dropoff_zone_id = to_int("dropoffZoneId")
    min_rating = to_float("minRating")
    min_trips = to_int("minTrips")
    group_by = to_str("groupBy", "DRIVER")
    top_n = to_int("topN")
    order_by = to_str("orderBy", "TRIPS")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Report_DriverVehiclePerformance
                        @FromDate          = ?,
                        @ToDate            = ?,
                        @PeriodGranularity = ?,
                        @ServiceTypeId     = ?,
                        @RideStatus        = ?,
                        @PaymentStatus     = ?,
                        @PickupZoneId      = ?,
                        @DropoffZoneId     = ?,
                        @MinRating         = ?,
                        @MinTrips          = ?,
                        @GroupBy           = ?,
                        @TopN              = ?,
                        @OrderBy           = ?
                    """,
                    (
                        from_date,
                        to_date,
                        period_granularity,
                        service_type_id,
                        ride_status,
                        payment_status,
                        pickup_zone_id,
                        dropoff_zone_id,
                        min_rating,
                        min_trips,
                        group_by,
                        top_n,
                        order_by,
                    ),
                )

                columns = [c[0] for c in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]

        return jsonify(rows), 200

    except Exception as e:
        print("Error in /reports/driver-vehicle-performance:", e)
        return jsonify({"error": "Failed to load driver/vehicle performance report"}), 500


# Trip Count Report
@operator_bp.route("/reports/trip-count", methods=["GET"])
@require_auth
@require_role("O", "I")
def report_trip_count():
    """
    Runs dbo.usp_Report_TripCount and returns the result as JSON.

    Query params:
      fromDate: date string (optional)
      toDate: date string (optional)
      frequency: 'day' | 'week' | 'month' | 'quarter' | 'year' (default 'month')
      serviceTypeId: int (optional)
      rideStatus: string (default 'Completed')
      paymentStatus: string (default 'Completed')
    """

    from flask import request, jsonify

    def to_int(name):
        val = request.args.get(name)
        if val is None or val == "":
            return None
        try:
            return int(val)
        except ValueError:
            return None

    def to_str(name, default=None):
        val = request.args.get(name)
        if val is None or val == "":
            return default
        return val

    from_date = request.args.get("fromDate") or None
    to_date = request.args.get("toDate") or None
    frequency = to_str("frequency", "month")
    service_type_id = to_int("serviceTypeId")
    ride_status = to_str("rideStatus", "Completed")
    payment_status = to_str("paymentStatus", "Completed")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Report_TripCount
                        @FromDate      = ?,
                        @ToDate        = ?,
                        @Frequency     = ?,
                        @ServiceTypeId = ?,
                        @RideStatus    = ?,
                        @PaymentStatus = ?
                    """,
                    (
                        from_date,
                        to_date,
                        frequency,
                        service_type_id,
                        ride_status,
                        payment_status,
                    ),
                )

                columns = [c[0] for c in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]

        return jsonify(rows), 200

    except Exception as e:
        print("Error in /reports/trip-count:", e)
        return jsonify({"error": "Failed to load trip count report"}), 500


# Trip Trends Report
@operator_bp.route("/reports/trip-trends", methods=["GET"])
@require_auth
@require_role("O", "I")
def report_trip_trends():
    """
    Runs dbo.usp_Report_TripTrends and returns the result as JSON.

    Query params:
      fromDate: date string (optional)
      toDate: date string (optional)
      frequency: 'day' | 'week' | 'month' | 'quarter' | 'year' (default 'month')
      rideStatus: string (default 'Completed')
      paymentStatus: string (default 'Completed')
      pickupZoneId: int (optional)
      dropoffZoneId: int (optional)
    """

    from flask import request, jsonify

    def to_int(name):
        val = request.args.get(name)
        if val is None or val == "":
            return None
        try:
            return int(val)
        except ValueError:
            return None

    def to_str(name, default=None):
        val = request.args.get(name)
        if val is None or val == "":
            return default
        return val

    from_date = request.args.get("fromDate") or None
    to_date = request.args.get("toDate") or None
    frequency = to_str("frequency", "month")
    ride_status = to_str("rideStatus", "Completed")
    payment_status = to_str("paymentStatus", "Completed")
    pickup_zone_id = to_int("pickupZoneId")
    dropoff_zone_id = to_int("dropoffZoneId")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Report_TripTrends
                        @FromDate      = ?,
                        @ToDate        = ?,
                        @Frequency     = ?,
                        @RideStatus    = ?,
                        @PaymentStatus = ?,
                        @PickupZoneId  = ?,
                        @DropoffZoneId = ?
                    """,
                    (
                        from_date,
                        to_date,
                        frequency,
                        ride_status,
                        payment_status,
                        pickup_zone_id,
                        dropoff_zone_id,
                    ),
                )

                columns = [c[0] for c in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]

        return jsonify(rows), 200

    except Exception as e:
        print("Error in /reports/trip-trends:", e)
        return jsonify({"error": "Failed to load trip trends report"}), 500


# High Activity Periods Report
@operator_bp.route("/reports/high-activity-periods", methods=["GET"])
@require_auth
@require_role("O", "I")
def report_high_activity_periods():
    """
    Runs dbo.usp_Report_HighActivityPeriods and returns the result as JSON.

    Query params:
      frequency: 'day' | 'week' | 'month' | 'quarter' | 'year' (default 'month')
      serviceTypeId: int (optional)
      rideStatus: string (default 'Completed')
      paymentStatus: string (default 'Completed')
      pickupZoneId: int (optional)
      dropoffZoneId: int (optional)
      topN: int (optional) - return only top N periods
    """

    from flask import request, jsonify

    def to_int(name):
        val = request.args.get(name)
        if val is None or val == "":
            return None
        try:
            return int(val)
        except ValueError:
            return None

    def to_str(name, default=None):
        val = request.args.get(name)
        if val is None or val == "":
            return default
        return val

    frequency = to_str("frequency", "month")
    service_type_id = to_int("serviceTypeId")
    ride_status = to_str("rideStatus", "Completed")
    payment_status = to_str("paymentStatus", "Completed")
    pickup_zone_id = to_int("pickupZoneId")
    dropoff_zone_id = to_int("dropoffZoneId")
    top_n = to_int("topN")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Report_HighActivityPeriods
                        @Frequency     = ?,
                        @ServiceTypeId = ?,
                        @RideStatus    = ?,
                        @PaymentStatus = ?,
                        @PickupZoneId  = ?,
                        @DropoffZoneId = ?,
                        @TopN          = ?
                    """,
                    (
                        frequency,
                        service_type_id,
                        ride_status,
                        payment_status,
                        pickup_zone_id,
                        dropoff_zone_id,
                        top_n,
                    ),
                )

                columns = [c[0] for c in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]

        return jsonify(rows), 200

    except Exception as e:
        print("Error in /reports/high-activity-periods:", e)
        return jsonify({"error": "Failed to load high activity periods report"}), 500