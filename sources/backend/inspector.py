from flask import Blueprint, jsonify, session, request
from db import get_connection
from decorators import require_auth, require_role

inspector_bp = Blueprint("inspector", __name__, url_prefix="/api/inspector")

@inspector_bp.route("/vehicles/search", methods=["GET"])
@require_auth
@require_role("I")
def search_vehicles_by_plate():
    """
    Inspector: search vehicles by plate (partial match).
    Calls dbo.usp_Inspector_SearchVehiclesByPlate.
    """
    plate = (request.args.get("plate") or "").strip()

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Inspector_SearchVehiclesByPlate
                        @Plate = ?
                    """,
                    plate,
                )
                rows = cur.fetchall()
                columns = [col[0] for col in cur.description] if rows else []

        data = [dict(zip(columns, row)) for row in rows]
        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@inspector_bp.route("/vehicle-tests", methods=["GET"])
@require_auth
@require_role("I")
def get_vehicle_tests_paged():
    """
    Inspector: get paginated vehicle tests (optionally filtered by vehicle).
    Calls dbo.usp_Inspector_GetVehicleTestsPaged.
    Query params:
      - page (int, default 1)
      - pageSize (int, default 10)
      - vehicleId (GUID, optional)
    Returns:
      {
        "items": [...],
        "page": 1,
        "pageSize": 10,
        "totalCount": 42
      }
    """
    # Parse query params
    try:
        page = int(request.args.get("page", "1"))
    except ValueError:
        page = 1

    try:
        page_size = int(request.args.get("pageSize", "10"))
    except ValueError:
        page_size = 10

    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 10

    vehicle_id = request.args.get("vehicleId") or None

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Inspector_GetVehicleTestsPaged
                        @Page = ?,
                        @PageSize = ?,
                        @VehicleId = ?
                    """,
                    page,
                    page_size,
                    vehicle_id,
                )
                rows = cur.fetchall()
                columns = [col[0] for col in cur.description] if rows else []

        items = []
        total_count = 0

        for row in rows:
            row_dict = dict(zip(columns, row))
            # Extract TotalCount (same for all rows)
            total_count = row_dict.get("TotalCount", 0) or 0
            # Strip TotalCount from each item
            row_dict.pop("TotalCount", None)
            items.append(row_dict)

        # If there were no rows, total_count stays 0
        result = {
            "items": items,
            "page": page,
            "pageSize": page_size,
            "totalCount": total_count,
        }
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@inspector_bp.route("/vehicle-tests", methods=["POST"])
@require_auth
@require_role("I")
def create_vehicle_test():
    """
    Inspector: create a new vehicle test for a vehicle.
    Calls dbo.usp_Inspector_CreateVehicleTest.
    Body:
      {
        "vehicleId": "GUID",
        "comments": "optional comments"
      }
    """
    inspector_id = session["user_id"]
    data = request.get_json() or {}

    vehicle_id = data.get("vehicleId")
    comments = data.get("comments")

    if not vehicle_id:
        return jsonify({"error": "vehicleId is required"}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Inspector_CreateVehicleTest
                        @InspectorId = ?,
                        @VehicleId = ?,
                        @Comments = ?
                    """,
                    inspector_id,
                    vehicle_id,
                    comments,
                )
                row = cur.fetchone()
                if not row:
                    return jsonify({"error": "Failed to create vehicle test"}), 500

                columns = [col[0] for col in cur.description]
                created = dict(zip(columns, row))

            conn.commit()

        return jsonify(created), 201

    except Exception as e:
        # If this is a RAISERROR from SQL (e.g. 'Vehicle does not exist.')
        msg = str(e)
        if "Vehicle does not exist" in msg:
            return jsonify({"error": "Vehicle does not exist."}), 400

        return jsonify({"error": f"Server error: {msg}"}), 500
