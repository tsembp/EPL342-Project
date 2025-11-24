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
                cur.execute("""
                    SELECT COUNT(*) as PendingDocs 
                    FROM dbo.UserDocumentVerification 
                    WHERE VerificationStatusId = 1
                """)
                row = cur.fetchone()
                return jsonify({
                    "pendingDocuments": row[0] if row else 0,
                    "operatorId": session["user_id"],
                }), 200
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
                    EXEC dbo.usp_GetPendingPersonDocumentsForReview @OperatorId=?
                """, operator_id)
                columns = [column[0] for column in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]
                return jsonify(rows), 200
    except Exception as e:
        print("Error in pending-person-documents endpoint:", e)
        return jsonify({"error": str(e)}), 500


@operator_bp.route("/pending-vehicle-documents", methods=["GET"])
@require_auth
@require_role("O", "I")
def get_pending_vehicle_documents():
    operator_id = session["user_id"]
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    EXEC dbo.usp_GetPendingVehicleDocumentsForReview @OperatorId=?
                """, operator_id)
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
                cur.execute("""
                    EXEC dbo.usp_ReviewPersonDocument 
                        @OperatorId=?, @DocId=?, @NewStatus=?, @ReviewComment=?
                """, operator_id, doc_id, status, comment)
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
                cur.execute("""
                    EXEC dbo.usp_ReviewVehicleDocument 
                        @OperatorId=?, @VehDocId=?, @NewStatus=?, @ReviewComments=?
                """, operator_id, veh_doc_id, status, comment)
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
