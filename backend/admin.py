from flask import Blueprint, jsonify
from db import get_connection
from decorators import require_auth, require_role
from flask import request, session
import pyodbc

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


@admin_bp.route("/login", methods=["POST"])
def admin_login():
    """Handle admin login and create session"""

    data = request.json

    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"success": False, "error": "Email and password required"}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    EXEC dbo.usp_Admin_Login @Email=?, @PasswordPlain=?
                """, data["email"], data["password"])

                row = cur.fetchone()

                if row:
                    session["user_id"] = str(row[0])
                    session["role"] = row[1]
                    session["account_type"] = row[2]
                    session["email"] = row[3]
                    session["verification_status"] = row[4]
                    session["username"] = row[5]
                    session.permanent = True

                    return jsonify({
                        "success": True,
                        "userId": str(row[0]),
                        "role": row[1],
                        "accountType": row[2],
                        "email": row[3],
                        "verificationStatus": row[4],
                    }), 200

                return jsonify({
                    "success": False,
                    "error": "Invalid credentials - no result from database",
                }), 401

    except pyodbc.Error as e:
        error_msg = str(e)
        if "Invalid credentials" in error_msg or "not verified" in error_msg:
            return jsonify({"success": False, "error": error_msg}), 401
        return jsonify({"success": False, "error": f"Database error: {error_msg}"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500


@admin_bp.route("/operators/pending", methods=["GET"])
@require_auth
@require_role("A")
def get_pending_operators():
    """
    Return list of operator accounts that are not yet verified / checked by admin.
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM dbo.vw_UnverifiedOperators;")
                rows = cur.fetchall()

        items = []
        for r in rows:
            items.append(
                {
                    "userId": str(r.OperatorId),
                    "email": r.Email,
                    "username": r.Username,
                    "createdAt": r.CreatedAt.isoformat() if r.CreatedAt else None,
                }
            )

        return jsonify({"success": True, "items": items}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


# Approve Operator
@admin_bp.route("/operators/<operator_id>/approve", methods=["POST"])
@require_auth
@require_role("A")  # adjust to your admin role
def approve_operator(operator_id: str):
    try:
        admin_id = session["user_id"]
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("EXEC dbo.usp_Admin_ApproveOperator ?, ?", (operator_id, admin_id))
                conn.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        msg = str(e)
        status = 400
        if "Operator not found" in msg:
            status = 404
        return jsonify({"success": False, "error": msg}), status


# Reject Operator
@admin_bp.route("/operators/<operator_id>/reject", methods=["POST"])
@require_auth
@require_role("A")
def reject_operator(operator_id: str):
    try:
        admin_id = session["user_id"]
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("EXEC dbo.usp_Admin_RejectOperator ?, ?", (operator_id, admin_id))
                conn.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        msg = str(e)
        status = 400
        if "Operator not found" in msg:
            status = 404
        return jsonify({"success": False, "error": msg}), status