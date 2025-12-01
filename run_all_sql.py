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
    f"UID={os.getenv('DB_NAME')};PWD={os.getenv('DB_PASS')};"
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
    for root, dirs, files in os.walk(base_dir):
        dirs.sort()
        root_path = Path(root)
        is_root = (root_path == base_dir)

        for f in sorted(files):
            if f.lower().endswith(".sql"):
                if is_root or f == "availability_change.sql" or f == "DB_definition.sql" or f == "driver_photo.sql" or f == "gdpr_alter.sql" or f == "with_check_no_check.sql":
                    # skip files in the root directory
                    continue
                sql_files.append(root_path / f)

    return sql_files


def split_batches(sql_text: str):
    """
    Split SQL script into batches separated by GO.
    """
    pattern = r"^\s*GO\s*;?\s*$"
    batches = re.split(pattern, sql_text, flags=re.IGNORECASE | re.MULTILINE)
    return [b.strip() for b in batches if b.strip()]


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
            cursor.execute(batch)
            while cursor.nextset():
                pass
        conn.commit()
        return True, None
    except Exception as e:
        conn.rollback()
        return False, str(e)


def main():
    base_dir = Path(__file__).resolve().parent

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
