import os
import secrets
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask / session config
    SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(32))
    SESSION_TYPE = "filesystem"
    SESSION_PERMANENT = False
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    SESSION_COOKIE_SECURE = False  # True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    # CORS
    CORS_ORIGINS = [
        "http://localhost:8080",
        "http://[::]:8080",
    ]

    # DB connection string
    CN_STR = (
        "DRIVER={ODBC Driver 18 for SQL Server};"
        f"SERVER={os.getenv('DB_HOST')},1433;"
        f"DATABASE={os.getenv('DB_NAME')};"
        f"UID={os.getenv('DB_USERNAME')};"
        f"PWD={os.getenv('DB_PASS')};"
        "Encrypt=yes;"
        "TrustServerCertificate=yes;"
    )
