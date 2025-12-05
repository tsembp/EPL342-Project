import json
from flask import Blueprint, jsonify, request, session
from db import get_connection
from decorators import require_auth

gdpr_bp = Blueprint("gdpr", __name__, url_prefix="/api/gdpr")


@gdpr_bp.route("/export", methods=["GET"])
@require_auth
def get_gdpr_export():
    user_id = session.get("user_id")
    gdpr_id = request.args.get("gdprId")

    if gdpr_id is None:
        gdpr_id = 0

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Gdpr_ExecuteDataExport
                        @UserId = ?, 
                        @GdprId = ?
                    """,
                    user_id,
                    gdpr_id,
                )

                row = cur.fetchone()
                if not row:
                    return jsonify({"error": "No export data found"}), 404

                export_json_str = row[0]

        export_data = json.loads(export_json_str)
        return jsonify(export_data), 200

    except Exception as e:
        print("Error in get_gdpr_export:", e)
        return jsonify({"error": str(e)}), 500


@gdpr_bp.route("/request", methods=["POST"])
@require_auth
def submit_gdpr_request():
    """
    Generic GDPR request endpoint.
    For data correction, frontend sends:
      { "type": "DataCorrection", "reason": "My surname is wrong, should be XXX" }
    """
    data = request.json or {}
    user_id = session.get("user_id")
    request_type = data.get("type")
    reason = (data.get("reason") or "").strip() if data.get("reason") is not None else None

    # Basic validation
    if not request_type:
        return jsonify({"success": False, "error": "Request type is required."}), 400

    # For DataCorrection we REQUIRE a reason (what is wrong)
    if request_type == "DataCorrection" and (not reason or reason.strip() == ""):
        return jsonify(
            {
                "success": False,
                "error": "Please describe what data is incorrect (reason is required for DataCorrection).",
            }
        ), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_Gdpr_SubmitRequest 
                        @UserId      = ?, 
                        @RequestType = ?, 
                        @Reason      = ?
                    """,
                    user_id,
                    request_type,
                    reason,
                )

                row = cur.fetchone()
                gdpr_id = row[0] if row else None

        # If this is a data deletion request, clear the session immediately
        # because the user's account has been anonymized
        if request_type == "DataDeletion":
            session.clear()

        return jsonify({"success": True, "gdprId": gdpr_id}), 200

    except Exception as e:
        print("Error in submit_gdpr_request endpoint:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@gdpr_bp.route("/my-requests", methods=["GET"])
@require_auth
def my_gdpr_requests():
    user_id = session["user_id"]
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("EXEC dbo.usp_GetUserGdprRequests ?", user_id)

                columns = [c[0] for c in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]
                return jsonify(rows), 200
    except Exception as e:
        print("Error in my_gdpr_requests:", e)
        return jsonify({"error": str(e)}), 500
