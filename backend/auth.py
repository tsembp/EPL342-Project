from flask import Blueprint, request, jsonify, session
import pyodbc

from db import get_connection

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/signup", methods=["POST"])
def signup():
    """Handle user signup via SQL stored procedure"""
    data = request.json

    if not data:
        return jsonify({"success": False, "error": "No data provided"}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Call appropriate signup procedure based on account type
                if data.get("accountType") == "staff":
                    # Company Representatives are 'staff' but are created in the User table
                    if data.get("role") == "C":
                        cur.execute("""
                            EXEC dbo.usp_SignUpUser
                                @Role=?, @FirstName=?, @LastName=?, @Dob=?, @Gender=?,
                                @Email=?, @Phone=?, @Address=?, @Username=?, 
                                @PasswordPlain=?, @Company=?
                        """,
                        data.get("role"), data.get("firstName"), data.get("lastName"),
                        data.get("dob"), data.get("gender"), data.get("email"), data.get("phone"),
                        data.get("address"), data.get("username"), data.get("password"),
                        data.get("company"))
                    else: # Other staff like Operator or Inspector
                        cur.execute("""
                            EXEC dbo.usp_SignUpStaff 
                                @Role=?, @Email=?, @Username=?, @PasswordPlain=?
                        """,
                        data.get("role"), data.get("email"),
                        data.get("username"), data.get("password"))
                else: # User roles like Passenger and Driver
                    cur.execute("""
                        EXEC dbo.usp_SignUpUser
                            @Role=?, @FirstName=?, @LastName=?, @Dob=?, @Gender=?,
                            @Email=?, @Phone=?, @Address=?, @Username=?, 
                            @PasswordPlain=?, @Company=?
                    """,
                    data.get("role"), data.get("firstName"), data.get("lastName"),
                    data.get("dob"), data.get("gender"), data.get("email"), data.get("phone"),
                    data.get("address"), data.get("username"), data.get("password"),
                    data.get("company"))

                row = cur.fetchone()
                if row:
                    return jsonify({
                        "success": True,
                        "userId": str(row[0]),
                        "role": row[1],
                        "email": row[2],
                        "message": "Signup successful",
                    }), 201

                return jsonify({
                    "success": False,
                    "error": "Signup failed - no data returned",
                }), 400

    except pyodbc.Error as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """Handle user login and create session"""
    data = request.json

    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"success": False, "error": "Email and password required"}), 400

    print(f"[LOGIN] Attempting login for: {data.get('email')}")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                print("[LOGIN] Executing stored procedure...")
                cur.execute("""
                    EXEC dbo.usp_Login @InputEmail=?, @PasswordPlain=?
                """, data["email"], data["password"])

                print("[LOGIN] Fetching results...")
                row = cur.fetchone()

                if row:
                    print(f"[LOGIN] Success! UserId: {row[0]}, Role: {row[1]}, Status: {row[4]}, Username: {row[5]}")
                    session["user_id"] = str(row[0])
                    session["role"] = row[1]
                    session["account_type"] = row[2]
                    session["email"] = row[3]
                    session["verification_status"] = row[4] # Store new status in session
                    session["username"] = row[5]  # Store username in session
                    session.permanent = True

                    return jsonify({
                        "success": True,
                        "userId": str(row[0]),
                        "role": row[1],
                        "accountType": row[2],
                        "email": row[3],
                        "verificationStatus": row[4], # Include new status in response
                        "username": row[5],  # Include username in response
                    }), 200

                print("[LOGIN] No row returned from stored procedure")
                return jsonify({
                    "success": False,
                    "error": "Invalid credentials - no result from database",
                }), 401

    except pyodbc.Error as e:
        error_msg = str(e)
        print(f"[LOGIN ERROR] pyodbc.Error: {error_msg}")
        if "Invalid credentials" in error_msg or "not verified" in error_msg:
            return jsonify({"success": False, "error": error_msg}), 401
        return jsonify({"success": False, "error": f"Database error: {error_msg}"}), 400
    except Exception as e:
        print(f"[LOGIN ERROR] General exception: {str(e)}")
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Clear session"""
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"}), 200


@auth_bp.route("/me", methods=["GET"])
def get_current_user():
    """Get current session user"""
    if "user_id" in session:
        return jsonify({
            "authenticated": True,
            "userId": session["user_id"],
            "role": session["role"],
            "accountType": session["account_type"],
            "email": session["email"],
            "username": session["username"],
        }), 200
    return jsonify({"authenticated": False}), 401
