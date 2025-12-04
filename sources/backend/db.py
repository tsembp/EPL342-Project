import pyodbc
from flask import current_app

def get_connection(timeout: int = 10):
    """
    Usage:
        with get_connection() as conn:
            with conn.cursor() as cur:
                ...
    """
    cn_str = current_app.config["CN_STR"]
    return pyodbc.connect(cn_str, timeout=timeout)
