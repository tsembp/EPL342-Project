from flask import Blueprint, jsonify, session
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
