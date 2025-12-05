#!/usr/bin/env python3
import os
import sys
import re
from pathlib import Path
from dotenv import load_dotenv
import pyodbc

load_dotenv()

CONNECTION_STRING = (
    "Driver={ODBC Driver 18 for SQL Server};"
    f"Server={os.getenv('DB_HOST')},1433;"
    f"Database={os.getenv('DB_NAME')};"
    f"UID={os.getenv('DB_USERNAME')};PWD={os.getenv('DB_PASS')};"
    "Encrypt=yes;TrustServerCertificate=yes"
)


def get_connection():
    try:
        print(f"Connecting to the database with string:\n{CONNECTION_STRING}")
        conn = pyodbc.connect(CONNECTION_STRING, autocommit=False)
        return conn
    except Exception as e:
        print("ERROR: Could not connect to the database.")
        print(f"       {e}")
        sys.exit(1)


def find_sql_files(base_dir: Path):
    sql_files = []
    db_programming_dir = base_dir / "sql"
    
    if not db_programming_dir.exists():
        return sql_files
    
    # First, process views directory if it exists (priority)
    views_dir = db_programming_dir / "views"
    if views_dir.exists() and views_dir.is_dir():
        for f in sorted(views_dir.glob("*.sql")):
            sql_files.append(f)
    
    # Then process all subdirectories inside db_programming (excluding views since we already did it)
    for subdir in sorted(db_programming_dir.iterdir()):
        # Only process directories, skip files directly in db_programming
        if not subdir.is_dir():
            continue
        
        # Skip views directory (already processed)
        if subdir.name == "views":
            continue
        
        # Get all .sql files in this subdirectory (and its subdirectories)
        for f in sorted(subdir.rglob("*.sql")):
            sql_files.append(f)

    return sql_files


def execute_sql_file(conn, file_path: Path):
    """
    Execute all batches in a single .sql file in a transaction.
    If any batch fails, rollback and return (False, error_message).
    On success, commit and return (True, None).
    """
    text = file_path.read_text(encoding="utf-8", errors="ignore")
    batches = split_batches(text)
    cursor = conn.cursor()

    try:
        for batch in batches:
            # Handle CREATE OR ALTER for stored procedures
            if "CREATE PROCEDURE" in batch or "CREATE PROC" in batch:
                # Check if procedure already exists and drop it
                proc_match = re.search(r'CREATE\s+(?:PROCEDURE|PROC)\s+(?:\[?dbo\]?\.)?\[?(\w+)\]?', batch, re.IGNORECASE)
                if proc_match:
                    proc_name = proc_match.group(1)
                    drop_sql = f"IF OBJECT_ID('dbo.{proc_name}', 'P') IS NOT NULL DROP PROCEDURE dbo.{proc_name}"
                    cursor.execute(drop_sql)
            
            cursor.execute(batch)
            while cursor.nextset():
                pass
        conn.commit()
        return True, None
    except Exception as e:
        conn.rollback()
        return False, str(e)
    

def split_batches(sql_text: str):
    """
    Split SQL script into batches separated by GO.
    """
    pattern = r"^\s*GO\s*;?\s*$"
    batches = re.split(pattern, sql_text, flags=re.IGNORECASE | re.MULTILINE)
    return [b.strip() for b in batches if b.strip()]


def main():
    base_dir = Path(__file__).resolve().parent.parent

    print(f"Base directory : {base_dir}")
    print("Finding .sql files...\n")

    sql_files = find_sql_files(base_dir)
    if not sql_files:
        print("No .sql files found. Nothing to do.")
        return

    total_files = len(sql_files)
    print(f"Found {total_files} SQL file(s) to execute.\n")

    conn = get_connection()

    results = []  # {index, path, success, error}

    prev_dir = None

    for idx, file_path in enumerate(sql_files, start=1):
        rel_path = file_path.relative_to(base_dir)
        current_dir = rel_path.parent

        if current_dir != prev_dir:
            if str(current_dir) == ".":
                print("\n== Now in directory: (root of db_programming) ==")
            else:
                print(f"\n== Now in directory: {current_dir} ==")
            prev_dir = current_dir

        print(f"[{idx}/{total_files}] Executing: {rel_path}")

        success, error = execute_sql_file(conn, file_path)
        if success:
            print("    -> ✅ SUCCESS")
        else:
            print("    -> ❌ FAILED")
            print(f"       Error: {error}")

        results.append(
            {
                "index": idx,
                "path": str(rel_path),
                "success": success,
                "error": error,
            }
        )

    conn.close()

    print("\n======================================")
    print("        EXECUTION SUMMARY")
    print("======================================")

    success_count = sum(1 for r in results if r["success"])
    fail_count = total_files - success_count

    for r in results:
        status = "OK " if r["success"] else "FAIL"
        print(f"[{status}] {r['index']:>3}: {r['path']}")
        if not r["success"]:
            print(f"       Error: {r['error']}")

    print("\n--------------------------------------")
    print(f"Total files : {total_files}")
    print(f"Successful  : {success_count}")
    print(f"Failed      : {fail_count}")
    print("--------------------------------------")


if __name__ == "__main__":
    main()
