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
