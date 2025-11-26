# app.py
from flask import Flask
from flask_session import Session
from flask_cors import CORS

from config import Config

from auth import auth_bp
from stations import stations_bp
from routing import route_bp
from passenger import passenger_bp
from driver import driver_bp
from operator_routes import operator_bp
from gdpr import gdpr_bp
from meta import meta_bp
from console import console_bp


app = Flask(__name__)
app.config.from_object(Config)

# Sessions
Session(app)

# CORS
CORS(
    app,
    resources={r"/*": {"origins": "http://localhost:8080"}},
    supports_credentials=True,
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(stations_bp)
app.register_blueprint(route_bp)
app.register_blueprint(passenger_bp)
app.register_blueprint(driver_bp)
app.register_blueprint(operator_bp)
app.register_blueprint(gdpr_bp)
app.register_blueprint(meta_bp)
app.register_blueprint(console_bp)


if __name__ == "__main__":
    app.run(debug=True)
