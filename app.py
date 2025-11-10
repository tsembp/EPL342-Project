from flask import Flask, render_template_string, request
import pyodbc
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Adjust for your server/auth
CN_STR = (
    "Driver={ODBC Driver 21 for SQL Server};"
    f"Server={os.getenv('DB_HOST')},1433;"
    f"Database={os.getenv('DB_NAME')};"
    f"UID={os.getenv('DB_NAME')};PWD={os.getenv('DB_PASS')};"
    "Encrypt=yes;TrustServerCertificate=yes"
)

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
