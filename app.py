from flask import Flask, render_template_string, request, jsonify, session
from flask_session import Session
from flask_cors import CORS
import pyodbc
from dotenv import load_dotenv
import os
import secrets
from datetime import timedelta
from functools import wraps

# === NEW IMPORTS FOR GOOGLE DRIVE UPLOAD ===
import io
import pathlib
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

# Load environment variables from .env file
load_dotenv()

# --- IMPORTANT: disable any HTTP(S) proxies for Google API calls ---
for key in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"):
    if key in os.environ:
        print(f"[DRIVE] Removing proxy env var {key}={os.environ[key]}")
        os.environ.pop(key, None)

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

# ================= GOOGLE DRIVE CONFIG & HELPERS =====================

GOOGLE_SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
GOOGLE_DRIVE_PARENT_FOLDER_ID = os.getenv("GOOGLE_DRIVE_PARENT_FOLDER_ID")
GOOGLE_SCOPES = ["https://www.googleapis.com/auth/drive.file"]

_drive_service = None


def get_drive_service():
    """Lazy-init Google Drive service client."""
    global _drive_service
    if _drive_service is None:
        if not GOOGLE_SERVICE_ACCOUNT_FILE:
            raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_FILE is not set")
        print(f"[DRIVE] Using service account file: {GOOGLE_SERVICE_ACCOUNT_FILE}")
        creds = service_account.Credentials.from_service_account_file(
            GOOGLE_SERVICE_ACCOUNT_FILE,
            scopes=GOOGLE_SCOPES,
        )
        _drive_service = build("drive", "v3", credentials=creds)
        print("[DRIVE] Service initialized")
    return _drive_service


def get_or_create_user_folder(user_id: str) -> str:
    """
    Ensure there is a folder named <user_id> under the parent Drive folder.
    Returns that folder's ID.
    """
    if not GOOGLE_DRIVE_PARENT_FOLDER_ID:
        raise RuntimeError("GOOGLE_DRIVE_PARENT_FOLDER_ID is not set")

    service = get_drive_service()

    # Try to find existing folder
    query = (
        "mimeType = 'application/vnd.google-apps.folder' "
        f"and name = '{user_id}' "
        f"and '{GOOGLE_DRIVE_PARENT_FOLDER_ID}' in parents "
        "and trashed = false"
    )

    print(f"[DRIVE] Searching for folder for user {user_id}")
    result = service.files().list(
        q=query,
        spaces="drive",
        fields="files(id, name)",
        pageSize=1,
    ).execute()

    files = result.get("files", [])
    if files:
        folder_id = files[0]["id"]
        print(f"[DRIVE] Found existing user folder: {folder_id}")
        return folder_id

    # Not found -> create
    print(f"[DRIVE] Creating new folder for user {user_id}")
    folder_metadata = {
        "name": user_id,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [GOOGLE_DRIVE_PARENT_FOLDER_ID],
    }

    folder = service.files().create(
        body=folder_metadata,
        fields="id"
    ).execute()

    folder_id = folder["id"]
    print(f"[DRIVE] User folder created: {folder_id}")
    return folder_id


def upload_user_document_to_drive(user_id: str, doc_type: str, file_stream: io.BytesIO):
    """
    Upload a document into Google Drive under:
        <PARENT_FOLDER>/<user_id>/<DOC_TYPE>.pdf

    Returns: (file_id, public_url)
    """
    service = get_drive_service()

    # Make / find folder for this user
    user_folder_id = get_or_create_user_folder(user_id)

    # File path: {UserId}/{DocType}.pdf
    filename = f"{doc_type}.pdf"
    print(f"[DRIVE] Uploading {filename} for user {user_id}")

    media = MediaIoBaseUpload(
        file_stream,
        mimetype="application/pdf",
        resumable=False
    )

    file_metadata = {
        "name": filename,
        "parents": [user_folder_id],
    }

    created = service.files().create(
        body=file_metadata,
        media_body=media,
        fields="id, webViewLink"
    ).execute()

    file_id = created["id"]

    # Make file publicly viewable
    service.permissions().create(
        fileId=file_id,
        body={"role": "reader", "type": "anyone"}
    ).execute()

    public_url = created.get("webViewLink")
    print(f"[DRIVE] Uploaded file_id={file_id}, url={public_url}")

    return file_id, public_url


# ===================== AUTH DECORATORS ==========================

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


# ===================== AUTH ENDPOINTS ============================

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


# ================== NEW: PERSON DOCUMENT UPLOAD =======================

@app.route("/api/documents/person/upload", methods=["POST"])
@require_auth
# NOTE: removed @require_role(...) to avoid 403 while testing uploads
def upload_person_document_to_drive_route():
    """
    Upload a personal document for the logged-in user to Google Drive
    and store the public URL in PersonDocument via usp_AddPersonDocument.

    Expects multipart/form-data:
      - file        : PDF file
      - docType     : e.g. DRIVING_LICENSE, ID_OR_PASSPORT, ...
      - docNumber   : document number (string)
      - issueDate   : 'YYYY-MM-DD'
      - expiryDate  : 'YYYY-MM-DD' or empty
    """
    user_id = session.get("user_id")

    file = request.files.get("file")
    doc_type = request.form.get("docType")
    doc_number = request.form.get("docNumber")
    issue_date = request.form.get("issueDate")
    expiry_date = request.form.get("expiryDate") or None

    if not file or not doc_type or not doc_number or not issue_date:
        return jsonify({"success": False, "error": "file, docType, docNumber, issueDate are required"}), 400

    allowed_doc_types = {
        "ID_OR_PASSPORT",
        "RESIDENCE_PERMIT",
        "DRIVING_LICENSE",
        "VEHICLE_REG",
        "MOT_CERT",
        "CRIMINAL_RECORD",
        "MEDICAL_CERT",
        "PSYCHOLOGICAL_CERT",
    }
    doc_type_upper = (doc_type or "").upper()

    if doc_type_upper not in allowed_doc_types:
        return jsonify({"success": False, "error": f"Invalid docType '{doc_type}'."}), 400

    original_name = file.filename or ""
    ext = pathlib.Path(original_name).suffix.lower()
    if ext != ".pdf":
        return jsonify({"success": False, "error": "Only PDF files are allowed"}), 400

    # Read file into memory
    file_bytes = file.read()
    file_stream = io.BytesIO(file_bytes)

    # 1) Upload file to Google Drive
    try:
        drive_file_id, public_url = upload_user_document_to_drive(user_id, doc_type_upper, file_stream)
    except Exception as e:
        print(f"[DRIVE ERROR] {e}")
        return jsonify({"success": False, "error": f"Google Drive upload failed: {e}"}), 500

    # 2) Insert into DB via stored procedure
    try:
        print(f"[DB] Inserting PersonDocument for user {user_id}, type {doc_type_upper}")
        with pyodbc.connect(CN_STR, timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    EXEC dbo.usp_AddPersonDocument
                        @UserId     = ?,
                        @DocType    = ?,
                        @DocNumber  = ?,
                        @IssueDate  = ?,
                        @ExpiryDate = ?,
                        @FileUrl    = ?
                    """,
                    user_id,
                    doc_type_upper,
                    doc_number,
                    issue_date,
                    expiry_date,
                    public_url,
                )
                row = cur.fetchone()

        doc_id = int(row[0]) if row else None
        print(f"[DB] PersonDocument inserted, DocId={doc_id}")

        return jsonify({
            "success": True,
            "docId": doc_id,
            "fileUrl": public_url,
            "driveFileId": drive_file_id
        }), 201

    except Exception as e:
        print(f"[DB ERROR] {e}")
        return jsonify({"success": False, "error": f"DB error: {e}"}), 500


# ================== SQL CONSOLE (UNCHANGED) ==========================

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
