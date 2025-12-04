# console.py
from flask import Blueprint, render_template_string, request
from db import get_connection
import pyodbc

console_bp = Blueprint("console", __name__)

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
    <textarea name="sql" placeholder="SELECT TOP 50 * FROM dbo.[User];"></textarea>
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


@console_bp.route("/", methods=["GET", "POST"])
def index():
    error = None
    columns, rows = None, None
    if request.method == "POST":
        sql = (request.form.get("sql") or "").strip()

        first = sql.split(None, 1)[0].upper() if sql else ""
        if first != "SELECT":
            error = "Only SELECT statements are allowed in this console."
        else:
            if " TOP " not in sql.upper():
                sql = "SELECT TOP 100 * FROM (" + sql + ") AS t"

            try:
                with get_connection() as conn:
                    conn.add_output_converter(pyodbc.SQL_WVARCHAR, lambda x: x)
                    with conn.cursor() as cur:
                        cur.execute(sql)
                        cols = [c[0] for c in cur.description]
                        data = [dict(zip(cols, row)) for row in cur.fetchall()]
                        columns, rows = cols, data
            except Exception as e:
                error = str(e)

    return render_template_string(PAGE, error=error, columns=columns, rows=rows)
