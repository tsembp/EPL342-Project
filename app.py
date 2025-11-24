from flask import Flask, render_template_string, request, jsonify, session
from flask_session import Session
from flask_cors import CORS
import pyodbc
from dotenv import load_dotenv
import os
import secrets
from datetime import timedelta
from functools import wraps

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Configure CORS for frontend
CORS(app, supports_credentials=True, origins=["http://localhost:8080", "http://[::]:8080"])

# Configure server-side sessions
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
Session(app)

# Adjust for your server/auth
CN_STR = (
    "Driver={ODBC Driver 18 for SQL Server};"
    f"Server={os.getenv('DB_HOST')},1433;"
    f"Database={os.getenv('DB_NAME')};"
    f"UID={os.getenv('DB_NAME')};PWD={os.getenv('DB_PASS')};"
    "Encrypt=yes;TrustServerCertificate=yes"
)

# Auth decorators
def require_auth(f):
    """Decorator to protect routes - requires authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def require_role(*allowed_roles):
    """Decorator to check user role"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'role' not in session or session['role'] not in allowed_roles:
                return jsonify({'error': 'Unauthorized - insufficient permissions'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Authentication endpoints
@app.route("/api/auth/signup", methods=["POST"])
def signup():
    """Handle user signup via SQL stored procedure"""
    data = request.json
    
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
    
    try:
        with pyodbc.connect(CN_STR, timeout=10) as conn:
            with conn.cursor() as cur:
                # Call appropriate signup procedure based on account type
                if data.get('accountType') == 'staff':
                    cur.execute("""
                        EXEC dbo.usp_SignUpStaff 
                            @Role=?, @Email=?, @Username=?, @PasswordPlain=?
                    """, 
                    data.get('role'), data.get('email'), 
                    data.get('username'), data.get('password'))
                else:
                    cur.execute("""
                        EXEC dbo.usp_SignUpUser
                            @Role=?, @FirstName=?, @LastName=?, @Dob=?, @Gender=?,
                            @Email=?, @Phone=?, @Address=?, @Username=?, 
                            @PasswordPlain=?, @Company=?
                    """,
                    data.get('role'), data.get('firstName'), data.get('lastName'),
                    data.get('dob'), data.get('gender'), data.get('email'), data.get('phone'),
                    data.get('address'), data.get('username'), data.get('password'),
                    data.get('company'))
                
                # Get returned user info
                row = cur.fetchone()
                if row:
                    return jsonify({
                        'success': True,
                        'userId': str(row[0]),
                        'role': row[1],
                        'email': row[2],
                        'message': 'Signup successful'
                    }), 201
                else:
                    return jsonify({
                        'success': False,
                        'error': 'Signup failed - no data returned'
                    }), 400
                    
    except pyodbc.Error as e:
        error_msg = str(e)
        return jsonify({'success': False, 'error': error_msg}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route("/api/auth/login", methods=["POST"])
def login():
    """Handle user login and create session"""
    data = request.json
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'success': False, 'error': 'Email and password required'}), 400
    
    print(f"[LOGIN] Attempting login for: {data.get('email')}")  # Debug log
    
    try:
        with pyodbc.connect(CN_STR, timeout=10) as conn:
            with conn.cursor() as cur:
                print(f"[LOGIN] Executing stored procedure...")  # Debug log
                cur.execute("""
                    EXEC dbo.usp_Login @InputEmail=?, @PasswordPlain=?
                """, data['email'], data['password'])
                
                print(f"[LOGIN] Fetching results...")  # Debug log
                # Get the result
                row = cur.fetchone()
                
                if row:
                    print(f"[LOGIN] Success! UserId: {row[0]}, Role: {row[1]}")  # Debug log
                    # Create session
                    session['user_id'] = str(row[0])  # UserId
                    session['role'] = row[1]  # Role
                    session['account_type'] = row[2]  # AccountType
                    session['email'] = row[3]  # Email
                    session.permanent = True
                    
                    return jsonify({
                        'success': True,
                        'userId': str(row[0]),
                        'role': row[1],
                        'accountType': row[2],
                        'email': row[3]
                    }), 200
                else:
                    print(f"[LOGIN] No row returned from stored procedure")  # Debug log
                    return jsonify({
                        'success': False,
                        'error': 'Invalid credentials - no result from database'
                    }), 401
                    
    except pyodbc.Error as e:
        error_msg = str(e)
        print(f"[LOGIN ERROR] pyodbc.Error: {error_msg}")  # Debug log
        # Check if it's an authentication error from the stored procedure
        if 'Invalid credentials' in error_msg or 'not verified' in error_msg:
            return jsonify({'success': False, 'error': error_msg}), 401
        return jsonify({'success': False, 'error': f'Database error: {error_msg}'}), 400
    except Exception as e:
        print(f"[LOGIN ERROR] General exception: {str(e)}")  # Debug log
        return jsonify({'success': False, 'error': f'Server error: {str(e)}'}), 500

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    """Clear session"""
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

@app.route("/api/auth/me", methods=["GET"])
def get_current_user():
    """Get current session user"""
    if 'user_id' in session:
        return jsonify({
            'authenticated': True,
            'userId': session['user_id'],
            'role': session['role'],
            'accountType': session['account_type'],
            'email': session['email']
        }), 200
    return jsonify({'authenticated': False}), 401

# Stations/Zones endpoints
@app.route("/api/stations", methods=["GET"])
def get_stations():
    """
    Get available stations (ZonePoints) filtered by:
    - pointType: 'S' (station), 'B' (bridge), or both (default: both)
    - isPickupAllowed: true/false (optional)
    - isDropoffAllowed: true/false (optional)
    """
    point_type = request.args.get("pointType")  # 'S', 'B', or None (both)
    is_pickup_allowed = request.args.get("isPickupAllowed")
    is_dropoff_allowed = request.args.get("isDropoffAllowed")

    # Build WHERE clauses
    where_clauses = []
    params = []

    # PointType filter
    if point_type in ("S", "B"):
        where_clauses.append("zp.PointType = ?")
        params.append(point_type)
    else:
        where_clauses.append("zp.PointType IN ('S', 'B')")

    # isPickupAllowed filter
    if is_pickup_allowed is not None:
        where_clauses.append("zp.IsPickupAllowed = ?")
        params.append(1 if is_pickup_allowed.lower() == "true" else 0)

    # isDropoffAllowed filter
    if is_dropoff_allowed is not None:
        where_clauses.append("zp.IsDropoffAllowed = ?")
        params.append(1 if is_dropoff_allowed.lower() == "true" else 0)

    where_sql = " AND ".join(where_clauses)

    try:
        with pyodbc.connect(CN_STR, timeout=10) as conn:
            with conn.cursor() as cur:
                sql = f"""
                    SELECT 
                        zp.PointId,
                        zp.ZoneId,
                        zp.Latitude,
                        zp.Longitude,
                        zp.Name,
                        zp.IsPickupAllowed,
                        zp.IsDropoffAllowed,
                        gz.Name as ZoneName,
                        zp.PointType
                    FROM [dbo].[ZonePoint] zp
                    JOIN [dbo].[Geofencezone] gz ON zp.ZoneId = gz.ZoneId
                    WHERE {where_sql}
                    ORDER BY gz.Name, zp.Name
                """
                cur.execute(sql, *params)
                stations = []
                for row in cur.fetchall():
                    stations.append({
                        'pointId': row[0],
                        'zoneId': row[1],
                        'latitude': float(row[2]),
                        'longitude': float(row[3]),
                        'name': row[4],
                        'isPickupAllowed': bool(row[5]),
                        'isDropoffAllowed': bool(row[6]),
                        'zoneName': row[7],
                        'pointType': row[8]
                    })
                return jsonify({
                    'success': True,
                    'stations': stations,
                    'total': len(stations)
                }), 200
    except Exception as e:
        print(f"Error fetching stations: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route("/api/zones", methods=["GET"])
def get_zones():
    """Get all geofence zones"""
    try:
        with pyodbc.connect(CN_STR, timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        ZoneId,
                        MinLat,
                        MinLng,
                        MaxLat,
                        MaxLng,
                        Name
                    FROM [dbo].[Geofencezone]
                    ORDER BY ZoneId
                """)
                
                zones = []
                for row in cur.fetchall():
                    zones.append({
                        'zoneId': row[0],
                        'minLat': float(row[1]),
                        'minLng': float(row[2]),
                        'maxLat': float(row[3]),
                        'maxLng': float(row[4]),
                        'name': row[5]
                    })
                
                return jsonify({
                    'success': True,
                    'zones': zones,
                    'total': len(zones)
                }), 200
                
    except Exception as e:
        print(f"Error fetching zones: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route("/api/route/visualization", methods=["GET"])
def get_route_visualization():
    """Get route waypoints including bridge points for visualization"""
    pickup_point_id = request.args.get('pickupPointId', type=int)
    dropoff_point_id = request.args.get('dropoffPointId', type=int)
    
    if not pickup_point_id or not dropoff_point_id:
        return jsonify({
            'success': False, 
            'error': 'Both pickupPointId and dropoffPointId are required'
        }), 400
    
    try:
        with pyodbc.connect(CN_STR, timeout=10) as conn:
            with conn.cursor() as cur:
                # Call stored procedure to get route waypoints
                print(f"Calling usp_GetRouteVisualization with pickup={pickup_point_id}, dropoff={dropoff_point_id}")
                cur.execute("""
                    EXEC dbo.usp_GetRouteVisualization 
                        @PickupPointId=?, 
                        @DropoffPointId=?
                """, pickup_point_id, dropoff_point_id)
                
                waypoints = []  
                for row in cur.fetchall():
                    print(f"Row: {row}")
                    waypoints.append({
                        'sequenceNumber': row[0],
                        'pointId': row[1],
                        'latitude': float(row[2]),
                        'longitude': float(row[3]),
                        'pointType': row[4],
                        'pointName': row[5] if row[5] else f"Point {row[1]}",
                        'zoneId': row[6],
                        'pointRole': row[7]
                    })
                
                print(f"Retrieved {len(waypoints)} waypoints")
                return jsonify({
                    'success': True,
                    'waypoints': waypoints,
                    'totalWaypoints': len(waypoints)
                }), 200
                
    except pyodbc.Error as e:
        print(f"Database error getting route visualization: {e}")
        print(f"Error details: {e.args}")
        return jsonify({'success': False, 'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        print(f"Error getting route visualization: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# Example protected endpoints using decorators
@app.route("/api/passenger/profile", methods=["GET"])
@require_auth
@require_role('P')
def get_passenger_profile():
    """Example: Get passenger profile - requires passenger role"""
    user_id = session['user_id']
    try:
        with pyodbc.connect(CN_STR, timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM dbo.Passenger WHERE UserId = ?", user_id)
                row = cur.fetchone()
                if row:
                    columns = [column[0] for column in cur.description]
                    return jsonify(dict(zip(columns, row))), 200
                return jsonify({'error': 'Profile not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/api/driver/profile", methods=["GET"])
@require_auth
@require_role('D')
def get_driver_profile():
    """Example: Get driver profile - requires driver role"""
    user_id = session['user_id']
    try:
        with pyodbc.connect(CN_STR, timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM dbo.Driver WHERE UserId = ?", user_id)
                row = cur.fetchone()
                if row:
                    columns = [column[0] for column in cur.description]
                    return jsonify(dict(zip(columns, row))), 200
                return jsonify({'error': 'Profile not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/api/operator/dashboard", methods=["GET"])
@require_auth
@require_role('O', 'I')  # Operator or Inspector
def get_operator_dashboard():
    """Example: Get operator dashboard - requires operator or inspector role"""
    try:
        with pyodbc.connect(CN_STR, timeout=10) as conn:
            with conn.cursor() as cur:
                # Example: Get pending document verifications
                cur.execute("""
                    SELECT COUNT(*) as PendingDocs 
                    FROM dbo.UserDocumentVerification 
                    WHERE VerificationStatusId = 1
                """)
                row = cur.fetchone()
                return jsonify({
                    'pendingDocuments': row[0] if row else 0,
                    'operatorId': session['user_id']
                }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/api/passenger/request-ride", methods=["POST"])
@require_auth
@require_role('P')
def request_ride():
    """
    Create a new ride request for the logged-in passenger.
    Expects: JSON with pickupPointId, dropoffPointId, rideProfileId, numOfPeople, pickupAt (ISO string)
    """
    data = request.json
    user_id = session['user_id']

    try:
        pickup_point_id = int(data.get("pickupPointId"))
        dropoff_point_id = int(data.get("dropoffPointId"))
        ride_profile_id = data.get("rideProfileId")
        num_of_people = int(data.get("numOfPeople", 1))
        pickup_at = data.get("pickupAt")  # ISO string

        with pyodbc.connect(CN_STR, timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    EXEC dbo.usp_RideRequest_Create
                        @PassengerId=?,
                        @NumOfPeople=?,
                        @PickupAt=?,
                        @PickUpPointId=?,
                        @DropOffPointId=?,
                        @RideProfileId=?
                """, user_id, num_of_people, pickup_at, pickup_point_id, dropoff_point_id, ride_profile_id)
                row = cur.fetchone()
                if row:
                    return jsonify({"success": True, "requestId": row[0]}), 201
                else:
                    return jsonify({"success": False, "error": "No requestId returned"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400
@app.route("/api/meta/enums", methods=["GET"])
def get_enums():
    """Return valid ride profiles (service, ride, vehicle combos) and enums"""
    try:
        with pyodbc.connect(CN_STR, timeout=10) as conn:
            with conn.cursor() as cur:
                # Service types
                cur.execute("SELECT ServiceTypeId, Name FROM dbo.Servicetype WHERE Active = 1")
                services = [(row[0], row[1]) for row in cur.fetchall()]

                # Ride types
                cur.execute("SELECT RideTypeId, Name FROM dbo.Ridetype")
                ride_types = [(row[0], row[1]) for row in cur.fetchall()]

                # Vehicle types
                cur.execute("SELECT VehicleTypeId, Name, NumOfSeats FROM dbo.VehicleType")
                veh_types = [(row[0], row[1], row[2]) for row in cur.fetchall()]

                # Allowed ride profiles WITH seat count
                cur.execute("""
                    SELECT 
                        arp.RideProfileId,
                        st.ServiceTypeId, st.Name,
                        rt.RideTypeId, rt.Name,
                        vt.VehicleTypeId, vt.Name,
                        vt.NumOfSeats
                    FROM dbo.AllowedRideProfile arp
                    JOIN dbo.Servicetype st ON arp.ServiceTypeId = st.ServiceTypeId
                    JOIN dbo.Ridetype rt ON arp.RideTypeId = rt.RideTypeId
                    JOIN dbo.VehicleType vt ON arp.VehicleTypeId = vt.VehicleTypeId
                """)
                combo_specs = []
                for row in cur.fetchall():
                    combo_specs.append({
                        "ride_profile_id": str(row[0]),
                        "service_type_id": row[1],
                        "service_type_name": row[2],
                        "ride_type_id": row[3],
                        "ride_type_name": row[4],
                        "vehicle_type_id": row[5],
                        "vehicle_type_name": row[6],
                        "num_seats": row[7],  # <-- add this
                    })

                return jsonify({
                    "services": services,
                    "ride_types": ride_types,
                    "veh_types": veh_types,
                    "combo_specs": combo_specs
                }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

PAGE = """
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>DB Query Console</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; }
    textarea { width: 100%; height: 160px; }
    table { border-collapse: collapse; margin-top: 1rem; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; }
    th { background: #f6f6f6; }
    .error { color: #b00020; margin-top: 1rem; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>SQL Console (read-only)</h1>
  <form method="POST">
    <textarea name="sql" placeholder="SELECT TOP 50 * FROM dbo.User;"></textarea>
    <br><button type="submit">Run</button>
  </form>

  {% if error %}<div class="error">{{ error }}</div>{% endif %}

  {% if rows is not none %}
    <p><strong>{{ rows|length }}</strong> row(s)</p>
    <table>
      <thead>
        <tr>
          {% for col in columns %}<th>{{ col }}</th>{% endfor %}
        </tr>
      </thead>
      <tbody>
        {% for r in rows %}
          <tr>
            {% for col in columns %}<td>{{ r[col] }}</td>{% endfor %}
          </tr>
        {% endfor %}
      </tbody>
    </table>
  {% endif %}
</body>
</html>
"""

@app.route("/", methods=["GET", "POST"])
def index():
    error = None
    columns, rows = None, None
    if request.method == "POST":
        sql = (request.form.get("sql") or "").strip()

        # --- safety: only allow SELECTs for demo grading ---
        first = sql.split(None, 1)[0].upper() if sql else ""
        if first != "SELECT":
            error = "Only SELECT statements are allowed in this console."
        else:
            # Optional: enforce TOP limit
            if " TOP " not in sql.upper():
                sql = "SELECT TOP 100 * FROM (" + sql + ") AS t"

            try:
                with pyodbc.connect(CN_STR, timeout=10) as conn:
                    conn.add_output_converter(pyodbc.SQL_WVARCHAR, lambda x: x)  # basic
                    with conn.cursor() as cur:
                        cur.execute(sql)
                        cols = [c[0] for c in cur.description]
                        data = [dict(zip(cols, row)) for row in cur.fetchall()]
                        columns, rows = cols, data
            except Exception as e:
                error = str(e)

    return render_template_string(PAGE, error=error, columns=columns, rows=rows)

if __name__ == "__main__":
    app.run(debug=True)
