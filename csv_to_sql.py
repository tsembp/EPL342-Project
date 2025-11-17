#!/usr/bin/env python3
import argparse
import csv
import re
from pathlib import Path

def sql_escape_value(value: str) -> str:
    """
    Convert a CSV cell value into a SQL literal.
    - Empty values become '' (empty string).
    - Single quotes are escaped as ''.
    """
    if value is None or value == "":
        return "''"

    # Escape single quotes by doubling them
    value = value.replace("'", "''")
    return f"'{value}'"


def csv_to_insert(csv_path: Path, schema: str = "dbo", table_name: str | None = None) -> str:
    """
    Read a CSV file and generate a batch INSERT statement.
    Assumptions:
    - First row contains column names.
    - Every value is treated as a string and quoted.
    """
    if table_name is None:
        table_name = csv_path.stem

    full_table = f"[{schema}].[{table_name}]"

    with csv_path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        columns = reader.fieldnames
        if not columns:
            raise ValueError(f"CSV file has no header / columns: {csv_path}")

        # Build column list: ([Col1], [Col2], ...)
        col_list_sql = ", ".join(f"[{col}]" for col in columns)
        header = f"INSERT INTO {full_table} ({col_list_sql}) VALUES"

        values_sql_lines = []
        for row in reader:
            row_values = [sql_escape_value(row.get(col, "")) for col in columns]
            row_sql = "    (" + ", ".join(row_values) + ")"
            values_sql_lines.append(row_sql)

    if not values_sql_lines:
        raise ValueError(f"CSV file has no data rows: {csv_path}")

    sql = header + "\n" + ",\n".join(values_sql_lines) + ";"
    return sql


def main():
    parser = argparse.ArgumentParser(
        description="Scan ./seed_data for CSVs and generate separate .sql files with INSERT statements."
    )
    parser.add_argument(
        "--schema",
        default="dbo",
        help="Schema name (default: dbo).",
    )
    parser.add_argument(
        "--dir",
        default="seed_data",
        help="Directory (relative to current working directory) to scan for CSV files. Default: seed_data",
    )
    parser.add_argument(
        "--out-dir",
        default="seed_sql",
        help="Output directory for .sql files (default: seed_sql).",
    )

    args = parser.parse_args()

    base_dir = Path.cwd()
    seed_dir = base_dir / args.dir
    out_dir = base_dir / args.out_dir

    if not seed_dir.exists() or not seed_dir.is_dir():
        raise SystemExit(f"Directory not found or not a directory: {seed_dir}")

    csv_files = sorted(seed_dir.glob("*.csv"))
    if not csv_files:
        raise SystemExit(f"No CSV files found in directory: {seed_dir}")

    out_dir.mkdir(parents=True, exist_ok=True)

    for csv_path in csv_files:
        print(f"Processing {csv_path}...")
        table_name = csv_path.stem
        try:
            stmt = csv_to_insert(csv_path, schema=args.schema, table_name=table_name)
        except Exception as e:
            raise SystemExit(f"Error processing {csv_path}: {e}")

        output_path = out_dir / f"{table_name}.sql"
        with output_path.open("w", encoding="utf-8") as f:
            f.write(stmt + "\n")

        print(f"  -> Wrote {output_path}")

    print(f"Done. All SQL files written to: {out_dir}")


if __name__ == "__main__":
    main()
