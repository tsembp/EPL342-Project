from functools import wraps
from flask import session, jsonify

def require_auth(f):
    """Decorator to protect routes - requires authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function


def require_role(*allowed_roles):
    """Decorator to check user role"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if "role" not in session or session["role"] not in allowed_roles:
                return jsonify({"error": "Unauthorized - insufficient permissions"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
