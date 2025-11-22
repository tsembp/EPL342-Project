import os
import uuid
import random
import pyodbc
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------
# ENV-BASED CONNECTION STRING (your format)
# ---------------------------------------------------

CN_STR = (
    "Driver={ODBC Driver 18 for SQL Server};"
    f"Server={os.getenv('DB_HOST')},1433;"
    f"Database={os.getenv('DB_NAME')};"
    f"UID={os.getenv('DB_NAME')};PWD={os.getenv('DB_PASS')};"
    "Encrypt=yes;TrustServerCertificate=yes"
)


def get_connection():
    return pyodbc.connect(CN_STR, autocommit=False)


# ---------------------------------------------------
# CONFIG – you can tune these
# ---------------------------------------------------

CONFIG = {
    "NUM_ADMINS": 2,
    "NUM_OPERATORS": 3,
    "NUM_DRIVERS": 10,
    "NUM_PASSENGERS": 20,
    "NUM_COMPANY_REPS": 3,
    "NUM_VEHICLES": 15,
    "NUM_ZONES": 8,
    "NUM_RIDE_REQUESTS": 25,
    "NUM_RIDES": 20,
    "NUM_RATINGS": 30,
    "NUM_PERSON_DOCS_PER_USER": 1,
    "NUM_VEHICLE_DOCS_PER_VEHICLE": 1,
}

# ---------------------------------------------------
# COMBO SPECS – AllowedRideProfile + types
# ---------------------------------------------------

combo_specs = [
    ("simple_route", "vehicle_with_driver", "Sedan", "Simple passenger ride with sedan"),
    ("simple_route", "vehicle_with_driver", "Hatchback", "Simple passenger ride with hatchback"),
    ("simple_route", "vehicle_with_driver", "SUV", "Simple passenger ride with suv"),
    ("simple_route", "vehicle_with_driver", "Coupe", "Simple passenger ride with coupe"),
    ("simple_route", "vehicle_with_driver", "Convertible", "Simple passenger ride with convertible"),
    ("simple_route", "vehicle_with_driver", "Crossover", "Simple passenger ride with crossover"),
    ("simple_route", "vehicle_with_driver", "Electric Car", "Simple passenger ride with electric car"),
    ("simple_route", "vehicle_with_driver", "Hybrid Car", "Simple passenger ride with hybrid car"),
    ("simple_route", "vehicle_with_driver", "Wagon", "Simple passenger ride with wagon"),
    ("luxury_route", "vehicle_with_driver", "Luxury Car", "Luxury passenger ride with luxury car"),
    ("luxury_route", "vehicle_with_driver", "Sports Car", "Luxury passenger ride with sports car"),
    ("luxury_route", "vehicle_with_driver", "SUV", "Luxury passenger ride with suv"),
    ("luxury_route", "vehicle_with_driver", "Electric Car", "Luxury passenger ride with electric car"),
    ("luxury_route", "vehicle_with_driver", "Minivan", "Luxury passenger ride with minivan"),
    ("bridged_route", "vehicle_with_driver", "Sedan", "Simple bridged passenger ride with sedan"),
    ("bridged_route", "vehicle_with_driver", "Hatchback", "Simple bridged passenger ride with hatchback"),
    ("bridged_route", "vehicle_with_driver", "SUV", "Simple bridged passenger ride with suv"),
    ("bridged_route", "vehicle_with_driver", "Coupe", "Simple bridged passenger ride with coupe"),
    ("bridged_route", "vehicle_with_driver", "Convertible", "Simple bridged passenger ride with convertible"),
    ("bridged_route", "vehicle_with_driver", "Crossover", "Simple bridged passenger ride with crossover"),
    ("bridged_route", "vehicle_with_driver", "Electric Car", "Simple bridged passenger ride with electric car"),
    ("bridged_route", "vehicle_with_driver", "Hybrid Car", "Simple bridged passenger ride with hybrid car"),
    ("bridged_route", "vehicle_with_driver", "Wagon", "Simple bridged passenger ride with wagon"),
    ("simple_route", "vehicle_no_driver", "Sedan", "Simple passenger ride (no driver) with sedan"),
    ("simple_route", "vehicle_no_driver", "Hatchback", "Simple passenger ride (no driver) with hatchback"),
    ("simple_route", "vehicle_no_driver", "SUV", "Simple passenger ride (no driver) with suv"),
    ("simple_route", "vehicle_no_driver", "Coupe", "Simple passenger ride (no driver) with coupe"),
    ("simple_route", "vehicle_no_driver", "Convertible", "Simple passenger ride (no driver) with convertible"),
    ("simple_route", "vehicle_no_driver", "Crossover", "Simple passenger ride (no driver) with crossover"),
    ("simple_route", "vehicle_no_driver", "Electric Car", "Simple passenger ride (no driver) with electric car"),
    ("simple_route", "vehicle_no_driver", "Hybrid Car", "Simple passenger ride (no driver) with hybrid car"),
    ("simple_route", "vehicle_no_driver", "Wagon", "Simple passenger ride (no driver) with wagon"),
    ("luxury_route", "vehicle_no_driver", "Luxury Car", "Luxury passenger ride (no driver) with luxury car"),
    ("luxury_route", "vehicle_no_driver", "Sports Car", "Luxury passenger ride (no driver) with sports car"),
    ("luxury_route", "vehicle_no_driver", "SUV", "Luxury passenger ride (no driver) with suv"),
    ("luxury_route", "vehicle_no_driver", "Electric Car", "Luxury passenger ride (no driver) with electric car"),
    ("luxury_route", "vehicle_no_driver", "Minivan", "Luxury passenger ride (no driver) with minivan"),
    ("bridged_route", "vehicle_no_driver", "Sedan", "Simple bridged passenger ride (no driver) with sedan"),
    ("bridged_route", "vehicle_no_driver", "Hatchback", "Simple bridged passenger ride (no driver) with hatchback"),
    ("bridged_route", "vehicle_no_driver", "SUV", "Simple bridged passenger ride (no driver) with suv"),
    ("bridged_route", "vehicle_no_driver", "Coupe", "Simple bridged passenger ride (no driver) with coupe"),
    ("bridged_route", "vehicle_no_driver", "Convertible", "Simple bridged passenger ride (no driver) with convertible"),
    ("bridged_route", "vehicle_no_driver", "Crossover", "Simple bridged passenger ride (no driver) with crossover"),
    ("bridged_route", "vehicle_no_driver", "Electric Car", "Simple bridged passenger ride (no driver) with electric car"),
    ("bridged_route", "vehicle_no_driver", "Hybrid Car", "Simple bridged passenger ride (no driver) with hybrid car"),
    ("bridged_route", "vehicle_no_driver", "Wagon", "Simple bridged passenger ride (no driver) with wagon"),
    ("simple_route", "teledriving", "Sedan", "Simple passenger ride (teledriving) with sedan"),
    ("simple_route", "teledriving", "Hatchback", "Simple passenger ride (teledriving) with hatchback"),
    ("simple_route", "teledriving", "SUV", "Simple passenger ride (teledriving) with suv"),
    ("simple_route", "teledriving", "Coupe", "Simple passenger ride (teledriving) with coupe"),
    ("simple_route", "teledriving", "Convertible", "Simple passenger ride (teledriving) with convertible"),
    ("simple_route", "teledriving", "Crossover", "Simple passenger ride (teledriving) with crossover"),
    ("simple_route", "teledriving", "Electric Car", "Simple passenger ride (teledriving) with electric car"),
    ("simple_route", "teledriving", "Hybrid Car", "Simple passenger ride (teledriving) with hybrid car"),
    ("simple_route", "teledriving", "Wagon", "Simple passenger ride (teledriving) with wagon"),
    ("luxury_route", "teledriving", "Luxury Car", "Luxury passenger ride (teledriving) with luxury car"),
    ("luxury_route", "teledriving", "Sports Car", "Luxury passenger ride (teledriving) with sports car"),
    ("luxury_route", "teledriving", "SUV", "Luxury passenger ride (teledriving) with suv"),
    ("luxury_route", "teledriving", "Electric Car", "Luxury passenger ride (teledriving) with electric car"),
    ("luxury_route", "teledriving", "Minivan", "Luxury passenger ride (teledriving) with minivan"),
    ("bridged_route", "teledriving", "Sedan", "Simple bridged passenger ride (teledriving) with sedan"),
    ("bridged_route", "teledriving", "Hatchback", "Simple bridged passenger ride (teledriving) with hatchback"),
    ("bridged_route", "teledriving", "SUV", "Simple bridged passenger ride (teledriving) with suv"),
    ("bridged_route", "teledriving", "Coupe", "Simple bridged passenger ride (teledriving) with coupe"),
    ("bridged_route", "teledriving", "Convertible", "Simple bridged passenger ride (teledriving) with convertible"),
    ("bridged_route", "teledriving", "Crossover", "Simple bridged passenger ride (teledriving) with crossover"),
    ("bridged_route", "teledriving", "Electric Car", "Simple bridged passenger ride (teledriving) with electric car"),
    ("bridged_route", "teledriving", "Hybrid Car", "Simple bridged passenger ride (teledriving) with hybrid car"),
    ("bridged_route", "teledriving", "Wagon", "Simple bridged passenger ride (teledriving) with wagon"),
    ("simple_route", "fully_autonomous", "Sedan", "Simple passenger ride (fully autonomous) with sedan"),
    ("simple_route", "fully_autonomous", "Hatchback", "Simple passenger ride (fully autonomous) with hatchback"),
    ("simple_route", "fully_autonomous", "SUV", "Simple passenger ride (fully autonomous) with suv"),
    ("simple_route", "fully_autonomous", "Coupe", "Simple passenger ride (fully autonomous) with coupe"),
    ("simple_route", "fully_autonomous", "Convertible", "Simple passenger ride (fully autonomous) with convertible"),
    ("simple_route", "fully_autonomous", "Crossover", "Simple passenger ride (fully autonomous) with crossover"),
    ("simple_route", "fully_autonomous", "Electric Car", "Simple passenger ride (fully autonomous) with electric car"),
    ("simple_route", "fully_autonomous", "Hybrid Car", "Simple passenger ride (fully autonomous) with hybrid car"),
    ("simple_route", "fully_autonomous", "Wagon", "Simple passenger ride (fully autonomous) with wagon"),
    ("luxury_route", "fully_autonomous", "Luxury Car", "Luxury passenger ride (fully autonomous) with luxury car"),
    ("luxury_route", "fully_autonomous", "Sports Car", "Luxury passenger ride (fully autonomous) with sports car"),
    ("luxury_route", "fully_autonomous", "SUV", "Luxury passenger ride (fully autonomous) with suv"),
    ("luxury_route", "fully_autonomous", "Electric Car", "Luxury passenger ride (fully autonomous) with electric car"),
    ("luxury_route", "fully_autonomous", "Minivan", "Luxury passenger ride (fully autonomous) with minivan"),
    ("bridged_route", "fully_autonomous", "Sedan", "Simple bridged passenger ride (fully autonomous) with sedan"),
    ("bridged_route", "fully_autonomous", "Hatchback", "Simple bridged passenger ride (fully autonomous) with hatchback"),
    ("bridged_route", "fully_autonomous", "SUV", "Simple bridged passenger ride (fully autonomous) with suv"),
    ("bridged_route", "fully_autonomous", "Coupe", "Simple bridged passenger ride (fully autonomous) with coupe"),
    ("bridged_route", "fully_autonomous", "Convertible", "Simple bridged passenger ride (fully autonomous) with convertible"),
    ("bridged_route", "fully_autonomous", "Crossover", "Simple bridged passenger ride (fully autonomous) with crossover"),
    ("bridged_route", "fully_autonomous", "Electric Car", "Simple bridged passenger ride (fully autonomous) with electric car"),
    ("bridged_route", "fully_autonomous", "Hybrid Car", "Simple bridged passenger ride (fully autonomous) with hybrid car"),
    ("bridged_route", "fully_autonomous", "Wagon", "Simple bridged passenger ride (fully autonomous) with wagon"),
    ("light_cargo", "small_cargo_van", "Van", "Light cargo transport with van"),
    ("light_cargo", "small_cargo_van", "Pickup Truck", "Light cargo transport with pickup truck"),
    ("light_cargo", "small_cargo_van", "Truck", "Light cargo transport with truck"),
    ("heavy_cargo", "small_cargo_van", "Minivan", "Heavy cargo transport with minivan"),
    ("heavy_cargo", "small_cargo_van", "Van", "Heavy cargo transport with van"),
    ("heavy_cargo", "small_cargo_van", "Truck", "Heavy cargo transport with truck"),
]

# ---------------------------------------------------
# GENERIC HELPERS
# ---------------------------------------------------

def insert_and_return_identity(cursor, sql, params):
    cursor.execute(sql, params)
    row = cursor.fetchone()
    return row[0]


def get_table_columns(cursor, table_name, schema="dbo"):
    """
    Returns {column_name: is_nullable ('YES'/'NO')} for the given table.
    Used to adapt inserts to your actual DB schema (e.g. VehicleType).
    """
    cursor.execute(
        """
        SELECT COLUMN_NAME, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        """,
        schema,
        table_name,
    )
    return {row[0]: row[1] for row in cursor.fetchall()}


FIRST_NAMES = ["John", "Maria", "Andreas", "Elena", "Nikos", "Anna", "George", "Sofia"]
LAST_NAMES = ["Doe", "Georgiou", "Kyriakou", "Charalambous", "Andreou", "Ioannou"]


def random_name():
    return random.choice(FIRST_NAMES), random.choice(LAST_NAMES)


def random_email(first, last):
    domain = random.choice(["example.com", "mail.com", "test.org"])
    return f"{first.lower()}.{last.lower()}@{domain}"


def random_phone():
    return f"+3579{random.randint(1000000, 9999999)}"


def random_address():
    return f"{random.randint(1, 200)} Some Street, Nicosia"


def random_dob():
    years_ago = random.randint(20, 60)
    return (datetime.utcnow() - timedelta(days=years_ago * 365)).date()


def random_future_date(days_min=30, days_max=365):
    base = datetime.utcnow() - timedelta(days=365)
    issue = base + timedelta(days=random.randint(0, 365))
    expiry = issue + timedelta(days=random.randint(days_min, days_max))
    return issue, expiry


def random_past_date(days_ago_max=30):
    """Generate a random datetime in the past (within the last N days)"""
    days_ago = random.randint(1, days_ago_max)
    return datetime.utcnow() - timedelta(days=days_ago)


def random_money(min_value=5.0, max_value=50.0):
    return round(random.uniform(min_value, max_value), 2)


# ---------------------------------------------------
# SEED FUNCTIONS
# ---------------------------------------------------

def seed_admins(cursor, num_admins):
    admin_ids = []
    for i in range(num_admins):
        admin_id = uuid.uuid4()
        username = f"admin{i+1}"
        password_hash = "$2a$10$fakeAdminHash"
        cursor.execute(
            """
            INSERT INTO [dbo].[Admin] (AdminId, Username, PasswordHash)
            VALUES (?, ?, ?)
            """,
            admin_id,
            username,
            password_hash,
        )
        admin_ids.append(admin_id)
    return admin_ids


def seed_operators(cursor, num_operators, admin_ids):
    operator_ids = []
    for i in range(num_operators):
        op_id = uuid.uuid4()
        username = f"operator{i+1}"
        password_hash = "$2a$10$fakeOperatorHash"
        email = f"{username}@ops.local"

        # Mix of verified and unverified operators (80% verified, 20% not verified)
        verified = 1 if random.random() < 0.8 else 0

        # Only verified operators have CheckedByAdmin and CheckedAt
        if verified and admin_ids:
            approved_by = random.choice(admin_ids)
            approved_at = random_past_date(60)  # Checked within last 60 days
            cursor.execute(
                """
                INSERT INTO [dbo].[Operator] (OperatorId, Email, Username, PasswordHash, Verified, CheckedByAdmin, CheckedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                op_id,
                email,
                username,
                password_hash,
                verified,
                approved_by,
                approved_at,
            )
        else:
            cursor.execute(
                """
                INSERT INTO [dbo].[Operator] (OperatorId, Email, Username, PasswordHash, Verified)
                VALUES (?, ?, ?, ?, ?)
                """,
                op_id,
                email,
                username,
                password_hash,
                verified,
            )

        operator_ids.append(op_id)
    return operator_ids


def seed_users_and_roles(cursor, num_drivers, num_passengers, num_company_reps):
    users = {"D": [], "P": [], "C": []}

    # Drivers - mix of verified and unverified (70% verified, 30% unverified)
    for i in range(num_drivers):
        uid = uuid.uuid4()
        first, last = random_name()
        email = f"driver{i+1}@seed.local"

        # 70% of drivers are verified
        verified = 1 if random.random() < 0.7 else 0

        cursor.execute(
            """
            INSERT INTO [dbo].[User] (
                UserId, FirstName, LastName, Role, Dob, Gender, Email,
                Phone, Address, Verified, Username, PasswordHash
            )
            VALUES (?, ?, ?, 'D', ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            uid,
            first,
            last,
            random_dob(),
            random.choice(["M", "F"]),
            email,
            random_phone(),
            random_address(),
            verified,
            f"driver{i+1}",
            "$2a$10$fakeDriverHash",
        )
        cursor.execute("INSERT INTO [dbo].[Driver] (UserId) VALUES (?)", uid)
        users["D"].append(uid)

    # Passengers
    for i in range(num_passengers):
        uid = uuid.uuid4()
        first, last = random_name()
        email = f"passenger{i+1}@seed.local"
        cursor.execute(
            """
            INSERT INTO [dbo].[User] (
                UserId, FirstName, LastName, Role, Dob, Gender, Email,
                Phone, Address, Verified, Username, PasswordHash
            )
            VALUES (?, ?, ?, 'P', ?, ?, ?, ?, ?, 1, ?, ?)
            """,
            uid,
            first,
            last,
            random_dob(),
            random.choice(["M", "F"]),
            email,
            random_phone(),
            random_address(),
            f"passenger{i+1}",
            "$2a$10$fakePassengerHash",
        )
        cursor.execute("INSERT INTO [dbo].[Passenger] (UserId) VALUES (?)", uid)
        users["P"].append(uid)

    # Company reps
    for i in range(num_company_reps):
        uid = uuid.uuid4()
        first, last = random_name()
        company = f"Company {i+1}"
        email = f"company{i+1}@seed.local"
        cursor.execute(
            """
            INSERT INTO [dbo].[User] (
                UserId, FirstName, LastName, Role, Dob, Gender, Email,
                Phone, Address, Verified, Username, PasswordHash
            )
            VALUES (?, ?, ?, 'C', ?, ?, ?, ?, ?, 0, ?, ?)
            """,
            uid,
            first,
            last,
            random_dob(),
            random.choice(["M", "F"]),
            email,
            random_phone(),
            random_address(),
            f"company{i+1}",
            "$2a$10$fakeCompanyHash",
        )
        cursor.execute(
            "INSERT INTO [dbo].[CompanyRepresentative] (UserId, Company) VALUES (?, ?)",
            uid,
            company,
        )
        users["C"].append(uid)

    return users


def seed_user_preferences(cursor, all_user_ids):
    for uid in all_user_ids:
        lang = random.choice(["en", "el", "de"])
        cursor.execute(
            """
            INSERT INTO [dbo].[UserPreferences] (UserId, NotificationsEnabled, Language, LocEnabled, Timezone)
            VALUES (?, ?, ?, ?, ?)
            """,
            uid,
            random.choice([0, 1]),
            lang,
            random.choice([0, 1]),
            "Europe/Nicosia",
        )


def seed_service_ride_vehicle_types_from_combos(cursor):
    """
    Use combo_specs to seed:
      - Servicetype (Name = route type)
      - Ridetype (Name = ride mode)
      - VehicleType (Name = car/vehicle type)
    Adapts to your actual VehicleType schema (no assumptions about MinCargoVolume etc).
    Returns three dicts: {name: id}
    """
    service_names = sorted({c[0] for c in combo_specs})
    ride_names = sorted({c[1] for c in combo_specs})
    vehicle_names = sorted({c[2] for c in combo_specs})

    service_type_ids = {}
    ride_type_ids = {}
    vehicle_type_ids = {}

    # Servicetype (IDENTITY)
    for name in service_names:
        desc = f"Service route type: {name}"
        base_fare = random_money(3, 8)
        per_km = random_money(0.5, 2)
        per_min = random_money(0.1, 0.5)
        valid_from = datetime.utcnow() - timedelta(days=30)
        sid = insert_and_return_identity(
            cursor,
            """
            INSERT INTO [dbo].[Servicetype] (
                Name, Description, BaseFare, PerKm, PerMin, ValidFrom, Active
            )
            OUTPUT INSERTED.ServiceTypeId
            VALUES (?, ?, ?, ?, ?, ?, 1)
            """,
            (name, desc, base_fare, per_km, per_min, valid_from),
        )
        service_type_ids[name] = sid

    # Ridetype (IDENTITY)
    for name in ride_names:
        desc = f"Ride mode: {name}"
        rid = insert_and_return_identity(
            cursor,
            """
            INSERT INTO [dbo].[Ridetype] (Name, Description)
            OUTPUT INSERTED.RideTypeId
            VALUES (?, ?)
            """,
            (name, desc),
        )
        ride_type_ids[name] = rid

    # VehicleType (IDENTITY) – adapt to actual columns
    vehicle_type_specs = {
        "Sedan": (4, 0.40, 0),
        "Hatchback": (4, 0.35, 0),
        "SUV": (5, 0.80, 0),
        "Coupe": (2, 0.25, 0),
        "Convertible": (2, 0.20, 0),
        "Crossover": (5, 0.60, 0),
        "Electric Car": (5, 0.35, 0),
        "Hybrid Car": (5, 0.40, 0),
        "Wagon": (5, 0.70, 0),
        "Luxury Car": (4, 0.45, 0),
        "Sports Car": (2, 0.15, 0),
        "Minivan": (random.randint(6, 8), 1.00, 0),
        "Van": (2, 3.00, 500.00),
        "Pickup Truck": (2, 1.50, 800.00),
        "Truck": (2, 10.00, 2000.00),
    }

    vehicle_type_columns = get_table_columns(cursor, "VehicleType")

    for name in vehicle_names:
        num_seats, min_cargo_vol, min_cargo_weight = vehicle_type_specs.get(
            name, (2, 0.30, 0)
        )

        cols = ["Name"]
        params = [name]

        # If Description exists, fill it
        if "Description" in vehicle_type_columns:
            cols.append("Description")
            params.append(f"Vehicle type: {name}")

        # Only include these if the columns *exist* in your DB
        if "MinCargoVolume" in vehicle_type_columns:
            cols.append("MinCargoVolume")
            params.append(min_cargo_vol)

        if "MinCargoWeight" in vehicle_type_columns:
            cols.append("MinCargoWeight")
            params.append(min_cargo_weight)

        if "NumOfSeats" in vehicle_type_columns:
            cols.append("NumOfSeats")
            params.append(num_seats)

        col_list = ", ".join(f"[{c}]" for c in cols)
        placeholders = ", ".join("?" for _ in cols)

        sql = f"""
            INSERT INTO [dbo].[VehicleType] ({col_list})
            OUTPUT INSERTED.VehicleTypeId
            VALUES ({placeholders})
        """

        vid = insert_and_return_identity(cursor, sql, tuple(params))
        vehicle_type_ids[name] = vid

    return service_type_ids, ride_type_ids, vehicle_type_ids


def seed_zones(cursor, num_zones):
    """
    Create geofence zones using the grid logic.
    Returns: (zone_ids list, grid 2D array)
    """
    MIN_LAT = 34.56
    MAX_LAT = 35.20
    MIN_LNG = 32.30
    MAX_LNG = 34.10
    CELL_SIZE = 0.10

    num_rows = int((MAX_LAT - MIN_LAT) / CELL_SIZE)
    num_cols = int((MAX_LNG - MIN_LNG) / CELL_SIZE)

    zone_ids = []
    grid = []

    for r in range(num_rows):
        row_ids = []
        for c in range(num_cols):
            minlat = MIN_LAT + r * CELL_SIZE
            maxlat = minlat + CELL_SIZE
            minlng = MIN_LNG + c * CELL_SIZE
            maxlng = minlng + CELL_SIZE

            zone_id = insert_and_return_identity(
                cursor,
                """
                INSERT INTO [dbo].[Geofencezone] (MinLat, MinLng, MaxLat, MaxLng, Name, CreatedAt)
                OUTPUT INSERTED.ZoneId
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    minlat,
                    minlng,
                    maxlat,
                    maxlng,
                    f"Zone {len(zone_ids)+1}",
                    datetime.utcnow(),
                ),
            )
            zone_ids.append(zone_id)
            row_ids.append(zone_id)
        grid.append(row_ids)

    return zone_ids, grid


def seed_zone_points(cursor, zone_ids):
    """
    Create ZonePoints for each zone:
    - 2-3 stations (type 'S') for pickup/dropoff
    - 4 bridge endpoints (type 'B') at zone boundaries
    Returns: dict mapping zone_id -> {'stations': [...], 'bridges': {...}}
    """
    zone_points = {}

    for zone_id in zone_ids:
        cursor.execute(
            "SELECT MinLat, MinLng, MaxLat, MaxLng FROM [dbo].[Geofencezone] WHERE ZoneId = ?",
            zone_id,
        )
        row = cursor.fetchone()
        min_lat, min_lng, max_lat, max_lng = row

        mid_lat = (float(min_lat) + float(max_lat)) / 2
        mid_lng = (float(min_lng) + float(max_lng)) / 2

        station_points = []
        bridge_points = {}

        num_stations = random.randint(2, 3)
        for i in range(num_stations):
            lat = random.uniform(float(min_lat), float(max_lat))
            lng = random.uniform(float(min_lng), float(max_lng))

            point_id = insert_and_return_identity(
                cursor,
                """
                INSERT INTO [dbo].[ZonePoint] (ZoneId, Latitude, Longitude, PointType, Name, IsPickupAllowed, IsDropoffAllowed)
                OUTPUT INSERTED.PointId
                VALUES (?, ?, ?, 'S', ?, 1, 1)
                """,
                (zone_id, round(lat, 6), round(lng, 6), f"Station {i+1}"),
            )
            station_points.append(point_id)

        # Top
        bridge_points["top"] = insert_and_return_identity(
            cursor,
            """
            INSERT INTO [dbo].[ZonePoint] (ZoneId, Latitude, Longitude, PointType, Name, IsPickupAllowed, IsDropoffAllowed)
            OUTPUT INSERTED.PointId
            VALUES (?, ?, ?, 'B', ?, 0, 0)
            """,
            (zone_id, float(max_lat), mid_lng, "Bridge North"),
        )

        # Right
        bridge_points["right"] = insert_and_return_identity(
            cursor,
            """
            INSERT INTO [dbo].[ZonePoint] (ZoneId, Latitude, Longitude, PointType, Name, IsPickupAllowed, IsDropoffAllowed)
            OUTPUT INSERTED.PointId
            VALUES (?, ?, ?, 'B', ?, 0, 0)
            """,
            (zone_id, mid_lat, float(max_lng), "Bridge East"),
        )

        # Bottom
        bridge_points["bottom"] = insert_and_return_identity(
            cursor,
            """
            INSERT INTO [dbo].[ZonePoint] (ZoneId, Latitude, Longitude, PointType, Name, IsPickupAllowed, IsDropoffAllowed)
            OUTPUT INSERTED.PointId
            VALUES (?, ?, ?, 'B', ?, 0, 0)
            """,
            (zone_id, float(min_lat), mid_lng, "Bridge South"),
        )

        # Left
        bridge_points["left"] = insert_and_return_identity(
            cursor,
            """
            INSERT INTO [dbo].[ZonePoint] (ZoneId, Latitude, Longitude, PointType, Name, IsPickupAllowed, IsDropoffAllowed)
            OUTPUT INSERTED.PointId
            VALUES (?, ?, ?, 'B', ?, 0, 0)
            """,
            (zone_id, mid_lat, float(min_lng), "Bridge West"),
        )

        zone_points[zone_id] = {"stations": station_points, "bridges": bridge_points}

    return zone_points


def seed_bridges(cursor, grid, zone_points):
    """
    Create bridges connecting adjacent zones (right and down neighbors).
    """
    bridge_ids = []
    bridge_map = {}
    num_rows = len(grid)
    num_cols = len(grid[0])

    for r in range(num_rows):
        for c in range(num_cols):
            current = grid[r][c]

            if c < num_cols - 1:
                right = grid[r][c + 1]
                point_id = zone_points[current]["bridges"]["right"]

                bridge_id = insert_and_return_identity(
                    cursor,
                    """
                    INSERT INTO [dbo].[Bridge] (PointId, FromZoneId, ToZoneId, Name)
                    OUTPUT INSERTED.BridgeId
                    VALUES (?, ?, ?, ?)
                    """,
                    (point_id, current, right, f"Bridge {len(bridge_ids)+1}"),
                )
                bridge_ids.append(bridge_id)
                bridge_map[(current, right)] = bridge_id

            if r < num_rows - 1:
                down = grid[r + 1][c]
                point_id = zone_points[current]["bridges"]["bottom"]

                bridge_id = insert_and_return_identity(
                    cursor,
                    """
                    INSERT INTO [dbo].[Bridge] (PointId, FromZoneId, ToZoneId, Name)
                    OUTPUT INSERTED.BridgeId
                    VALUES (?, ?, ?, ?)
                    """,
                    (point_id, current, down, f"Bridge {len(bridge_ids)+1}"),
                )
                bridge_ids.append(bridge_id)
                bridge_map[(current, down)] = bridge_id

    return bridge_ids, bridge_map


def get_random_station_in_zone(zone_id, zone_points):
    stations = zone_points[zone_id]["stations"]
    return random.choice(stations) if stations else None


def seed_vehicles(cursor, num_vehicles, vehicle_type_ids, owner_user_ids):
    vehicle_ids = []
    vehicle_type_name_list = list(vehicle_type_ids.keys())

    brands = [
        "Toyota",
        "Honda",
        "Ford",
        "Chevrolet",
        "BMW",
        "Mercedes-Benz",
        "Audi",
        "Volkswagen",
        "Nissan",
        "Hyundai",
        "Tesla",
        "Mazda",
    ]
    models = [
        "Model S",
        "Civic",
        "Corolla",
        "F-150",
        "Camry",
        "Accord",
        "Mustang",
        "3 Series",
        "C-Class",
        "A4",
        "Model 3",
        "CX-5",
    ]
    colors = [
        "Black",
        "White",
        "Silver",
        "Blue",
        "Red",
        "Gray",
        "Green",
        "Yellow",
        "Orange",
        "Brown",
    ]

    for i in range(num_vehicles):
        vid = uuid.uuid4()
        vtype_name = random.choice(vehicle_type_name_list)
        vtype_id = vehicle_type_ids[vtype_name]
        owner = random.choice(owner_user_ids)

        plate_number = f"{random.choice(['CY', 'UK', 'DE', 'FR'])}-{random.randint(1000, 9999)}-{random.choice(['AA', 'BB', 'CC', 'DD'])}"
        brand = random.choice(brands)
        model = random.choice(models)
        color = random.choice(colors)

        seats = random.randint(2, 7)
        cargo_volume = round(random.uniform(0.0, 5.0), 2)
        cargo_weight = round(random.uniform(0.0, 500.0), 2)

        verified = 1 if random.random() < 0.7 else 0
        status = "Active" if verified else "Pending"

        cursor.execute(
            """
            INSERT INTO [dbo].[Vehicle] (
                VehicleId, VehicleTypeId, OwnerUserId, PlateNumber, Brand, Model, Color, 
                Verified, Seats, CargoVolume, CargoWeight, Status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            vid,
            vtype_id,
            owner,
            plate_number,
            brand,
            model,
            color,
            verified,
            seats,
            cargo_volume,
            cargo_weight,
            status,
        )
        vehicle_ids.append((vid, verified))
    return vehicle_ids


def seed_allowed_ride_profiles(cursor, service_type_ids, ride_type_ids, vehicle_type_ids):
    profile_ids = []
    for (service_name, ride_name, vehicle_name, description) in combo_specs:
        ride_profile_id = uuid.uuid4()
        sid = service_type_ids[service_name]
        rid = ride_type_ids[ride_name]
        vid = vehicle_type_ids[vehicle_name]
        profile_name = f"{service_name} | {ride_name} | {vehicle_name}"

        cursor.execute(
            """
            INSERT INTO [dbo].[AllowedRideProfile] (
                RideProfileId, ServiceTypeId, RideTypeId, VehicleTypeId, ProfileName
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            ride_profile_id,
            sid,
            rid,
            vid,
            profile_name,
        )
        profile_ids.append(ride_profile_id)

    return profile_ids


def find_path_between_zones(start_zone, end_zone, grid, bridge_map):
    zone_positions = {}
    for r in range(len(grid)):
        for c in range(len(grid[r])):
            zone_positions[grid[r][c]] = (r, c)

    if start_zone not in zone_positions or end_zone not in zone_positions:
        return []

    start_pos = zone_positions[start_zone]
    end_pos = zone_positions[end_zone]

    if start_pos == end_pos:
        return []

    path = []
    current_zone = start_zone
    current_pos = start_pos

    while current_pos != end_pos:
        current_row, current_col = current_pos
        target_row, target_col = end_pos

        possible_moves = []

        if target_col > current_col and current_col < len(grid[0]) - 1:
            next_zone = grid[current_row][current_col + 1]
            bridge_id = bridge_map.get((current_zone, next_zone))
            if bridge_id:
                possible_moves.append(
                    ("right", next_zone, bridge_id, (current_row, current_col + 1))
                )

        if target_col < current_col and current_col > 0:
            next_zone = grid[current_row][current_col - 1]
            bridge_id = bridge_map.get((next_zone, current_zone))
            if bridge_id:
                possible_moves.append(
                    ("left", next_zone, bridge_id, (current_row, current_col - 1))
                )

        if target_row > current_row and current_row < len(grid) - 1:
            next_zone = grid[current_row + 1][current_col]
            bridge_id = bridge_map.get((current_zone, next_zone))
            if bridge_id:
                possible_moves.append(
                    ("down", next_zone, bridge_id, (current_row + 1, current_col))
                )

        if target_row < current_row and current_row > 0:
            next_zone = grid[current_row - 1][current_col]
            bridge_id = bridge_map.get((next_zone, current_zone))
            if bridge_id:
                possible_moves.append(
                    ("up", next_zone, bridge_id, (current_row - 1, current_col))
                )

        if not possible_moves:
            print(
                f"⚠️  No valid moves from zone {current_zone} at {current_pos} to {end_zone} at {end_pos}"
            )
            break

        direction, next_zone, bridge_id, next_pos = random.choice(possible_moves)
        path.append((current_zone, next_zone, bridge_id))
        current_zone = next_zone
        current_pos = next_pos

    return path


def seed_itinerary_legs(cursor, ride_requests_info, bridge_map, grid, zone_points):
    leg_ids = []

    for (
        req_id,
        pickup_point,
        dropoff_point,
        start_zone,
        end_zone,
        is_bridged,
    ) in ride_requests_info:
        if not is_bridged or start_zone == end_zone:
            leg_id = insert_and_return_identity(
                cursor,
                """
                INSERT INTO [dbo].[ItineraryLeg] (SeqNo, RideRequestId, ZoneId, FromPointId, ToPointId)
                OUTPUT INSERTED.LegId
                VALUES (1, ?, ?, ?, ?)
                """,
                (req_id, start_zone, pickup_point, dropoff_point),
            )
            leg_ids.append(leg_id)
        else:
            path = find_path_between_zones(start_zone, end_zone, grid, bridge_map)

            if not path:
                print(
                    f"⚠️  No path found from zone {start_zone} to {end_zone}, creating single leg"
                )
                leg_id = insert_and_return_identity(
                    cursor,
                    """
                    INSERT INTO [dbo].[ItineraryLeg] (SeqNo, RideRequestId, ZoneId, FromPointId, ToPointId)
                    OUTPUT INSERTED.LegId
                    VALUES (1, ?, ?, ?, ?)
                    """,
                    (req_id, start_zone, pickup_point, dropoff_point),
                )
                leg_ids.append(leg_id)
                continue

            current_point = pickup_point
            for seq, (from_zone, to_zone, bridge_id) in enumerate(path, start=1):
                cursor.execute(
                    "SELECT PointId FROM [dbo].[Bridge] WHERE BridgeId = ?",
                    bridge_id,
                )
                bridge_point = cursor.fetchone()[0]

                is_last_leg = seq == len(path)

                if is_last_leg:
                    to_point = dropoff_point
                else:
                    to_point = bridge_point

                leg_id = insert_and_return_identity(
                    cursor,
                    """
                    INSERT INTO [dbo].[ItineraryLeg] (SeqNo, RideRequestId, ZoneId, FromPointId, ToPointId)
                    OUTPUT INSERTED.LegId
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (seq, req_id, from_zone, current_point, to_point),
                )
                leg_ids.append(leg_id)

                if not is_last_leg:
                    current_point = get_random_station_in_zone(to_zone, zone_points)

    return leg_ids


def seed_dispatch_offers(cursor, leg_ids, driver_ids):
    offer_ids = []
    for leg_id in leg_ids:
        recipient = random.choice(driver_ids)
        status = random.choice(["Sent", "Accepted", "Declined", "Expired"])

        offer_id = insert_and_return_identity(
            cursor,
            """
            INSERT INTO [dbo].[DispatchOffer] (
                LegId, RecipientUserId, Status
            )
            OUTPUT INSERTED.OfferId
            VALUES (?, ?, ?)
            """,
            (leg_id, recipient, status),
        )
        offer_ids.append(offer_id)

    return offer_ids


def seed_ride_requests(
    cursor, num_requests, passenger_ids, ride_profile_ids, zone_ids, zone_points
):
    request_info = []

    for _ in range(num_requests):
        passenger_id = random.choice(passenger_ids)
        profile_id = random.choice(ride_profile_ids)

        cursor.execute(
            """
            SELECT st.Name 
            FROM [dbo].[AllowedRideProfile] arp
            JOIN [dbo].[Servicetype] st ON arp.ServiceTypeId = st.ServiceTypeId
            WHERE arp.RideProfileId = ?
            """,
            profile_id,
        )
        service_row = cursor.fetchone()
        is_bridged = service_row and service_row[0] == "bridged_route"

        start_zone = random.choice(zone_ids)
        if is_bridged:
            end_zone = random.choice([z for z in zone_ids if z != start_zone])
        else:
            end_zone = start_zone

        pickup_point = get_random_station_in_zone(start_zone, zone_points)
        dropoff_point = get_random_station_in_zone(end_zone, zone_points)

        num_people = random.randint(1, 4)
        pickup_at = datetime.utcnow() + timedelta(hours=random.randint(1, 72))
        status = random.choice(["Pending", "Accepted", "Completed"])

        req_id = insert_and_return_identity(
            cursor,
            """
            INSERT INTO [dbo].[RideRequest] (
                PassengerId, NumOfPeople, PickupAt,
                PickUpPoint, DropOffPoint,
                Status, RideProfileId
            )
            OUTPUT INSERTED.RequestId
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                passenger_id,
                num_people,
                pickup_at,
                pickup_point,
                dropoff_point,
                status,
                profile_id,
            ),
        )
        request_info.append(
            (req_id, pickup_point, dropoff_point, start_zone, end_zone, is_bridged)
        )

    return request_info


def seed_rides(
    cursor, num_rides, driver_ids, passenger_ids, vehicle_ids, offer_ids
):
    rides_info = []

    for i in range(num_rides):
        if i >= len(offer_ids):
            break

        offer_id = offer_ids[i]
        driver_id = random.choice(driver_ids)
        passenger_id = random.choice(passenger_ids)
        vehicle_id = random.choice(vehicle_ids)

        started_at = datetime.utcnow() - timedelta(hours=random.randint(1, 72))
        duration = random.randint(10, 90)
        ended_at = started_at + timedelta(minutes=duration)
        price_final = random_money(10, 100)
        status = random.choice(['Completed', 'InProgress', 'Scheduled'])
        
        # Calculate distance and duration for completed/in-progress rides
        distance_km = None
        duration_minutes = None
        if status in ['Completed', 'InProgress']:
            # Generate realistic distance (2-50 km for typical urban rides)
            distance_km = round(random.uniform(2.0, 50.0), 2)
            # Use the calculated duration from timestamps
            duration_minutes = duration
        
        ride_id = insert_and_return_identity(
            cursor,
            """
            INSERT INTO [dbo].[Ride] (
                OfferId, DriverUserId, PassengerUserId, VehicleId,
                StartedAt, EndedAt, PriceFinal, Status, DistanceKm, DurationMinutes
            )
            OUTPUT INSERTED.RideId
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (offer_id, driver_id, passenger_id, vehicle_id, started_at, ended_at, price_final, status, distance_km, duration_minutes)
        )
        rides_info.append((ride_id, status, price_final))

    return rides_info


def seed_driver_availability(
    cursor, drivers, vehicles, service_type_ids, ride_type_ids, zone_ids
):
    cursor.execute(
        """
        SELECT EnrollId, UserId, VehicleId, ServiceType, RideType
        FROM [dbo].[UserServiceEnrollment]
        WHERE Status = 'Approved'
        """
    )
    enrollments = cursor.fetchall()

    if not enrollments:
        print("⚠️  No approved enrollments found for driver availability")
        return

    base_date = datetime.utcnow().date()

    for enroll_id, user_id, vehicle_id, service_type, ride_type in enrollments:
        num_days = random.randint(10, 20)

        for _ in range(num_days):
            availability_date = base_date + timedelta(days=random.randint(0, 30))
            zone_id = random.choice(zone_ids)

            start_hour = random.randint(6, 10)
            duration = random.randint(6, 10)
            end_hour = start_hour + duration

            starts_at = f"{start_hour:02d}:00:00"
            ends_at = f"{end_hour:02d}:00:00"
            is_recurring = random.choice([0, 1])

            try:
                cursor.execute(
                    """
                    INSERT INTO [dbo].[DriverAvailability] (
                        EnrollId, AvailabilityDate, GeofencezoneId,
                        StartsAt, EndsAt, IsRecurring, UpdatedAt
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        enroll_id,
                        availability_date,
                        zone_id,
                        starts_at,
                        ends_at,
                        is_recurring,
                        datetime.utcnow(),
                    ),
                )
            except:
                continue


def seed_payments(cursor, rides_info):
    payment_ids = []

    for (ride_id, status, amount) in rides_info:
        if status != "Completed":
            continue

        cursor.execute(
            "SELECT DriverUserId, PassengerUserId FROM [dbo].[Ride] WHERE RideId = ?",
            ride_id,
        )
        ride_row = cursor.fetchone()
        if not ride_row:
            continue

        driver_id, passenger_id = ride_row

        gross_amount = amount
        osrh_fee = round(gross_amount * 0.15, 2)
        driver_payout = round(gross_amount - osrh_fee, 2)

        payment_id = uuid.uuid4()
        method = random.choice(["CreditCard", "Cash"])
        paid_at = datetime.utcnow() - timedelta(minutes=random.randint(5, 60))

        cursor.execute(
            """
            INSERT INTO [dbo].[Payment] (
                PaymentId, SenderUserId, ReceiverUserId, 
                GrossAmount, OsrhFee, DriverPayout,
                Method, Status, PaidAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed', ?)
            """,
            (
                payment_id,
                passenger_id,
                driver_id,
                gross_amount,
                osrh_fee,
                driver_payout,
                method,
                paid_at,
            ),
        )

        cursor.execute(
            "UPDATE [dbo].[Ride] SET Payment = ? WHERE RideId = ?",
            (payment_id, ride_id),
        )

        payment_ids.append(payment_id)

    return payment_ids


def seed_ratings(cursor, num_ratings, rides_info):
    """
    Create ratings that respect:
      - Rating.RideId FK
      - FK to users
      - UQ(RideId, AuthorUserId, TargetUserId)
    We generate up to num_ratings ratings for completed rides.
    """
    rating_ids = []
    created = 0

    for (ride_id, status, _amount) in rides_info:
        if created >= num_ratings:
            break
        if status != "Completed":
            continue

        cursor.execute(
            "SELECT DriverUserId, PassengerUserId FROM [dbo].[Ride] WHERE RideId = ?",
            ride_id,
        )
        row = cursor.fetchone()
        if not row:
            continue
        driver_id, passenger_id = row

        # Passenger -> Driver
        if created < num_ratings:
            stars = random.randint(3, 5)
            comment = f"Passenger->Driver {stars} stars"
            rid = insert_and_return_identity(
                cursor,
                """
                INSERT INTO [dbo].[Rating] (RideId, AuthorUserId, TargetUserId, Stars, Comment)
                OUTPUT INSERTED.RatingId
                VALUES (?, ?, ?, ?, ?)
                """,
                (ride_id, passenger_id, driver_id, stars, comment),
            )
            rating_ids.append(rid)
            created += 1

        # Driver -> Passenger
        if created < num_ratings:
            stars = random.randint(3, 5)
            comment = f"Driver->Passenger {stars} stars"
            rid = insert_and_return_identity(
                cursor,
                """
                INSERT INTO [dbo].[Rating] (RideId, AuthorUserId, TargetUserId, Stars, Comment)
                OUTPUT INSERTED.RatingId
                VALUES (?, ?, ?, ?, ?)
                """,
                (ride_id, driver_id, passenger_id, stars, comment),
            )
            rating_ids.append(rid)
            created += 1

    return rating_ids


def seed_person_documents(cursor, user_ids, operator_ids):
    doc_types = [
        "ID_OR_PASSPORT",
        "RESIDENCE_PERMIT",
        "DRIVING_LICENSE",
        "VEHICLE_REG",
        "MOT_CERT",
        "CRIMINAL_RECORD",
        "MEDICAL_CERT",
        "PSYCHOLOGICAL_CERT",
    ]

    review_comments_options = [
        "Document verified and approved",
        "All information is correct and valid",
        "Document is valid and up to date",
        "Rejected: Document is expired",
        "Rejected: Information is unclear or illegible",
        "Rejected: Missing required information",
        "Rejected: Document appears to be fraudulent",
        None,
    ]

    user_verification_status = {}
    for uid in user_ids:
        cursor.execute("SELECT Verified FROM [dbo].[User] WHERE UserId = ?", uid)
        row = cursor.fetchone()
        user_verification_status[uid] = row[0] if row else 0

    for uid in user_ids:
        is_verified = user_verification_status[uid]

        if is_verified:
            documents_to_create = doc_types.copy()
        else:
            num_docs = random.randint(3, 7)
            documents_to_create = random.sample(doc_types, num_docs)

        for doc_type in documents_to_create:
            doc_no = f"DOC-{uuid.uuid4().hex[:12].upper()}"

            days_ago_upload = random.randint(10, 180)
            uploaded_at = datetime.utcnow() - timedelta(days=days_ago_upload)

            issue_date = uploaded_at - timedelta(
                days=random.randint(30, 730)
            )

            if doc_type in [
                "ID_OR_PASSPORT",
                "RESIDENCE_PERMIT",
                "DRIVING_LICENSE",
                "MOT_CERT",
            ]:
                expiry_date = issue_date + timedelta(
                    days=random.randint(365, 3650)
                )
            else:
                expiry_date = None

            file_url = (
                f"https://files.local/userdocs/{uid}/{doc_type.lower()}.pdf"
            )

            if is_verified:
                status = "Accepted"
                reviewed_by = random.choice(operator_ids)
                reviewed_at = uploaded_at + timedelta(
                    days=random.randint(1, 7)
                )
                review_comments = random.choice(
                    [
                        c
                        for c in review_comments_options
                        if c and "Rejected" not in c
                    ]
                )
            else:
                status = random.choice(["Pending", "Accepted", "Rejected"])

                if status == "Pending":
                    reviewed_by = None
                    reviewed_at = None
                    review_comments = None
                else:
                    reviewed_by = random.choice(operator_ids)
                    reviewed_at = uploaded_at + timedelta(
                        days=random.randint(1, 7)
                    )
                    if status == "Accepted":
                        review_comments = random.choice(
                            [
                                c
                                for c in review_comments_options
                                if c and "Rejected" not in c
                            ]
                        )
                    else:
                        review_comments = random.choice(
                            [
                                c
                                for c in review_comments_options
                                if c and "Rejected" in c
                            ]
                        )

            cursor.execute(
                """
                INSERT INTO [dbo].[PersonDocument] (
                    UserId, DocType, DocNo, IssueDate, UploadedAt, ExpiryDate, 
                    Status, ReviewedByOperatorId, ReviewedAt, ReviewComments, FileUrl
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    uid,
                    doc_type,
                    doc_no,
                    issue_date,
                    uploaded_at,
                    expiry_date,
                    status,
                    reviewed_by,
                    reviewed_at,
                    review_comments,
                    file_url,
                ),
            )


def seed_vehicle_documents(
    cursor, vehicle_ids, docs_per_vehicle, operator_ids
):
    doc_types = [
        "VEHICLE_REGISTRATION",
        "MOT_CERTIFICATE",
        "VEHICLE_CLASSIFICATION_CERTIFICATE",
        "VEHICLE_IMAGE",
    ]
    review_comments_options = [
        "Document verified and approved",
        "All information is correct",
        "Document is valid and up to date",
        "Rejected: Document is expired",
        "Rejected: Information is unclear",
        "Rejected: Missing required information",
        None,
    ]

    for vid, is_verified in vehicle_ids:
        for _ in range(docs_per_vehicle):
            doc_type = random.choice(doc_types)
            issue, expiry = random_future_date(365, 365 * 5)
            file_url = f"https://files.local/vehicledocs/{vid}/{doc_type.replace(' ', '_').lower()}.pdf"

            if is_verified:
                status = "Accepted"
                accepted = 1
            else:
                status = random.choice(["Pending", "Accepted", "Rejected"])
                accepted = 1 if status == "Accepted" else 0

            if status in ["Accepted", "Rejected"] and operator_ids:
                reviewed_by = random.choice(operator_ids)
                reviewed_at = random_past_date(30)
                review_comments = random.choice(review_comments_options)

                insert_and_return_identity(
                    cursor,
                    """
                    INSERT INTO [dbo].[VehicleDocument] (
                        VehicleId, DocType, IssueDate, ExpiryDate, FileUrl, Accepted, Status,
                        ReviewedByOperatorId, ReviewedAt, ReviewComments
                    )
                    OUTPUT INSERTED.VehDocId
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        vid,
                        doc_type,
                        issue,
                        expiry,
                        file_url,
                        accepted,
                        status,
                        reviewed_by,
                        reviewed_at,
                        review_comments,
                    ),
                )
            else:
                insert_and_return_identity(
                    cursor,
                    """
                    INSERT INTO [dbo].[VehicleDocument] (
                        VehicleId, DocType, IssueDate, ExpiryDate, FileUrl, Accepted, Status
                    )
                    OUTPUT INSERTED.VehDocId
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        vid,
                        doc_type,
                        issue,
                        expiry,
                        file_url,
                        accepted,
                        status,
                    ),
                )


def seed_user_service_enrollments(
    cursor, drivers, vehicles, service_type_ids, ride_type_ids, operator_ids
):
    service_ids_list = list(service_type_ids.values())
    ride_ids_list = list(ride_type_ids.values())

    for driver in drivers:
        vehicle = random.choice(vehicles)
        service_type = random.choice(service_ids_list)
        ride_type = random.choice(ride_ids_list)

        status = random.choice(["Pending", "Approved", "Rejected"])
        checked_at = None
        checked_by = None

        if status in ["Approved", "Rejected"] and operator_ids:
            checked_at = datetime.utcnow()
            checked_by = random.choice(operator_ids)

        insert_and_return_identity(
            cursor,
            """
            INSERT INTO [dbo].[UserServiceEnrollment] (
                UserId,
                VehicleId,
                ServiceType,
                RideType,
                Status,
                CheckedAt,
                CheckedById
            )
            OUTPUT INSERTED.EnrollId
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (driver, vehicle, service_type, ride_type, status, checked_at, checked_by),
        )


# ---------------------------------------------------
# MAIN
# ---------------------------------------------------

def main():
    conn = get_connection()
    try:
        cursor = conn.cursor()

        print("Seeding Admins...")
        admin_ids = seed_admins(cursor, CONFIG["NUM_ADMINS"])

        print("Seeding Operators...")
        operator_ids = seed_operators(cursor, CONFIG["NUM_OPERATORS"], admin_ids)

        print("Seeding Users & Roles...")
        users = seed_users_and_roles(
            cursor,
            CONFIG["NUM_DRIVERS"],
            CONFIG["NUM_PASSENGERS"],
            CONFIG["NUM_COMPANY_REPS"],
        )
        driver_ids = users["D"]
        passenger_ids = users["P"]
        company_rep_ids = users["C"]
        all_user_ids = driver_ids + passenger_ids + company_rep_ids

        print("Seeding UserPreferences...")
        seed_user_preferences(cursor, all_user_ids)

        print("Seeding ServiceTypes, RideTypes, VehicleTypes from combo_specs...")
        (
            service_type_ids,
            ride_type_ids,
            vehicle_type_ids,
        ) = seed_service_ride_vehicle_types_from_combos(cursor)

        print("Seeding Zones...")
        zone_ids, grid = seed_zones(cursor, CONFIG["NUM_ZONES"])

        print("Seeding ZonePoints (stations and bridge endpoints)...")
        zone_points = seed_zone_points(cursor, zone_ids)

        print("Seeding Bridges...")
        bridge_ids, bridge_map = seed_bridges(cursor, grid, zone_points)

        print("Seeding Vehicles...")
        vehicle_ids_with_status = seed_vehicles(
            cursor,
            CONFIG["NUM_VEHICLES"],
            vehicle_type_ids,
            owner_user_ids=driver_ids + company_rep_ids,
        )
        vehicle_ids = [vid for vid, _ in vehicle_ids_with_status]

        print("Seeding AllowedRideProfiles from combo_specs...")
        ride_profile_ids = seed_allowed_ride_profiles(
            cursor, service_type_ids, ride_type_ids, vehicle_type_ids
        )

        print("Seeding UserServiceEnrollments...")
        seed_user_service_enrollments(
            cursor,
            drivers=driver_ids,
            vehicles=vehicle_ids,
            service_type_ids=service_type_ids,
            ride_type_ids=ride_type_ids,
            operator_ids=operator_ids,
        )

        print("Seeding Driver Availability...")
        seed_driver_availability(
            cursor, driver_ids, vehicle_ids, service_type_ids, ride_type_ids, zone_ids
        )

        print("Seeding RideRequests...")
        request_info = seed_ride_requests(
            cursor,
            CONFIG["NUM_RIDE_REQUESTS"],
            passenger_ids,
            ride_profile_ids,
            zone_ids,
            zone_points,
        )

        print("Seeding ItineraryLegs...")
        leg_ids = seed_itinerary_legs(cursor, request_info, bridge_map, grid, zone_points)

        print("Seeding DispatchOffers...")
        offer_ids = seed_dispatch_offers(cursor, leg_ids, driver_ids)

        print("Seeding Rides...")
        rides_info = seed_rides(
            cursor,
            CONFIG["NUM_RIDES"],
            driver_ids,
            passenger_ids,
            vehicle_ids,
            offer_ids,
        )

        print("Seeding Payments (only for completed rides)...")
        payment_ids = seed_payments(cursor, rides_info)

        print("Seeding Ratings...")
        rating_ids = seed_ratings(
            cursor,
            CONFIG["NUM_RATINGS"],
            rides_info,
        )

        print("Seeding PersonDocuments (only for Drivers and Company Representatives)...")
        users_with_documents = driver_ids + company_rep_ids
        seed_person_documents(cursor, users_with_documents, operator_ids)

        print("Seeding VehicleDocuments...")
        seed_vehicle_documents(
            cursor,
            vehicle_ids_with_status,
            CONFIG["NUM_VEHICLE_DOCS_PER_VEHICLE"],
            operator_ids,
        )

        conn.commit()
        print("Seeding completed successfully.")

    except Exception as e:
        conn.rollback()
        print("Error during seeding, rolled back transaction.")
        print(e)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
