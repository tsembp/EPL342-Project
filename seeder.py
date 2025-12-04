import os
import uuid
import random
import pyodbc
import pandas as pd
from datetime import datetime, timedelta, date, time, timezone
from pathlib import Path
from collections import deque
from dotenv import load_dotenv

load_dotenv()

# ==============================
# DB CONNECTION CONFIG
# ==============================
CN_STR = (
    "DRIVER={ODBC Driver 18 for SQL Server};"
    f"SERVER={os.getenv('DB_HOST')},1433;"
    f"DATABASE={os.getenv('DB_NAME')};"
    f"UID={os.getenv('DB_USERNAME')};"
    f"PWD={os.getenv('DB_PASS')};"
    "Encrypt=yes;"
    "TrustServerCertificate=yes;"
)

# ==============================
# SEEDER CONFIG – ALL COUNTS HERE
# ==============================
NUM_ADMINS = 1
NUM_OPERATORS = 3

NUM_PASSENGERS = 200
NUM_DRIVERS = 60
NUM_COMPANY_REPS = 60

NUM_INSPECTORS = 3
NUM_VEHICLES = 150
NUM_RIDE_REQUESTS = 2000

BATCH_SIZE = 200


def get_connection():
    # autocommit=False so we control the transaction
    return pyodbc.connect(CN_STR, autocommit=False)


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "map_zones"
ZONES_PATH = DATA_DIR / "zones"
ZONE_POINTS_PATH = DATA_DIR / "zone_points"
BRIDGES_PATH = DATA_DIR / "bridges"


# ==============================
# HELPER FUNCTIONS
# ==============================

def random_past_date(min_years_ago=18, max_years_ago=60):
    today = date.today()
    years = random.randint(min_years_ago, max_years_ago)
    return date(today.year - years, random.randint(1, 12), random.randint(1, 28))


def random_future_datetime(days_ahead=30):
    base = datetime.utcnow()
    return base + timedelta(
        days=random.randint(1, days_ahead),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )


def insert_with_identity(cursor, sql, params):
    cursor.execute(sql, params)
    cursor.execute("SELECT CAST(@@IDENTITY AS INT)")
    result = cursor.fetchone()
    return int(result[0]) if result and result[0] is not None else None


def fetch_all(cursor, sql, params=()):
    cursor.execute(sql, params)
    return cursor.fetchall()


def commit_batch(cursor, counter, label=""):
    """
    Commit every BATCH_SIZE rows to avoid blowing up the transaction log.
    """
    if counter % BATCH_SIZE == 0:
        cursor.connection.commit()
        print(f"Committed {counter} rows in {label}...")


def get_zone_graph(cursor):
    """
    Build an undirected graph of zones from Bridge table.
    Edge between FromZoneId and ToZoneId is bidirectional.
    """
    rows = fetch_all(
        cursor,
        "SELECT FromZoneId, ToZoneId FROM [dbo].[Bridge]"
    )
    graph = {}
    for a, b in rows:
        if a is None or b is None:
            continue
        graph.setdefault(a, set()).add(b)
        graph.setdefault(b, set()).add(a)
    return graph

# ==============================
# ZONES / POINTS / BRIDGES
# ==============================

def seed_geofence_data(cursor):
    print("Using paths:")
    print("  zones       ->", ZONES_PATH)
    print("  zone_points ->", ZONE_POINTS_PATH)
    print("  bridges     ->", BRIDGES_PATH)

    zones = pd.read_csv(ZONES_PATH)
    zone_points = pd.read_csv(ZONE_POINTS_PATH)
    bridges = pd.read_csv(BRIDGES_PATH)

    # 1) CLEAR ALL DATA THAT DEPENDS ON ZONES / ZONEPOINTS
    print("Clearing ride-related data that depends on zones/points...")

    cursor.execute("DELETE FROM [dbo].[Ride]")
    cursor.execute("DELETE FROM [dbo].[DispatchOffer]")
    cursor.execute("DELETE FROM [dbo].[RideRequestProgress]")
    cursor.execute("DELETE FROM [dbo].[RideRequest]")
    cursor.execute("DELETE FROM [dbo].[DriverAvailability]")

    # 2) CLEAR ZONE TABLES
    print("Clearing zone tables (Bridge, ZonePoint, GeofenceZone)...")

    cursor.execute("DELETE FROM [dbo].[Bridge]")
    cursor.execute("DELETE FROM [dbo].[ZonePoint]")
    cursor.execute("DELETE FROM [dbo].[GeofenceZone]")

    # Reset identities so CSV IDs line up
    cursor.execute("DBCC CHECKIDENT ('GeofenceZone', RESEED, 0)")
    cursor.execute("DBCC CHECKIDENT ('ZonePoint', RESEED, 0)")
    cursor.execute("DBCC CHECKIDENT ('Bridge', RESEED, 0)")

    # 3) RESEED FROM CSV

    print("Seeding GeofenceZone...")
    count = 0
    for _, row in zones.iterrows():
        cursor.execute(
            """
            INSERT INTO [dbo].[GeofenceZone] (MinLat, MinLng, MaxLat, MaxLng, Name, CreatedAt)
            VALUES (?, ?, ?, ?, ?, GETUTCDATE())
            """,
            float(row["MinLat"]),
            float(row["MinLng"]),
            float(row["MaxLat"]),
            float(row["MaxLng"]),
            row["Name"],
        )
        count += 1
        commit_batch(cursor, count, "GeofenceZone")
    print("✔ GeofenceZone seeded")

    print("Seeding ZonePoint...")
    count = 0
    for _, row in zone_points.iterrows():
        cursor.execute(
            """
            INSERT INTO [dbo].[ZonePoint] (
                ZoneId, Latitude, Longitude, PointType, Name, IsPickupAllowed, IsDropoffAllowed
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            int(row["ZoneId"]),
            float(row["Latitude"]),
            float(row["Longitude"]),
            row["PointType"],
            row["Name"],
            int(row["IsPickupAllowed"]),
            int(row["IsDropoffAllowed"]),
        )
        count += 1
        commit_batch(cursor, count, "ZonePoint")
    print("✔ ZonePoint seeded")

    print("Seeding Bridge...")
    count = 0
    for _, row in bridges.iterrows():
        cursor.execute(
            """
            INSERT INTO [dbo].[Bridge] (PointId, FromZoneId, ToZoneId, Name)
            VALUES (?, ?, ?, ?)
            """,
            int(row["PointId"]),
            int(row["FromZoneId"]),
            int(row["ToZoneId"]),
            row["Name"],
        )
        count += 1
        commit_batch(cursor, count, "Bridge")
    print("✔ Bridge seeded")


# ==============================
# ADMINS & OPERATORS
# ==============================

def seed_admins(cursor, num_admins):
    print("Seeding Admins...")
    admin_ids = []
    for i in range(num_admins):
        admin_id = uuid.uuid4()
        username = f"admin_{uuid.uuid4().hex[:8]}"
        email = f"{username}@admin.local"
        password_plain = "Admin123!"

        cursor.execute(
            """
            INSERT INTO [dbo].[Admin] (AdminId, Email, Username, PasswordHash)
            VALUES (?, ?, ?, dbo.fn_HashPassword(?))
            """,
            admin_id,
            email,
            username,
            password_plain,
        )
        admin_ids.append(admin_id)
        commit_batch(cursor, i + 1, "Admin")
    print(f"✔ Seeded {len(admin_ids)} admins")
    return admin_ids


def seed_operators(cursor, num_operators, admin_ids):
    print("Seeding Operators...")
    operator_ids = []
    for i in range(num_operators):
        op_id = uuid.uuid4()
        username = f"operator_{uuid.uuid4().hex[:8]}"
        email = f"{username}@operator.local"
        password_plain = "Operator123!"

        checked_by = random.choice(admin_ids) if admin_ids and random.random() < 0.7 else None
        checked_at = datetime.utcnow() if checked_by else None

        cursor.execute(
            """
            INSERT INTO [dbo].[Operator] (
                OperatorId, Email, Username, PasswordHash, Verified, CheckedByAdmin, CheckedAt, CreatedAt
            )
            VALUES (?, ?, ?, dbo.fn_HashPassword(?), ?, ?, ?, GETUTCDATE())
            """,
            op_id,
            email,
            username,
            password_plain,
            1 if checked_by else 0,
            checked_by,
            checked_at,
        )
        operator_ids.append(op_id)
        commit_batch(cursor, i + 1, "Operator")
    print(f"✔ Seeded {len(operator_ids)} operators")
    return operator_ids


# ==============================
# USERS & ROLE TABLES
# ==============================

FIRST_NAMES = [
    "Andreas", "Maria", "George", "Eleni", "Nikos", "Christina",
    "Marios", "Anna", "Kostas", "Eleni", "Petros", "Sophia"
]

LAST_NAMES = [
    "Papadopoulos", "Ioannou", "Georgiou", "Christodoulou",
    "Hadjiyiannis", "Demetriou", "Andreou", "Michaelides"
]


def seed_users(cursor, num_passengers, num_drivers, num_company):
    print("Seeding Users (Passengers, Drivers, Company Reps)...")

    passenger_ids = []
    driver_ids = []
    company_ids = []

    created_count = 0

    def create_user(role):
        nonlocal created_count
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        dob = random_past_date(20, 55)
        gender = random.choice(["M", "F"])
        phone = f"+3579{random.randint(1000000, 9999999)}"
        address = "Some street, Nicosia, Cyprus"
        password_plain = "User123!"

        # retry up to 10 times on unique constraint violations
        for _ in range(10):
            suffix = uuid.uuid4().hex[:8]
            username = f"{first.lower()}{last.lower()}{suffix}"
            email = f"{username}@seed.local"
            uid = uuid.uuid4()
            try:
                cursor.execute(
                    """
                    INSERT INTO [dbo].[User] (
                        UserId, FirstName, LastName, Role, Dob, Gender,
                        Email, Phone, Address, Username, PasswordHash, Verified
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, dbo.fn_HashPassword(?), ?)
                    """,
                    uid,
                    first,
                    last,
                    role,
                    dob,
                    gender,
                    email,
                    phone,
                    address,
                    username,
                    password_plain,
                    1 if role == 'P' else 0, # passengers auto-verified, drivers verified in seed_person_document
                )
                created_count += 1
                commit_batch(cursor, created_count, "User")
                return uid
            except pyodbc.IntegrityError as e:
                msg = str(e)
                # If username or email unique constraint hits, retry
                if "UQ_User_Username" in msg or "UQ_User_Email" in msg:
                    continue
                # Any other integrity error is real
                raise
        # If we somehow fail 10 times, just raise
        raise RuntimeError("Failed to generate unique user after 10 attempts")

    for _ in range(num_passengers):
        passenger_ids.append(create_user("P"))

    for _ in range(num_drivers):
        driver_ids.append(create_user("D"))

    for _ in range(num_company):
        company_ids.append(create_user("C"))

    print(f"✔ Seeded {len(passenger_ids)} passengers, {len(driver_ids)} drivers, {len(company_ids)} company reps")
    all_user_ids = passenger_ids + driver_ids + company_ids
    return passenger_ids, driver_ids, company_ids, all_user_ids


def seed_passengers(cursor, passenger_ids):
    print("Seeding Passenger table...")
    for i, uid in enumerate(passenger_ids, start=1):
        cursor.execute(
            """
            INSERT INTO [dbo].[Passenger] (UserId, CanDrive)
            VALUES (?, ?)
            """,
            uid,
            0, # temp all 0, later in seed_person_document we will update this to 1 for eligible
        )
        commit_batch(cursor, i, "Passenger table")
    print(f"✔ Seeded {len(passenger_ids)} passengers in Passenger")


def seed_drivers(cursor, driver_ids):
    print("Seeding Driver table...")
    for i, uid in enumerate(driver_ids, start=1):
        cursor.execute(
            """
            INSERT INTO [dbo].[Driver] (UserId, PhotoUrl)
            VALUES (?, ?)
            """,
            uid,
            f"https://example.com/photos/{uid}.jpg",
        )
        commit_batch(cursor, i, "Driver table")
    print(f"✔ Seeded {len(driver_ids)} drivers in Driver")


def seed_company_reps(cursor, company_ids):
    print("Seeding CompanyRepresentative table...")
    for i, uid in enumerate(company_ids, start=1):
        cursor.execute(
            """
            INSERT INTO [dbo].[CompanyRepresentative] (UserId, Company, PhotoUrl)
            VALUES (?, ?, ?)
            """,
            uid,
            random.choice([
            "AutoDrive Solutions",
            "TeleCar Mobility",
            "RoboRide Transport",
            "NextGen Transit",
            "Cyprus Autonomous Fleet",
            "FarosCare Inc",
            "CyMobility SA"
            ]),
            f"https://example.com/photos/{uid}.jpg",
        )
        commit_batch(cursor, i, "CompanyRepresentative")
    print(f"✔ Seeded {len(company_ids)} company reps")


def seed_inspectors(cursor, num_inspectors):
    print("Seeding Inspectors...")
    inspector_ids = []
    for i in range(num_inspectors):
        iid = uuid.uuid4()
        username = f"inspector_{uuid.uuid4().hex[:6]}"
        email = f"{username}@inspector.local"
        password_plain = "Inspector123!"

        cursor.execute(
            """
            INSERT INTO [dbo].[Inspector] (InspectorId, Email, Username, PasswordHash, CreatedAt)
            VALUES (?, ?, ?, dbo.fn_HashPassword(?), GETUTCDATE())
            """,
            iid,
            email,
            username,
            password_plain,
        )
        inspector_ids.append(iid)
        commit_batch(cursor, i + 1, "Inspector")
    print(f"✔ Seeded {len(inspector_ids)} inspectors")
    return inspector_ids


def seed_user_preferences(cursor, all_user_ids):
    print("Seeding UserPreferences...")
    for i, uid in enumerate(all_user_ids, start=1):
        cursor.execute(
            """
            INSERT INTO [dbo].[UserPreferences] (UserId, NotificationsEnabled, LocEnabled)
            VALUES (?, ?, ?)
            """,
            uid,
            random.choice([0, 1]),
            random.choice([0, 1]),
        )
        commit_batch(cursor, i, "UserPreferences")
    print(f"✔ Seeded preferences for {len(all_user_ids)} users")


# ==============================
# SERVICE / RIDE / VEHICLE TYPES / ALLOWED PROFILES
# ==============================

def seed_service_types(cursor):
    print("Seeding Servicetype...")
    services = [
        ("simple_route", "Simple point-to-point ride", 3.00),
        ("bridged_route", "Ride using bridges between zones", 4.00),
        ("luxury_route", "Premium vehicle and driver", 5.00),
        ("light_cargo", "Light cargo transportation", 6.00),
        ("heavy_cargo", "Heavy cargo transportation (e.g. moving)", 10.00),
    ]
    service_type_ids = {}
    one_year_ago = datetime.utcnow() - timedelta(days=365)

    for i, (name, desc, base) in enumerate(services, start=1):
        print(f"DEBUG: Inserting service type '{name}'...")
        
        cursor.execute(
            """
            INSERT INTO [dbo].[Servicetype] (
                Name, Description, BaseFare, ValidFrom, Active, CreatedAt
            )
            OUTPUT INSERTED.ServiceTypeId
            VALUES (?, ?, ?, ?, ?, GETUTCDATE())
            """,
            (name, desc, base, one_year_ago, 1),
        )
        
        result = cursor.fetchone()
        if result:
            st_id = result[0]
            print(f"DEBUG: Got service type ID {st_id} for '{name}'")
            service_type_ids[name] = st_id
        else:
            print(f"ERROR: No ID returned for '{name}'")
            
        commit_batch(cursor, i, "Servicetype")

    print(f"DEBUG: Final service_type_ids = {service_type_ids}")
    print(f"✔ Seeded {len(service_type_ids)} service types")
    return service_type_ids


def seed_ride_types(cursor):
    print("Seeding Ridetype...")
    ride_types = [
        ("vehicle_with_driver", "Vehicle with driver"),
        ("teledriving", "Teleoperated driving"),
        ("vehicle_rental", "Vehicle rental"),
        ("fully_autonomous", "Fully autonomous"),
        ("small_cargo_van", "Small cargo van for transportation of goods"),
    ]
    ride_type_ids = {}
    for i, (name, desc) in enumerate(ride_types, start=1):
        cursor.execute(
            """
            INSERT INTO [dbo].[Ridetype] (Name, Description, CreatedAt)
            OUTPUT INSERTED.RideTypeId
            VALUES (?, ?, GETUTCDATE())
            """,
            (name, desc),
        )
        result = cursor.fetchone()
        rt_id = result[0] if result else None
        ride_type_ids[name] = rt_id
        commit_batch(cursor, i, "Ridetype")
    print(f"✔ Seeded {len(ride_type_ids)} ride types")
    return ride_type_ids


def seed_vehicle_types(cursor):
    print("Seeding VehicleType...")

    vehicle_types = {
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

    vehicle_type_data = {}
    for i, (name, (seats, vol, weight)) in enumerate(vehicle_types.items(), start=1):
        cursor.execute(
            """
            INSERT INTO [dbo].[VehicleType] (Name, NumOfSeats, MinCargoVolume, MinCargoWeight)
            OUTPUT INSERTED.VehicleTypeId
            VALUES (?, ?, ?, ?)
            """,
            (name, seats, vol, weight),
        )
        result = cursor.fetchone()
        vt_id = result[0] if result else None
        
        vehicle_type_data[name] = {
            "id": vt_id,
            "seats": seats,
            "cargo_volume": vol,
            "cargo_weight": weight,
        }
        commit_batch(cursor, i, "VehicleType")

    print(f"✔ Seeded {len(vehicle_type_data)} vehicle types")
    return vehicle_type_data

def seed_allowed_profiles(cursor, service_type_ids, ride_type_ids, vehicle_type_ids):
    print("Seeding AllowedRideProfile...")
    combos = [
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
        ("bridged_route", "vehicle_with_driver", "Sedan", "Simple bridged passenger ride with sedan"),
        ("bridged_route", "vehicle_with_driver", "Hatchback", "Simple bridged passenger ride with hatchback"),
        ("bridged_route", "vehicle_with_driver", "SUV", "Simple bridged passenger ride with suv"),
        ("bridged_route", "vehicle_with_driver", "Coupe", "Simple bridged passenger ride with coupe"),
        ("bridged_route", "vehicle_with_driver", "Convertible", "Simple bridged passenger ride with convertible"),
        ("bridged_route", "vehicle_with_driver", "Crossover", "Simple bridged passenger ride with crossover"),
        ("bridged_route", "vehicle_with_driver", "Electric Car", "Simple bridged passenger ride with electric car"),
        ("bridged_route", "vehicle_with_driver", "Hybrid Car", "Simple bridged passenger ride with hybrid car"),
        ("bridged_route", "vehicle_with_driver", "Wagon", "Simple bridged passenger ride with wagon"),
        ("simple_route", "vehicle_rental", "Sedan", "Simple passenger ride (no driver) with sedan"),
        ("simple_route", "vehicle_rental", "Hatchback", "Simple passenger ride (no driver) with hatchback"),
        ("simple_route", "vehicle_rental", "SUV", "Simple passenger ride (no driver) with suv"),
        ("simple_route", "vehicle_rental", "Coupe", "Simple passenger ride (no driver) with coupe"),
        ("simple_route", "vehicle_rental", "Convertible", "Simple passenger ride (no driver) with convertible"),
        ("simple_route", "vehicle_rental", "Crossover", "Simple passenger ride (no driver) with crossover"),
        ("simple_route", "vehicle_rental", "Electric Car", "Simple passenger ride (no driver) with electric car"),
        ("simple_route", "vehicle_rental", "Hybrid Car", "Simple passenger ride (no driver) with hybrid car"),
        ("simple_route", "vehicle_rental", "Wagon", "Simple passenger ride (no driver) with wagon"),
        ("luxury_route", "vehicle_rental", "Luxury Car", "Luxury passenger ride (no driver) with luxury car"),
        ("luxury_route", "vehicle_rental", "Sports Car", "Luxury passenger ride (no driver) with sports car"),
        ("luxury_route", "vehicle_rental", "SUV", "Luxury passenger ride (no driver) with suv"),
        ("luxury_route", "vehicle_rental", "Electric Car", "Luxury passenger ride (no driver) with electric car"),
        ("bridged_route", "vehicle_rental", "Sedan", "Simple bridged passenger ride (no driver) with sedan"),
        ("bridged_route", "vehicle_rental", "Hatchback", "Simple bridged passenger ride (no driver) with hatchback"),
        ("bridged_route", "vehicle_rental", "SUV", "Simple bridged passenger ride (no driver) with suv"),
        ("bridged_route", "vehicle_rental", "Coupe", "Simple bridged passenger ride (no driver) with coupe"),
        ("bridged_route", "vehicle_rental", "Convertible", "Simple bridged passenger ride (no driver) with convertible"),
        ("bridged_route", "vehicle_rental", "Crossover", "Simple bridged passenger ride (no driver) with crossover"),
        ("bridged_route", "vehicle_rental", "Electric Car", "Simple bridged passenger ride (no driver) with electric car"),
        ("bridged_route", "vehicle_rental", "Hybrid Car", "Simple bridged passenger ride (no driver) with hybrid car"),
        ("bridged_route", "vehicle_rental", "Wagon", "Simple bridged passenger ride (no driver) with wagon"),
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
        ("heavy_cargo", "small_cargo_van", "Van", "Heavy cargo transport with van"),
        ("heavy_cargo", "small_cargo_van", "Truck", "Heavy cargo transport with truck"),
    ]
    profile_ids = []
    for i, (s_name, r_name, v_name, profile_name) in enumerate(combos, start=1):
        if s_name not in service_type_ids:
            print(f"❌ Missing service type: '{s_name}'")
            continue
        if r_name not in ride_type_ids:
            print(f"❌ Missing ride type: '{r_name}'")
            continue
        if v_name not in vehicle_type_ids:
            print(f"❌ Missing vehicle type: '{v_name}'")
            continue
            
        stid = service_type_ids[s_name]
        rtid = ride_type_ids[r_name]
        vtid = vehicle_type_ids[v_name]["id"]
        rp_id = uuid.uuid4()
        cursor.execute(
            """
            INSERT INTO [dbo].[AllowedRideProfile] (
                RideProfileId, ServiceTypeId, RideTypeId, VehicleTypeId, ProfileName
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            rp_id,
            stid,
            rtid,
            vtid,
            profile_name,
        )
        profile_ids.append((rp_id, stid, rtid, vtid))
        commit_batch(cursor, i, "AllowedRideProfile")
    print(f"✔ Seeded {len(profile_ids)} allowed ride profiles")
    return profile_ids


# ==============================
# VEHICLES
# ==============================

def seed_vehicles(cursor, num_vehicles, vehicle_type_data, owner_user_ids, operator_ids):
    print("Seeding Vehicles...")
    vehicle_ids = []

    brands = ["Toyota", "Honda", "Ford", "BMW", "Mercedes", "Audi", "Nissan", "Kia", "Hyundai", "Tesla"]
    models = ["Corolla", "Civic", "Focus", "Model 3", "A-Class", "X5", "Q5", "Leaf", "Sportage", "i20"]
    colors = ["White", "Black", "Silver", "Red", "Blue", "Gray", "Green"]

    vt_names = list(vehicle_type_data.keys())

    price_ranges = {
        "Sedan":        (0.20, 0.35),
        "Hatchback":    (0.18, 0.30),
        "SUV":          (0.30, 0.45),
        "Coupe":        (0.25, 0.40),
        "Convertible":  (0.35, 0.55),
        "Crossover":    (0.28, 0.40),
        "Electric Car": (0.22, 0.35),
        "Hybrid Car":   (0.22, 0.35),
        "Wagon":        (0.25, 0.38),
        "Luxury Car":   (0.40, 0.70),
        "Sports Car":   (0.45, 0.80),
        "Minivan":      (0.28, 0.42),
        "Van":          (0.35, 0.60),
        "Pickup Truck": (0.40, 0.70),
        "Truck":        (0.70, 1.20),
    }

    for i in range(num_vehicles):
        vid = uuid.uuid4()
        vt_name = random.choice(vt_names)
        vt_info = vehicle_type_data[vt_name]

        vt_id = vt_info["id"]
        seats = vt_info["seats"]
        cargo_volume = vt_info["cargo_volume"]
        cargo_weight = vt_info["cargo_weight"]

        owner = random.choice(owner_user_ids)

        plate_number = f"{''.join(random.choices('ABCDEFGHJKLMNPRSTUVWXYZ', k=3))}{random.randint(100, 999)}"
        brand = random.choice(brands)
        model = random.choice(models)
        color = random.choice(colors)

        status = random.choices(
            ["Pending", "Active", "Inactive", "Rejected"],
            weights=[20, 60, 15, 5],
            k=1
        )[0]
        reviewed_by = random.choice(operator_ids) if operator_ids and status != "Pending" else None
        reviewed_at = datetime.utcnow() if reviewed_by else None
        review_comment = None if not reviewed_by else "Auto-reviewed by seeder"

        min_p, max_p = price_ranges.get(vt_name, (0.25, 0.50))
        price_per_km = round(random.uniform(min_p, max_p), 2)

        cursor.execute(
            """
            INSERT INTO [dbo].[Vehicle] (
                VehicleId, VehicleTypeId, OwnerUserId, PlateNumber, Brand, Model, Color,
                Verified, Seats, CargoVolume, CargoWeight, PricePerKm, Status,
                CreatedAt, ReviewedByOperatorId, ReviewComment, ReviewedAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETUTCDATE(), ?, ?, ?)
            """,
            vid,
            vt_id,
            owner,
            plate_number,
            brand,
            model,
            color,
            0, # set to 1 later in seed_vehicle_document for eligible vehicles
            seats,
            cargo_volume,
            cargo_weight,
            price_per_km,
            status,
            reviewed_by,
            review_comment,
            reviewed_at,
        )

        vehicle_ids.append(vid)
        commit_batch(cursor, i + 1, "Vehicle")

    print(f"✔ Seeded {len(vehicle_ids)} vehicles")
    return vehicle_ids


# ==============================
# PERSON & VEHICLE DOCUMENTS / TESTS
# ==============================

PERSON_DOC_TYPES = [
    'ID_OR_PASSPORT',
    'RESIDENCE_PERMIT',
    'DRIVING_LICENSE',
    'VEHICLE_REG',
    'MOT_CERT',
    'CRIMINAL_RECORD',
    'MEDICAL_CERT',
    'PSYCHOLOGICAL_CERT'
]

def seed_person_documents(cursor, passenger_ids, driver_ids, company_ids, operator_ids):
    """
    Rules:
    - Drivers + CRs:
        * Required docs = ALL PERSON_DOC_TYPES above.
        * Some are fully verified (all docs Accepted).
        * Some are unverified:
            - missing at least one required doc OR
            - at least one doc Rejected.
    - Passengers:
        * Can ONLY upload DRIVING_LICENSE.
        * Some eligible for vehicle_rental => DRIVING_LICENSE = Accepted.
        * Some NOT eligible => no license OR license Pending/Rejected.

    -> 70% of Drivers/CRs are fully verified
    -> 60& of Passengers eligible for vehicle_rental ride type 
    """
    print("Seeding PersonDocument (role-aware)...")

    if not operator_ids:
        print("⚠️ No operators → all docs will be Pending")

    def insert_doc(user_id, doc_type, status, reviewed=True):
        issue_date = datetime.utcnow() - timedelta(days=random.randint(30, 365 * 5))
        if status in ["Accepted", "Rejected"] and reviewed and operator_ids:
            reviewed_by = random.choice(operator_ids)
            reviewed_at = datetime.utcnow()
            review_comments = "Checked by operator"
        else:
            reviewed_by = None
            reviewed_at = None
            review_comments = None

        cursor.execute(
            """
            INSERT INTO [dbo].[PersonDocument] (
                UserId, DocType, DocNo, IssueDate, UploadedAt, ExpiryDate,
                Status, ReviewedByOperatorId, ReviewedAt, ReviewComments, FileUrl
            )
            VALUES (?, ?, ?, ?, GETUTCDATE(), NULL, ?, ?, ?, ?, ?)
            """,
            user_id,
            doc_type,
            f"{doc_type}_{uuid.uuid4().hex[:8]}",
            issue_date,
            status,
            reviewed_by,
            reviewed_at,
            review_comments,
            f"https://example.com/docs/{doc_type.lower()}_{user_id}.pdf",
        )

    count = 0

    # ---------------- DRIVERS + COMPANY REPS ----------------
    REQUIRED_DRIVER_DOCS = PERSON_DOC_TYPES[:]  # all of them

    driver_ids = list(driver_ids)
    company_ids = list(company_ids)

    # choose subsets for "fully verified"
    num_verified_drivers = max(1, int(len(driver_ids) * 0.7)) if driver_ids else 0
    num_verified_company = max(1, int(len(company_ids) * 0.7)) if company_ids else 0

    verified_driver_ids = set(random.sample(driver_ids, num_verified_drivers)) if num_verified_drivers else set()
    verified_company_ids = set(random.sample(company_ids, num_verified_company)) if num_verified_company else set()

    # 1) Drivers
    for uid in driver_ids:
        if uid in verified_driver_ids:
            # fully verified: ALL required docs Accepted
            for dt in REQUIRED_DRIVER_DOCS:
                insert_doc(uid, dt, "Accepted")
                count += 1
                commit_batch(cursor, count, "PersonDocument")

            # mark as verified user
            cursor.execute(
                "UPDATE [dbo].[User] SET Verified = 1 WHERE UserId = ?",
                uid,
            )
        else:
            # unverified: either missing doc or one rejected
            mode = random.choice(["missing", "rejected"])
            if mode == "missing":
                missing = random.choice(REQUIRED_DRIVER_DOCS)
                for dt in REQUIRED_DRIVER_DOCS:
                    if dt == missing:
                        continue  # simulate not uploaded yet
                    insert_doc(uid, dt, "Accepted")
                    count += 1
                    commit_batch(cursor, count, "PersonDocument")
            else:  # rejected scenario
                rejected_doc = random.choice(REQUIRED_DRIVER_DOCS)
                for dt in REQUIRED_DRIVER_DOCS:
                    status = "Rejected" if dt == rejected_doc else "Accepted"
                    insert_doc(uid, dt, status)
                    count += 1
                    commit_batch(cursor, count, "PersonDocument")

    # 2) Company Representatives
    for uid in company_ids:
        if uid in verified_company_ids:
            for dt in REQUIRED_DRIVER_DOCS:
                insert_doc(uid, dt, "Accepted")
                count += 1
                commit_batch(cursor, count, "PersonDocument")
            
            # mark as verified user
            cursor.execute(
                "UPDATE [dbo].[User] SET Verified = 1 WHERE UserId = ?",
                uid,
            )
        else:
            mode = random.choice(["missing", "rejected"])
            if mode == "missing":
                missing = random.choice(REQUIRED_DRIVER_DOCS)
                for dt in REQUIRED_DRIVER_DOCS:
                    if dt == missing:
                        continue
                    insert_doc(uid, dt, "Accepted")
                    count += 1
                    commit_batch(cursor, count, "PersonDocument")
            else:
                rejected_doc = random.choice(REQUIRED_DRIVER_DOCS)
                for dt in REQUIRED_DRIVER_DOCS:
                    status = "Rejected" if dt == rejected_doc else "Accepted"
                    insert_doc(uid, dt, status)
                    count += 1
                    commit_batch(cursor, count, "PersonDocument")

    # ---------------- PASSENGERS ----------------
    passenger_ids = list(passenger_ids)
    num_eligible = max(1, int(len(passenger_ids) * 0.6)) if passenger_ids else 0
    eligible_passengers = set(random.sample(passenger_ids, num_eligible)) if num_eligible else set()

    for uid in passenger_ids:
        if uid in eligible_passengers:
            # Eligible for vehicle_rental:
            # DRIVING_LICENSE = Accepted
            insert_doc(uid, "DRIVING_LICENSE", "Accepted")
            count += 1
            commit_batch(cursor, count, "PersonDocument")

            # mark CanDrive=1
            cursor.execute(
                "UPDATE [dbo].[Passenger] SET CanDrive = 1 WHERE UserId = ?",
                uid,
            )
        else:
            # Not eligible:
            # - either no license
            # - or license Pending / Rejected
            mode = random.choice(["no_license", "bad_license"])
            if mode == "no_license":
                # no docs at all for this passenger
                continue
            else:
                status = random.choice(["Pending", "Rejected"])
                insert_doc(uid, "DRIVING_LICENSE", status)
                count += 1
                commit_batch(cursor, count, "PersonDocument")

    print(f"✔ Seeded PersonDocument rows: {count}")


VEHICLE_DOC_TYPES = [
    "VEHICLE_REGISTRATION",
    "MOT_CERTIFICATE",
    "VEHICLE_CLASSIFICATION_CERTIFICATE",
    "VEHICLE_IMAGE",
]

def seed_vehicle_documents(cursor, vehicle_ids, operator_ids):
    print("Seeding VehicleDocument (good + bad vehicles)...")
    count = 0

    if not vehicle_ids:
        print("⚠️ No vehicles → skipping VehicleDocument")
        return

    vehicle_ids = list(vehicle_ids)

    # ~60% "good" vehicles (all docs accepted), 40% problematic
    num_good = max(1, int(len(vehicle_ids) * 0.6))
    good_vehicles = set(random.sample(vehicle_ids, num_good))
    # the rest = bad/problematic
    bad_vehicles = set(vehicle_ids) - good_vehicles

    def insert_doc(vehicle_id, doc_type, status, reviewed=True):
        issue_date = datetime.now(timezone.utc) - timedelta(days=random.randint(30, 365 * 3))  # Fixed deprecation
        if status in ["Accepted", "Rejected"] and reviewed and operator_ids:
            reviewed_by = random.choice(operator_ids)
            reviewed_at = datetime.now(timezone.utc)  # Fixed deprecation
            review_comments = "Vehicle doc checked"
        else:
            reviewed_by = None
            reviewed_at = None
            review_comments = None

        cursor.execute(
            """
            INSERT INTO [dbo].[VehicleDocument] (
                VehicleId, DocType, DocNo, UploadedAt, IssueDate, ExpiryDate,
                FileUrl, Accepted, Status, ReviewedByOperatorId, ReviewedAt, ReviewComments
            )
            VALUES (?, ?, ?, GETUTCDATE(), ?, NULL, ?, ?, ?, ?, ?, ?)
            """,
            vehicle_id,
            doc_type,
            f"{doc_type}_{uuid.uuid4().hex[:8]}",
            issue_date,
            f"https://example.com/vehdocs/{doc_type.lower()}_{vehicle_id}.pdf",
            1 if status == "Accepted" else 0,
            status,
            reviewed_by,
            reviewed_at,
            review_comments,
        )

    # Good vehicles: all required doc types Accepted
    for vid in good_vehicles:
        print('--------------------------------------------------- GOOD VEHICLE')
        for dt in VEHICLE_DOC_TYPES:
            insert_doc(vid, dt, "Accepted")
            count += 1
            commit_batch(cursor, count, "VehicleDocument")

        # ✅ ADD THIS: Update the actual database record to mark as verified
        cursor.execute(
            "UPDATE [dbo].[Vehicle] SET Verified = 1 WHERE VehicleId = ?",
            vid,
        )

    # Bad vehicles: some missing / some rejected  
    for vid in bad_vehicles:
        mode = random.choice(["missing", "rejected_mixed"])
        if mode == "missing":
            # skip one doc entirely
            missing = random.choice(VEHICLE_DOC_TYPES)
            for dt in VEHICLE_DOC_TYPES:
                if dt == missing:
                    continue
                status = random.choice(["Accepted", "Pending"])
                insert_doc(vid, dt, status)
                count += 1
                commit_batch(cursor, count, "VehicleDocument")
        else:  # rejected_mixed
            rejected_doc = random.choice(VEHICLE_DOC_TYPES)
            for dt in VEHICLE_DOC_TYPES:
                if dt == rejected_doc:
                    status = "Rejected"
                else:
                    status = random.choice(["Accepted", "Pending"])
                insert_doc(vid, dt, status)
                count += 1
                commit_batch(cursor, count, "VehicleDocument")

    print(f"✔ Seeded VehicleDocument rows: {count}")
    print(f"✔ Verified {len(good_vehicles)} vehicles (all docs accepted)")

def seed_vehicle_tests(cursor, vehicle_ids, inspector_ids):
    print("Seeding VehicleTest (only for verified vehicles)...")

    if not inspector_ids:
        print("⚠️ No inspectors → skipping VehicleTest (no inspectors)")
        return

    if not vehicle_ids:
        print("⚠️ No vehicles → skipping VehicleTest")
        return

    # Fetch only vehicles that are actually marked as Verified = 1 in the DB
    cursor.execute(
        """
        SELECT VehicleId
        FROM [dbo].[Vehicle]
        WHERE Verified = 1
        """
    )
    rows = cursor.fetchall()
    verified_set = {row[0] for row in rows}

    # Only seed tests for vehicles that:
    # 1) were created in this seeder run (in vehicle_ids), and
    # 2) are Verified = 1 in the DB
    eligible_vehicle_ids = [vid for vid in vehicle_ids if vid in verified_set]

    if not eligible_vehicle_ids:
        print("⚠️ No verified vehicles found → skipping VehicleTest")
        return

    for i, vid in enumerate(eligible_vehicle_ids, start=1):
        inspector = random.choice(inspector_ids)
        check_date = datetime.utcnow() - timedelta(days=random.randint(0, 365))
        comments = random.choice(
            ["All good", "Minor issues", "Needs re-check", "No comments"]
        )

        cursor.execute(
            """
            INSERT INTO [dbo].[VehicleTest] (
                VehicleId, InspectorId, CheckDate, Comments
            )
            VALUES (?, ?, ?, ?)
            """,
            vid,
            inspector,
            check_date,
            comments,
        )
        commit_batch(cursor, i, "VehicleTest")

    print(f"✔ Seeded VehicleTest rows for {len(eligible_vehicle_ids)} verified vehicles")


# ==============================
# USER SERVICE ENROLLMENTS & AVAILABILITY
# ==============================

def seed_user_service_enrollments(cursor, driver_ids, company_ids, service_type_ids, ride_type_ids, operator_ids):
    print("Seeding UserServiceEnrollment (verified users & vehicles only)...")

    # Role-based allowed ride types
    driver_ride_type_ids = [
        ride_type_ids[key]
        for key in ["vehicle_with_driver", "small_cargo_van"]
        if key in ride_type_ids
    ]
    cr_ride_type_ids = [
        ride_type_ids[key]
        for key in ["vehicle_rental", "teledriving", "fully_autonomous"]
        if key in ride_type_ids
    ]

    enrollments_by_user = {}
    all_enroll_ids = []
    used_user_vehicle_pairs = set()  # max 1 enrollment per (User, Vehicle)

    def is_user_verified(user_id):
        cursor.execute(
            "SELECT Verified FROM [dbo].[User] WHERE UserId = ?",
            user_id,
        )
        row = cursor.fetchone()
        if not row:
            return False
        return bool(row[0])
    
    def get_verified_vehicles_for_user(user_id):
        cursor.execute(
            """
            SELECT VehicleId
            FROM [dbo].[Vehicle]
            WHERE OwnerUserId = ?
              AND Verified = 1
            """,
            user_id,
        )
        return [row[0] for row in cursor.fetchall()]

    def get_allowed_combos_for_vehicle(vehicle_id, allowed_ride_type_ids):
        if not allowed_ride_type_ids:
            return []

        placeholders = ",".join("?" for _ in allowed_ride_type_ids)
        params = [vehicle_id] + allowed_ride_type_ids

        cursor.execute(
            f"""
            SELECT DISTINCT arp.ServiceTypeId, arp.RideTypeId
            FROM [dbo].[AllowedRideProfile] AS arp
            JOIN [dbo].[Vehicle] AS v
              ON v.VehicleTypeId = arp.VehicleTypeId
            WHERE v.VehicleId = ?
              AND arp.RideTypeId IN ({placeholders})
            """,
            params,
        )
        return cursor.fetchall()  # list of (ServiceTypeId, RideTypeId)

    def create_enrollments_for_user(user_id, allowed_ride_type_ids):
        nonlocal all_enroll_ids

        if not allowed_ride_type_ids:
            return

        # 1) Only proceed if user is verified according to person docs
        if not is_user_verified(user_id):
            return

        # 2) Fetch vehicles that belong to this user AND are verified
        user_vehicle_ids = get_verified_vehicles_for_user(user_id)
        if not user_vehicle_ids:
            # Verified user but no verified vehicles => cannot enroll
            return

        # 3) Decide how many vehicles to enroll with (1 .. up to 3 per user, capped by available vehicles)
        max_for_user = min(len(user_vehicle_ids), 3)
        num_vehicles_to_use = random.randint(1, max_for_user)

        chosen_vehicles = random.sample(user_vehicle_ids, k=num_vehicles_to_use)

        for vehicle_id in chosen_vehicles:
            pair_key = (str(user_id), str(vehicle_id))
            if pair_key in used_user_vehicle_pairs:
                continue  # ensure max 1 enrollment per (user, vehicle)

            used_user_vehicle_pairs.add(pair_key)

            allowed_combos = get_allowed_combos_for_vehicle(vehicle_id, allowed_ride_type_ids)
            if not allowed_combos:
                # no valid (service, ride) for this vehicle type & role -> skip this vehicle
                continue

            service_type, ride_type = random.choice(allowed_combos)

            # Mostly Approved, some Pending, few Rejected
            status = random.choices(
                ["Approved", "Pending", "Rejected"],
                weights=[75, 15, 10],
                k=1,
            )[0]

            checked_by = None
            reviewed_at = None
            review_comment = None

            if status in ["Approved", "Rejected"] and operator_ids:
                checked_by = random.choice(operator_ids)
                reviewed_at = datetime.utcnow()
                review_comment = "Enrollment reviewed by operator (seeded)"

            enroll_id = insert_with_identity(
                cursor,
                """
                INSERT INTO [dbo].[UserServiceEnrollment] (
                    UserId,
                    VehicleId,
                    ServiceType,
                    RideType,
                    Status,
                    CheckedById,
                    ReviewedAt,
                    ReviewComment
                )
                OUTPUT INSERTED.EnrollId
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    vehicle_id,
                    service_type,
                    ride_type,
                    status,
                    checked_by,
                    reviewed_at,
                    review_comment,
                ),
            )

            enrollments_by_user.setdefault(user_id, []).append(enroll_id)
            all_enroll_ids.append(enroll_id)
            commit_batch(cursor, len(all_enroll_ids), "UserServiceEnrollment")

    # ---------- apply for drivers & company reps ----------

    driver_ids = list(driver_ids)
    company_ids = list(company_ids)

    for uid in driver_ids:
        create_enrollments_for_user(uid, driver_ride_type_ids)

    for uid in company_ids:
        create_enrollments_for_user(uid, cr_ride_type_ids)

    print(f"✔ Seeded {len(all_enroll_ids)} enrollments")
    return enrollments_by_user, all_enroll_ids


def seed_driver_availability(cursor):
    print("Seeding DriverAvailability (per-user, per-day, per-zone)...")

    # 1) Fetch all zones
    zones = fetch_all(cursor, "SELECT ZoneId FROM [dbo].[GeofenceZone]")
    if not zones:
        print("⚠️  No zones → skipping DriverAvailability")
        return
    zone_ids = [z[0] for z in zones]

    # 2) Fetch all APPROVED enrollments (UserId + EnrollId)
    cursor.execute(
        """
        SELECT EnrollId, UserId
        FROM [dbo].[UserServiceEnrollment]
        WHERE Status = 'Approved'
        """
    )
    rows = cursor.fetchall()
    if not rows:
        print("⚠️  No approved enrollments → skipping DriverAvailability")
        return

    # Build mapping: user -> list of approved enrollments
    approved_by_user = {}
    for enroll_id, user_id in rows:
        approved_by_user.setdefault(user_id, []).append(enroll_id)

    users = list(approved_by_user.keys())
    if not users:
        print("⚠️  No users with approved enrollments → skipping DriverAvailability")
        return

    base_date = date.today() - timedelta(days=20)
    days_ahead = 35
    count = 0

    # We will:
    # - iterate days
    # - for each day, shuffle users
    # - assign each user:
    #     * one zone (round-robin over all zones)
    #     * one of their approved EnrollIds
    #     * 1–3 non-overlapping time blocks in that zone
    possible_starts = [6, 10, 14]  # 4-hour blocks: 6-10, 10-14, 14-18

    for day_offset in range(days_ahead + 1):
        availability_date = base_date + timedelta(days=day_offset)

        random.shuffle(users)
        num_zones = len(zone_ids)

        for idx, user_id in enumerate(users):
            enroll_list = approved_by_user.get(user_id)
            if not enroll_list:
                continue

            # pick ONE enrollment for this user on this day
            enroll_id = random.choice(enroll_list)

            # pick ONE zone for this user on this day (round-robin to ensure coverage)
            zone_id = zone_ids[idx % num_zones]

            # pick 1–3 time blocks (non-overlapping, same EnrollId + zone)
            k_slots = random.randint(1, len(possible_starts))
            slot_starts = sorted(random.sample(possible_starts, k_slots))

            for start_hour in slot_starts:
                starts_at = time(start_hour, 0)
                ends_at = time(start_hour + 4, 0)

                is_recurring = random.choice([0, 1])

                cursor.execute(
                    """
                    INSERT INTO [dbo].[DriverAvailability] (
                        EnrollId, AvailabilityDate, GeofencezoneId, StartsAt, EndsAt,
                        IsRecurring, UpdatedAt, IsLocked
                    )
                    VALUES (?, ?, ?, ?, ?, ?, GETUTCDATE(), ?)
                    """,
                    enroll_id,
                    availability_date,
                    zone_id,
                    starts_at,
                    ends_at,
                    is_recurring,
                    1,
                )
                count += 1
                commit_batch(cursor, count, "DriverAvailability")

    print(f"✔ Seeded {count} DriverAvailability rows")


# ==============================
# RIDE REQUESTS, PROGRESS, LOG, ITINERARY LEGS, DISPATCH OFFERS
# ==============================

def get_zone_points(cursor):
    rows = fetch_all(
        cursor,
        """
        SELECT PointId, ZoneId
        FROM [dbo].[ZonePoint]
        WHERE IsPickupAllowed = 1 AND IsDropoffAllowed = 1
        """
    )
    by_zone = {}
    for pid, zid in rows:
        by_zone.setdefault(zid, []).append(pid)
    return by_zone

def seed_ride_requests(cursor, num_requests, passenger_ids, allowed_profiles, zone_points_by_zone, zone_graph):
    print("Seeding RideRequest + RideRequestLog...")

    cursor.execute("DISABLE TRIGGER [dbo].[trg_RideRequest_Log] ON [dbo].[RideRequest]")

    request_ids = []
    request_info = []

    # --- Preload service type & ride type names ---
    cursor.execute("SELECT ServiceTypeId, Name FROM [dbo].[Servicetype]")
    service_type_name_by_id = {row[0]: row[1] for row in cursor.fetchall()}

    cursor.execute("SELECT RideTypeId, Name FROM [dbo].[Ridetype]")
    ride_type_name_by_id = {row[0]: row[1] for row in cursor.fetchall()}

    # Passengers that can drive (for vehicle_no_driver / vehicle_rental)
    cursor.execute("SELECT UserId FROM [dbo].[Passenger] WHERE CanDrive = 1")
    can_drive_passengers = [row[0] for row in cursor.fetchall()]

    def random_past_datetime(days_back=30):
        base = datetime.utcnow()
        return base - timedelta(
            days=random.randint(1, days_back),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        )

    if not zone_points_by_zone:
        print("⚠️  No zone points available, skipping ride requests")
        return [], []

    zone_ids = list(zone_points_by_zone.keys())
    count = 0

    def get_reachable_zones(start_zone):
        """Return all zones reachable from start_zone via zone_graph (excluding start_zone)."""
        if start_zone not in zone_graph:
            return []

        visited = set([start_zone])
        q = deque([start_zone])
        reachable = []

        while q:
            z = q.popleft()
            for neigh in zone_graph.get(z, []):
                if neigh not in visited:
                    visited.add(neigh)
                    reachable.append(neigh)
                    q.append(neigh)
        return reachable

    for _ in range(num_requests):
        # 1) Choose a ride profile combo
        ride_profile_id, stid, rtid, vtid = random.choice(allowed_profiles)
        service_name = service_type_name_by_id.get(stid, "")
        ride_type_name = ride_type_name_by_id.get(rtid, "")

        # 2) Choose passenger based on ride type
        if ride_type_name in ("vehicle_no_driver", "vehicle_rental"):
            if not can_drive_passengers:
                # no eligible passengers -> skip this profile
                continue
            passenger = random.choice(can_drive_passengers)
        else:
            passenger = random.choice(passenger_ids)

        # 3) Choose pickup/drop points with zone rule:
        #    - bridged_route: different zones
        #    - otherwise: same zone
        if not zone_ids:
            break

        if service_name == "bridged_route":
            # need two distinct zones that are connected via bridges (zone_graph)
            # first, choose a start zone that has at least one neighbor
            bridged_candidates = [
                z for z in zone_ids
                if z in zone_graph and zone_graph[z]
            ]

            if len(bridged_candidates) < 1:
                # fallback: no bridged-capable zones, degrade to same-zone route
                zone_id = random.choice(zone_ids)
                points = zone_points_by_zone[zone_id]
                if len(points) < 2:
                    continue
                pickup_point, dropoff_point = random.sample(points, 2)
                main_zone_id = zone_id
            else:
                from_zone = random.choice(bridged_candidates)
                reachable = get_reachable_zones(from_zone)

                # need some other zone reachable from from_zone
                reachable = [z for z in reachable if z in zone_points_by_zone]

                if not reachable:
                    # no valid destination zones → fallback to same-zone route
                    points = zone_points_by_zone[from_zone]
                    if len(points) < 2:
                        continue
                    pickup_point, dropoff_point = random.sample(points, 2)
                    main_zone_id = from_zone
                else:
                    to_zone = random.choice(reachable)

                    from_points = zone_points_by_zone.get(from_zone, [])
                    to_points = zone_points_by_zone.get(to_zone, [])
                    if not from_points or not to_points:
                        continue

                    pickup_point = random.choice(from_points)
                    dropoff_point = random.choice(to_points)
                    main_zone_id = from_zone  # origin zone for now
        else:
            # simple/non-bridged: both points in same zone
            zone_id = random.choice(zone_ids)
            points = zone_points_by_zone[zone_id]
            if len(points) < 2:
                continue
            pickup_point, dropoff_point = random.sample(points, 2)
            main_zone_id = zone_id

        # 4) Decide status and pickup time
        status = random.choices(
            ["Pending", "Accepted", "Declined", "Cancelled", "Completed"],
            weights=[35, 25, 15, 15, 10],
            k=1,
        )[0]

        if status in ("Pending", "Accepted"):
            pickup_at = random_future_datetime(10)
        else:
            pickup_at = random_past_datetime(20)

        num_people = random.randint(1, 4)

        # 5) Insert RideRequest and get the generated RequestId
        cursor.execute(
            """
            INSERT INTO [dbo].[RideRequest] (
                PassengerId, NumOfPeople, PickupAt, PickUpPoint, DropOffPoint,
                CreatedAt, UpdatedAt, Status, RideProfileId
            )
            VALUES (?, ?, ?, ?, ?, GETUTCDATE(), NULL, ?, ?)
            """,
            (
                passenger,
                num_people,
                pickup_at,
                pickup_point,
                dropoff_point,
                status,
                ride_profile_id,
            ),
        )

        # Use @@IDENTITY instead of SCOPE_IDENTITY()
        cursor.execute("SELECT CAST(@@IDENTITY AS INT)")
        result = cursor.fetchone()

        if not result or result[0] is None:
            print("ERROR: No RequestId returned")
            continue
            
        req_id = result[0]
        request_ids.append(req_id)
        request_info.append((req_id, pickup_point, dropoff_point, main_zone_id))
        
        count += 1
        commit_batch(cursor, count, "RideRequest")
    
    # Manually seed initial log entries (Operation = 'I')
    print("Creating initial log entries for ride requests...")
    for req_id in request_ids:
        cursor.execute("""
            INSERT INTO [dbo].[RideRequestLog] (
                RequestId, Operation, PassengerId, NumOfPeople, PickupAt,
                PickUpPoint, DropOffPoint, CreatedAt, UpdatedAt, Status, RideProfileId
            )
            SELECT 
                RequestId, 'I', PassengerId, NumOfPeople, PickupAt,
                PickUpPoint, DropOffPoint, CreatedAt, UpdatedAt, Status, RideProfileId
            FROM [dbo].[RideRequest]
            WHERE RequestId = ?
        """, req_id)

    # seed ride request logs
    num_with_edits = int(len(request_ids) * 0.5)
    edited_request_ids = random.sample(request_ids, num_with_edits)

    for req_id in edited_request_ids:
        # 1–3 extra log entries per selected request
        for _ in range(random.randint(1, 3)):
            # fetch current snapshot from RideRequest
            cursor.execute("""
                SELECT PassengerId, NumOfPeople, PickupAt, PickUpPoint, DropOffPoint,
                        CreatedAt, UpdatedAt, Status, RideProfileId
                FROM [dbo].[RideRequest]
                WHERE RequestId = ?
            """, req_id)
            (
                passenger_id,
                num_people,
                pickup_at,
                pickup_point,
                dropoff_point,
                created_at,
                updated_at,
                status,
                ride_profile_id,
            ) = cursor.fetchone()

            # optionally tweak some fields to simulate edit
            new_num_people = max(1, min(4, num_people + random.choice([-1, 0, 1])))
            new_pickup_at = pickup_at + timedelta(minutes=random.choice([-10, 0, 10]))

            cursor.execute(
                """
                INSERT INTO [dbo].[RideRequestLog] (
                    RequestId, Operation, PassengerId, NumOfPeople, PickupAt,
                    PickUpPoint, DropOffPoint, CreatedAt, UpdatedAt, Status, RideProfileId
                )
                VALUES (?, 'U', ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                req_id,
                passenger_id,
                new_num_people,
                new_pickup_at,
                pickup_point,
                dropoff_point,
                created_at,
                updated_at,
                status,
                ride_profile_id,
            )

    cursor.execute("ENABLE TRIGGER [dbo].[trg_RideRequest_Log] ON [dbo].[RideRequest]")

    print(f"✔ Seeded {len(request_ids)} ride requests")
    return request_ids, request_info


def seed_itinerary_legs(cursor, request_info):
    print("Seeding ItineraryLeg + RideRequestProgress...")
    if not request_info:
        print("⚠️  No ride requests → skipping itinerary legs")
        return []

    leg_ids = []

    # ---------------------------
    # 1) Preload point→zone & zone→points (all points, not only pickup/dropoff)
    # ---------------------------
    cursor.execute("SELECT PointId, ZoneId FROM [dbo].[ZonePoint]")
    point_to_zone = {}
    zone_to_points = {}
    for point_id, zone_id in cursor.fetchall():
        point_to_zone[point_id] = zone_id
        zone_to_points.setdefault(zone_id, []).append(point_id)

    # ---------------------------
    # 2) Build zone graph from Bridge (bidirectional)
    # ---------------------------
    cursor.execute("SELECT FromZoneId, ToZoneId FROM [dbo].[Bridge]")
    zone_graph = {}
    for from_z, to_z in cursor.fetchall():
        zone_graph.setdefault(from_z, set()).add(to_z)
        zone_graph.setdefault(to_z, set()).add(from_z)

    # ---------------------------
    # 3) Preload service type & pickup time per RideRequest
    # ---------------------------
    cursor.execute(
        """
        SELECT rr.RequestId, st.Name AS ServiceName, rr.PickupAt
        FROM [dbo].[RideRequest] AS rr
        JOIN [dbo].[AllowedRideProfile] AS arp
          ON rr.RideProfileId = arp.RideProfileId
        JOIN [dbo].[Servicetype] AS st
          ON arp.ServiceTypeId = st.ServiceTypeId
        """
    )
    service_by_req = {}
    pickup_at_by_req = {}
    for req_id, service_name, pickup_at in cursor.fetchall():
        service_by_req[req_id] = service_name
        pickup_at_by_req[req_id] = pickup_at

    # ---------------------------
    # 4) Helper: BFS over zones
    # ---------------------------
    def bfs_zone_path(start_zone, end_zone):
        if start_zone == end_zone:
            return [start_zone]
        if start_zone not in zone_graph or end_zone not in zone_graph:
            return None

        visited = {start_zone}
        q = deque([(start_zone, [start_zone])])

        while q:
            z, path = q.popleft()
            for neigh in zone_graph.get(z, []):
                if neigh in visited:
                    continue
                new_path = path + [neigh]
                if neigh == end_zone:
                    return new_path
                visited.add(neigh)
                q.append((neigh, new_path))
        return None  # no path

    count = 0

    # request_info = list of (req_id, pickup_point, dropoff_point, main_zone_id)
    for req_id, pickup_point, dropoff_point, _ in request_info:
        service_name = service_by_req.get(req_id, "")
        pickup_at = pickup_at_by_req.get(req_id, datetime.utcnow())

        from_zone = point_to_zone.get(pickup_point)
        to_zone = point_to_zone.get(dropoff_point)

        # If we can't resolve zones, skip this request
        if from_zone is None or to_zone is None:
            continue

        legs_for_req = []

        # ---------------------------
        # Non-bridged services → single leg
        # ---------------------------
        if service_name != "bridged_route" or from_zone == to_zone:
            zone_id = from_zone
            approx_start = pickup_at
            approx_end = approx_start + timedelta(minutes=random.randint(10, 30))

            legs_for_req.append(
                (zone_id, pickup_point, dropoff_point, approx_start, approx_end)
            )

        # ---------------------------
        # Bridged route → multi-leg across zone path
        # ---------------------------
        else:
            path = bfs_zone_path(from_zone, to_zone)

            # If no valid path, degrade to single-leg intra-zone (fallback)
            if not path or len(path) == 1:
                zone_id = from_zone
                approx_start = pickup_at
                approx_end = approx_start + timedelta(minutes=random.randint(10, 30))
                legs_for_req.append(
                    (zone_id, pickup_point, dropoff_point, approx_start, approx_end)
                )
            else:
                current_start = pickup_at

                for idx, zone_id in enumerate(path):
                    points_in_zone = zone_to_points.get(zone_id) or []
                    if not points_in_zone:
                        # if weird data, skip this zone; we'll still have legs for others
                        continue

                    # First zone in path
                    if idx == 0 and len(path) == 1:
                        from_pt = pickup_point
                        to_pt = dropoff_point
                    elif idx == 0:
                        from_pt = pickup_point
                        if len(points_in_zone) > 1:
                            candidates = [p for p in points_in_zone if p != from_pt]
                            to_pt = random.choice(candidates or points_in_zone)
                        else:
                            to_pt = points_in_zone[0]

                    # Last zone in path
                    elif idx == len(path) - 1:
                        if len(points_in_zone) > 1:
                            from_pt = random.choice(points_in_zone)
                        else:
                            from_pt = points_in_zone[0]
                        to_pt = dropoff_point

                    # Intermediate zone
                    else:
                        if len(points_in_zone) > 1:
                            from_pt, to_pt = random.sample(points_in_zone, 2)
                        else:
                            from_pt = to_pt = points_in_zone[0]

                    approx_start = current_start
                    duration_min = random.randint(10, 25)
                    approx_end = approx_start + timedelta(minutes=duration_min)
                    current_start = approx_end + timedelta(
                        minutes=random.randint(2, 10)
                    )

                    legs_for_req.append(
                        (zone_id, from_pt, to_pt, approx_start, approx_end)
                    )

        if not legs_for_req:
            continue

        total_legs = len(legs_for_req)

        # ---------------------------
        # Insert ItineraryLeg rows
        # ---------------------------
        for seq_no, (zone_id, from_pt, to_pt, approx_start, approx_end) in enumerate(
            legs_for_req, start=1
        ):
            leg_id = insert_with_identity(
                cursor,
                """
                INSERT INTO [dbo].[ItineraryLeg] (
                    RideRequestId, SeqNo, ZoneId, FromPointId, ToPointId,
                    ApproxStartTime, ApproxEndTime
                )
                OUTPUT INSERTED.LegId
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    req_id,
                    seq_no,
                    zone_id,
                    from_pt,
                    to_pt,
                    approx_start,
                    approx_end,
                ),
            )
            leg_ids.append(leg_id)
            count += 1
            commit_batch(cursor, count, "ItineraryLeg")

        # ---------------------------
        # Insert RideRequestProgress
        # ---------------------------
        cursor.execute(
            """
            INSERT INTO [dbo].[RideRequestProgress] (
                RequestId, TotalLegs, AcceptedLegs, Status, UpdatedAt
            )
            VALUES (?, ?, 0, 'AwaitingDrivers', GETUTCDATE())
            """,
            req_id,
            total_legs,
        )
        commit_batch(cursor, count, "ItineraryLeg/RideRequestProgress")

    print(f"✔ Seeded {len(leg_ids)} itinerary legs & progress rows")
    return leg_ids


def ensure_supply_for_each_leg(cursor, operator_ids):
    """
    For every ItineraryLeg, ensure there is at least ONE eligible driver:
      - approved UserServiceEnrollment with matching ServiceType/RideType/VehicleType
      - Vehicle is Verified + Active
      - DriverAvailability for the leg's zone/date/time

    If not found, we *create* the missing pieces:
      - User (Driver or Company Rep, depending on RideType)
      - Vehicle of correct VehicleType
      - Enrollment (Approved)
      - Availability slot in the leg's zone/time
    """
    print("Ensuring sufficient supply for each itinerary leg...")

    import uuid
    import random
    from datetime import datetime, date, time as dtime

    # --- Preload ride type names so we know which role to use (D vs C) ---
    cursor.execute("SELECT RideTypeId, Name FROM [dbo].[RideType]")
    ride_type_name_by_id = {row[0]: row[1] for row in cursor.fetchall()}

    # ---------- helpers ----------

    def create_supply_user(role: str):
        """Create a minimal User + role row (Driver or CompanyRepresentative), Verified=1."""
        user_id = uuid.uuid4()
        first = "Seed"
        last = "Driver" if role == "D" else "Company"
        username = f"{'drv' if role == 'D' else 'cr'}_{user_id.hex[:8]}"
        email = f"{username}@example.com"
        phone = f"+357{random.randint(10000000, 99999999)}"
        address = "Auto-seeded address"

        # Simple adult DOB 25–50 years ago
        today = datetime.utcnow().date()
        years_ago = random.randint(25, 50)
        dob = date(today.year - years_ago, 1, 1)
        gender = random.choice(["M", "F"])
        plain_pwd = "Seed1234!"

        cursor.execute(
            """
            INSERT INTO [dbo].[User] (
                UserId, FirstName, LastName, Role, Dob, Gender,
                Email, Phone, Address, Username, PasswordHash, Verified
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, dbo.fn_HashPassword(?), ?)
            """,
            user_id,
            first,
            last,
            role,
            dob,
            gender,
            email,
            phone,
            address,
            username,
            plain_pwd,
            1,  # Verified
        )

        if role == "D":
            cursor.execute(
                """
                INSERT INTO [dbo].[Driver] (UserId, PhotoUrl)
                VALUES (?, ?)
                """,
                user_id,
                f"https://example.com/seed/driver/{user_id.hex}.jpg",
            )
        else:
            cursor.execute(
                """
                INSERT INTO [dbo].[CompanyRepresentative] (UserId, Company, PhotoUrl)
                VALUES (?, ?, ?)
                """,
                user_id,
                "Seeder Supply Company",
                f"https://example.com/seed/cr/{user_id.hex}.jpg",
            )

        return user_id

    def create_supply_vehicle(owner_id, vehicle_type_id):
        """Create a Verified + Active vehicle of the required type."""
        vehicle_id = uuid.uuid4()
        plate = f"SEED-{vehicle_id.hex[:6].upper()}"
        brand = "SeedBrand"
        model = "SeedModel"
        color = random.choice(["Black", "White", "Silver"])
        seats = 4
        cargo_volume = 0.0
        cargo_weight = 0.0
        price_per_km = 0.25  # Add missing price_per_km
        status = "Active"
        reviewed_by = random.choice(operator_ids) if operator_ids else None
        review_comment = "Auto-approved by seeder (supply)"
        reviewed_at = datetime.now(timezone.utc)

        cursor.execute(
            """
            INSERT INTO [dbo].[Vehicle] (
                VehicleId, VehicleTypeId, OwnerUserId,
                PlateNumber, Brand, Model, Color,
                Verified, Seats, CargoVolume, CargoWeight, PricePerKm, Status,
                CreatedAt, ReviewedByOperatorId, ReviewComment, ReviewedAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETUTCDATE(), ?, ?, ?)
            """,
            (
                vehicle_id,         # UNIQUEIDENTIFIER
                vehicle_type_id,    # INT  
                owner_id,          # UNIQUEIDENTIFIER
                plate,             # NVARCHAR
                brand,             # NVARCHAR
                model,             # NVARCHAR
                color,             # NVARCHAR
                1,                 # BIT (Verified)
                seats,             # INT
                cargo_volume,      # DECIMAL
                cargo_weight,      # DECIMAL
                price_per_km,      # DECIMAL (was missing!)
                status,            # NVARCHAR
                reviewed_by,       # UNIQUEIDENTIFIER (nullable)
                review_comment,    # NVARCHAR
                reviewed_at,       # DATETIME
            ),
        )

        return vehicle_id

    def create_supply_enrollment(user_id, vehicle_id, service_type_id, ride_type_id):
        """Create an Approved UserServiceEnrollment for this user/vehicle/profile."""
        status = "Approved"
        checked_by = random.choice(operator_ids) if operator_ids else None
        reviewed_at = datetime.now(timezone.utc)
        review_comment = "Auto-created enrollment for supply"

        # Use OUTPUT INSERTED to get the generated INT identity
        cursor.execute(
            """
            INSERT INTO [dbo].[UserServiceEnrollment] (
                UserId, VehicleId, ServiceType, RideType,
                Status, CheckedById, ReviewedAt, ReviewComment
            )
            OUTPUT INSERTED.EnrollId
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                vehicle_id,
                service_type_id,
                ride_type_id,
                status,
                checked_by,
                reviewed_at,
                review_comment,
            ),
        )
        
        result = cursor.fetchone()
        return result[0] if result else None  # Return the generated INT
        
        return enroll_id  # Return the UUID we generated

    def create_supply_availability(enroll_id, zone_id, approx_start):
        """Create an availability window around the leg's ApproxStartTime."""
        pickup_date = approx_start.date()
        h = approx_start.time().hour
        start_hour = max(h - 1, 0)
        end_hour = min(h + 1, 23)
        starts_at = dtime(start_hour, 0)
        ends_at = dtime(end_hour, 0)

        cursor.execute(
            """
            INSERT INTO [dbo].[DriverAvailability] (
                EnrollId, AvailabilityDate, GeofencezoneId,
                StartsAt, EndsAt, IsRecurring, UpdatedAt, IsLocked
            )
            VALUES (?, ?, ?, ?, ?, 0, GETUTCDATE(), 0)
            """,
            enroll_id,
            pickup_date,
            zone_id,
            starts_at,
            ends_at,
        )

    # ---------- main loop over legs ----------

    cursor.execute(
        """
        SELECT
            leg.LegId,
            leg.ZoneId,
            leg.ApproxStartTime,
            arp.ServiceTypeId,
            arp.RideTypeId,
            arp.VehicleTypeId
        FROM [dbo].[ItineraryLeg] AS leg
        INNER JOIN [dbo].[RideRequest] AS rr
            ON leg.RideRequestId = rr.RequestId
        INNER JOIN [dbo].[AllowedRideProfile] AS arp
            ON rr.RideProfileId = arp.RideProfileId
        """
    )
    legs = cursor.fetchall()
    if not legs:
        print("⚠️  No itinerary legs found – nothing to ensure")
        return

    created_users = created_vehicles = created_enrollments = created_avail = 0

    for (
        leg_id,
        zone_id,
        approx_start,
        service_type_id,
        ride_type_id,
        vehicle_type_id,
    ) in legs:
        pickup_date = approx_start.date()
        pickup_time = approx_start.time()

        # 1) Check if at least ONE full-match candidate already exists
        cursor.execute(
            """
            SELECT TOP 1 enroll.EnrollId
            FROM [dbo].[UserServiceEnrollment] AS enroll
            INNER JOIN [dbo].[User] AS u
                ON enroll.UserId = u.UserId
            INNER JOIN [dbo].[DriverAvailability] AS avail
                ON enroll.EnrollId = avail.EnrollId
            INNER JOIN [dbo].[Vehicle] AS v
                ON enroll.VehicleId = v.VehicleId
            WHERE enroll.ServiceType = ?
              AND enroll.RideType   = ?
              AND v.VehicleTypeId   = ?
              AND enroll.Status     = 'Approved'
              AND v.Verified        = 1
              AND v.Status          = 'Active'
              AND avail.GeofencezoneId  = ?
              AND avail.AvailabilityDate = ?
              AND ? BETWEEN avail.StartsAt AND avail.EndsAt
            """,
            service_type_id,
            ride_type_id,
            vehicle_type_id,
            zone_id,
            pickup_date,
            pickup_time,
        )
        if cursor.fetchone():
            # Supply exists for this leg – nothing to do
            continue

        # 2) No candidate → we must create supply for this leg
        ride_type_name = ride_type_name_by_id.get(ride_type_id, "")
        # driver vs company rep depending on ride type
        if ride_type_name in ("vehicle_with_driver", "small_cargo_van"):
            role = "D"
        else:
            role = "C"

        # Try to reuse existing Verified+Active vehicle of that type & role owner
        cursor.execute(
            """
            SELECT TOP 1 v.VehicleId, v.OwnerUserId
            FROM [dbo].[Vehicle] AS v
            INNER JOIN [dbo].[User] AS u
                ON v.OwnerUserId = u.UserId
            WHERE v.VehicleTypeId = ?
              AND v.Verified      = 1
              AND v.Status        = 'Active'
              AND u.Role          = ?
            """,
            vehicle_type_id,
            role,
        )
        row = cursor.fetchone()
        if row:
            vehicle_id, user_id = row
        else:
            # Need a fresh user + vehicle
            user_id = create_supply_user(role)
            created_users += 1
            vehicle_id = create_supply_vehicle(user_id, vehicle_type_id)
            created_vehicles += 1

        enroll_id = create_supply_enrollment(
            user_id, vehicle_id, service_type_id, ride_type_id
        )
        created_enrollments += 1

        create_supply_availability(enroll_id, zone_id, approx_start)
        created_avail += 1

        # small batched commit
        commit_batch(cursor, created_enrollments, "LegSupply")

    print(
        f"✔ ensure_supply_for_each_leg: "
        f"{created_users} users, {created_vehicles} vehicles, "
        f"{created_enrollments} enrollments, {created_avail} availability rows created"
    )


def seed_dispatch_offers(cursor, leg_ids, search_radius_meters=5000.0):
    print("Seeding DispatchOffer via usp_DispatchOfferCreation...")
    offer_ids = []

    if not leg_ids:
        print("⚠️  No itinerary legs → skipping DispatchOffer")
        return []

    # Debug the FIRST leg in detail
    if leg_ids:
        first_leg = leg_ids[0]
        print(f"\n=== DEBUGGING FIRST LEG (LegId={first_leg}) ===")
        
        # Get leg details
        cursor.execute("""
            SELECT 
                leg.RideRequestId,
                leg.ZoneId,
                leg.ApproxStartTime,
                rr.RideProfileId,
                arp.ServiceTypeId,
                arp.RideTypeId,
                arp.VehicleTypeId
            FROM [dbo].[ItineraryLeg] leg
            INNER JOIN [dbo].[RideRequest] rr ON leg.RideRequestId = rr.RequestId
            INNER JOIN [dbo].[AllowedRideProfile] arp ON rr.RideProfileId = arp.RideProfileId
            WHERE leg.LegId = ?
        """, first_leg)
        leg_info = cursor.fetchone()
        (
            ride_request_id,
            zone_id,
            pickup_dt,
            ride_profile_id,
            service_type_id,
            ride_type_id,
            vehicle_type_id,
        ) = leg_info


        print(f"Leg info: RequestId={ride_request_id}, ZoneId={zone_id}, PickupTime={pickup_dt}")
        print(f"Required: ServiceType={service_type_id}, RideType={ride_type_id}, VehicleType={vehicle_type_id}")

        # Check how many enrollments match
        cursor.execute("""
            SELECT COUNT(*)
            FROM [dbo].[UserServiceEnrollment] US JOIN [dbo].[Vehicle] V ON US.VehicleId=V.VehicleId
            WHERE ServiceType = ? AND RideType = ? AND V.VehicleTypeId = ? AND US.Status = 'Approved'
        """, service_type_id, ride_type_id, vehicle_type_id)
        print(f"Matching approved enrollments: {cursor.fetchone()[0]}")

        # Check vehicles
        cursor.execute("""
            SELECT COUNT(*)
            FROM [dbo].[Vehicle]
            WHERE VehicleTypeId = ? AND Verified = 1 AND Status = 'Active'
        """, vehicle_type_id)
        print(f"Matching verified active vehicles: {cursor.fetchone()[0]}")

        # Check availability for this date/zone
        pickup_date = pickup_dt.date()
        pickup_time = pickup_dt.time()
        cursor.execute("""
            SELECT COUNT(*)
            FROM [dbo].[DriverAvailability]
            WHERE GeofencezoneId = ? 
            AND AvailabilityDate = ?
            AND ? BETWEEN StartsAt AND EndsAt
        """, zone_id, pickup_date, pickup_time)
        print(f"Availability slots for Zone {zone_id} on {pickup_date} at {pickup_time}: {cursor.fetchone()[0]}")

        # Check full join
        cursor.execute("""
            SELECT COUNT(*)
            FROM [dbo].[UserServiceEnrollment] enroll
            INNER JOIN [dbo].[DriverAvailability] avail ON enroll.EnrollId = avail.EnrollId
            INNER JOIN [dbo].[Vehicle] v ON enroll.VehicleId = v.VehicleId
            WHERE enroll.ServiceType = ?
            AND enroll.RideType = ?
            AND v.VehicleTypeId = ?
            AND enroll.Status = 'Approved'
            AND v.Verified = 1
            AND v.Status = 'Active'
            AND avail.GeofencezoneId = ?
            AND avail.AvailabilityDate = ?
            AND ? BETWEEN avail.StartsAt AND avail.EndsAt
        """, service_type_id, ride_type_id, vehicle_type_id, zone_id, pickup_date, pickup_time)
        print(f"Full match (all conditions): {cursor.fetchone()[0]}")
        print("=== END DEBUG ===\n")

    for i, leg_id in enumerate(leg_ids, start=1):
        cursor.execute(
            "EXEC [dbo].[usp_DispatchOfferCreation] @ItineraryLegId = ?, @SearchRadiusMeters = ?",
            leg_id,
            search_radius_meters,
        )

        cursor.execute(
            "SELECT OfferId FROM [dbo].[DispatchOffer] WHERE LegId = ?",
            leg_id,
        )
        offers = cursor.fetchall()
        
        for (offer_id,) in offers:
            offer_ids.append(offer_id)

        commit_batch(cursor, i, "DispatchOffer")

    print(f"✔ Seeded {len(offer_ids)} dispatch offers")
    return offer_ids


# ==============================
# PAYMENTS, RIDES, RATINGS, MESSAGES
# ==============================

def seed_payments(cursor):
    print("Seeding Payment from Rides...")

    # Load all rides
    cursor.execute(
        """
        SELECT RideId, DriverUserId, PassengerUserId, PriceFinal, Status, StartedAt, EndedAt
        FROM [dbo].[Ride]
        """
    )
    rides = cursor.fetchall()
    if not rides:
        print("⚠️  No rides → skipping Payment")
        return []

    payment_ids = []
    count = 0

    for (
        ride_id,
        driver_id,
        passenger_id,
        price_final,
        ride_status,
        started_at,
        ended_at,
    ) in rides:
        if price_final is None:
            continue

        # --- Amounts ---
        gross_amount = float(price_final)
        fee_rate = 0.15
        osrh_fee = round(gross_amount * fee_rate, 2)
        driver_payout = round(gross_amount - osrh_fee, 2)

        # Safety clamp
        if driver_payout < 0:
            driver_payout = 0.0

        # --- Method ---
        method = random.choices(
            ["CreditCard", "Cash"],
            weights=[70, 30],
            k=1,
        )[0]

        # --- Status & PaidAt determined by ride status ---
        if ride_status == "Completed":
            pay_status = random.choices(
                ["Completed", "Failed", "Refunded"],
                weights=[80, 10, 10],
                k=1,
            )[0]
        elif ride_status in ("Scheduled", "InProgress"):
            pay_status = "Pending"
        elif ride_status == "Cancelled":
            pay_status = random.choices(
                ["Pending", "Failed", "Refunded"],
                weights=[50, 25, 25],
                k=1,
            )[0]
        else:
            pay_status = "Pending"

        if pay_status in ("Completed", "Refunded"):
            # Paid sometime shortly after ride ended
            base_time = ended_at or started_at or datetime.utcnow()
            paid_at = base_time + timedelta(
                minutes=random.randint(1, 60)
            )
        else:
            paid_at = None

        # --- Insert Payment and link to Ride ---
        cursor.execute(
            """
            INSERT INTO [dbo].[Payment] (
                SenderUserId,
                ReceiverUserId,
                GrossAmount,
                OsrhFee,
                DriverPayout,
                PaidAt,
                Method,
                Status
            )
            OUTPUT INSERTED.PaymentId
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                passenger_id,      # sender = passenger
                driver_id,         # receiver = driver
                gross_amount,
                osrh_fee,
                driver_payout,
                paid_at,
                method,
                pay_status,
            ),
        )
        payment_id = cursor.fetchone()[0]
        payment_ids.append(payment_id)

        # link payment to ride
        cursor.execute(
            """
            UPDATE [dbo].[Ride]
            SET Payment = ?
            WHERE RideId = ?
            """,
            payment_id,
            ride_id,
        )

        count += 1
        commit_batch(cursor, count, "Payment")

    print(f"✔ Seeded {len(payment_ids)} payments")
    return payment_ids


def seed_rides(cursor, offer_ids, driver_ids, passenger_ids, vehicle_ids, payment_ids):
    print("Seeding Rides...")
    ride_ids = []
    if not offer_ids:
        print("⚠️  No offers → skipping Rides")
        return []

    for i, offer_id in enumerate(offer_ids, start=1):
        driver = random.choice(driver_ids)
        passenger = random.choice(passenger_ids)
        vehicle = random.choice(vehicle_ids)
        started_at = datetime.utcnow() - timedelta(minutes=random.randint(10, 120))
        # bug fix: timedelta(minutes=...) instead of timedelta(minutes[...])
        ended_at = started_at + timedelta(minutes=random.randint(5, 60))
        distance = round(random.uniform(2, 30), 2)
        duration = int((ended_at - started_at).total_seconds() // 60)
        price = round(distance * random.uniform(0.7, 1.2) + 3, 2)
        status = random.choice(["Scheduled", "InProgress", "Completed", "Cancelled"])
        payment = random.choice(payment_ids) if payment_ids and status == "Completed" else None

        ride_id = insert_with_identity(
            cursor,
            """
            INSERT INTO [dbo].[Ride] (
                OfferId, DriverUserId, PassengerUserId, VehicleId,
                StartedAt, EndedAt, DistanceKm, DurationMinutes,
                PriceFinal, Status, Payment
            )
            OUTPUT INSERTED.RideId
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                offer_id,
                driver,
                passenger,
                vehicle,
                started_at,
                ended_at,
                distance,
                duration,
                price,
                status,
                payment,
            ),
        )
        ride_ids.append(ride_id)
        commit_batch(cursor, i, "Ride")
    print(f"✔ Seeded {len(ride_ids)} rides")
    return ride_ids


def seed_rides_from_offers(cursor):
    """
    Turn some DispatchOffers into real Rides.

    Rules:
    - At most 1 Accepted offer per leg.
    - For a subset of RideRequests:
        * every leg gets exactly 1 Accepted offer
        * create 1 Ride per accepted offer (per leg)
        * update RideRequestProgress accordingly.
    """
    print("Seeding Rides from DispatchOffers...")

    # 1) Load legs grouped by RideRequest
    cursor.execute(
        "SELECT LegId, RideRequestId, ApproxStartTime, ApproxEndTime FROM [dbo].[ItineraryLeg]"
    )
    legs_by_req = {}
    leg_time = {}
    for leg_id, req_id, start_at, end_at in cursor.fetchall():
        legs_by_req.setdefault(req_id, []).append(leg_id)
        leg_time[leg_id] = (start_at, end_at)

    if not legs_by_req:
        print("⚠️  No itinerary legs → skipping Rides")
        return []

    # 2) Load offers grouped by leg
    cursor.execute(
        "SELECT OfferId, LegId, RecipientUserId, EnrollId, Status FROM [dbo].[DispatchOffer]"
    )
    offers_by_leg = {}
    for offer_id, leg_id, recipient_id, enroll_id, status in cursor.fetchall():
        offers_by_leg.setdefault(leg_id, []).append(
            (offer_id, recipient_id, enroll_id, status)
        )

    if not offers_by_leg:
        print("⚠️  No dispatch offers → skipping Rides")
        return []

    # 3) Load passenger per RideRequest
    cursor.execute("SELECT RequestId, PassengerId FROM [dbo].[RideRequest]")
    passenger_by_req = {
        req_id: passenger_id for req_id, passenger_id in cursor.fetchall()
    }

    # 4) Load enrollment info (to get VehicleId & DriverUserId)
    cursor.execute(
        "SELECT EnrollId, UserId, VehicleId FROM [dbo].[UserServiceEnrollment]"
    )
    enroll_info = {}
    for enroll_id, user_id, vehicle_id in cursor.fetchall():
        enroll_info[enroll_id] = (user_id, vehicle_id)

    # 5) Determine which RideRequests are eligible for full acceptance
    candidate_req_ids = []
    for req_id, leg_ids in legs_by_req.items():
        if all(leg_id in offers_by_leg for leg_id in leg_ids):
            candidate_req_ids.append(req_id)

    if not candidate_req_ids:
        print("⚠️  No ride requests have offers on all legs → no rides will be created")
        return []

    # We'll mark about 40% of those as "fully fulfilled"
    num_to_fulfill = max(1, int(len(candidate_req_ids) * 0.4))
    chosen_req_ids = set(random.sample(candidate_req_ids, num_to_fulfill))

    ride_ids = []
    counter = 0

    for req_id, leg_ids in legs_by_req.items():
        if req_id not in chosen_req_ids:
            # Leave offers in 'Sent' state → still AwaitingDrivers
            continue

        passenger_id = passenger_by_req.get(req_id)
        if not passenger_id:
            continue

        all_legs_have_accepted = True
        accepted_offers_for_req = []

        # 6) For each leg: pick exactly 1 offer to Accept
        for leg_id in leg_ids:
            offers = offers_by_leg.get(leg_id, [])
            if not offers:
                all_legs_have_accepted = False
                break

            # Prefer offers that are still 'Sent'
            sent_offers = [o for o in offers if o[3] == "Sent"]
            if sent_offers:
                chosen = random.choice(sent_offers)
            else:
                chosen = random.choice(offers)

            chosen_offer_id, driver_id, enroll_id, _ = chosen

            # Mark chosen offer as Accepted
            cursor.execute(
                """
                UPDATE [dbo].[DispatchOffer]
                SET Status = 'Accepted', RespondedAt = GETUTCDATE()
                WHERE OfferId = ?
                """,
                chosen_offer_id,
            )

            # Mark other offers for that leg as Expired (only if still Sent)
            other_offers = [o for o in offers if o[0] != chosen_offer_id]
            for (other_offer_id, _, _, _) in other_offers:
                cursor.execute(
                    """
                    UPDATE [dbo].[DispatchOffer]
                    SET Status = 'Expired', RespondedAt = COALESCE(RespondedAt, GETUTCDATE())
                    WHERE OfferId = ? AND Status = 'Sent'
                    """,
                    other_offer_id,
                )

            accepted_offers_for_req.append(
                (leg_id, chosen_offer_id, driver_id, enroll_id)
            )

        if not all_legs_have_accepted:
            # Safety fallback (should rarely happen due to candidate filter)
            for _, offer_id, _, _ in accepted_offers_for_req:
                cursor.execute(
                    """
                    UPDATE [dbo].[DispatchOffer]
                    SET Status = 'Sent', RespondedAt = NULL
                    WHERE OfferId = ?
                    """,
                    offer_id,
                )
            continue

        # 7) Create one Ride per accepted offer (per leg)
        for leg_id, offer_id, driver_id, enroll_id in accepted_offers_for_req:
            times = leg_time.get(leg_id)
            if times:
                approx_start, approx_end = times
            else:
                approx_start = datetime.utcnow()
                approx_end = approx_start + timedelta(minutes=random.randint(10, 30))

            # Get vehicle from enrollment
            vehicle_id = None
            if enroll_id in enroll_info:
                _, vehicle_id = enroll_info[enroll_id]

            if vehicle_id is None:
                continue  # corrupt enrollment → skip

            duration_minutes = int(
                (approx_end - approx_start).total_seconds() / 60
            ) or random.randint(10, 30)
            distance_km = round(random.uniform(1.0, 20.0), 2)
            price_final = round(random.uniform(5.0, 80.0), 2)
            status = random.choices(
                ["Scheduled", "InProgress", "Completed"],
                weights=[30, 20, 50],
                k=1,
            )[0]

            cursor.execute(
                """
                INSERT INTO [dbo].[Ride] (
                    OfferId,
                    DriverUserId,
                    PassengerUserId,
                    VehicleId,
                    StartedAt,
                    EndedAt,
                    DistanceKm,
                    DurationMinutes,
                    PriceFinal,
                    Status,
                    Payment
                )
                OUTPUT INSERTED.RideId
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                """,
                (
                    offer_id,
                    driver_id,
                    passenger_id,
                    vehicle_id,
                    approx_start,
                    approx_end,
                    distance_km,
                    duration_minutes,
                    price_final,
                    status,
                ),
            )
            new_ride_id = cursor.fetchone()[0]
            ride_ids.append(new_ride_id)
            counter += 1
            commit_batch(cursor, counter, "Ride")

        # 8) Update RideRequestProgress → all legs accepted, rides created
        total_legs = len(leg_ids)
        cursor.execute(
            """
            UPDATE [dbo].[RideRequestProgress]
            SET AcceptedLegs = ?, Status = 'RidesCreated', UpdatedAt = GETUTCDATE()
            WHERE RequestId = ?
            """,
            total_legs,
            req_id,
        )

    print(f"✔ Seeded {len(ride_ids)} rides from dispatch offers")
    return ride_ids


def seed_ratings(cursor):
    print("Seeding Ratings (bidirectional)...")

    # Load rides
    cursor.execute(
        """
        SELECT RideId, DriverUserId, PassengerUserId, Status
        FROM [dbo].[Ride]
        """
    )
    rides = cursor.fetchall()
    if not rides:
        print("⚠️  No rides → skipping Ratings")
        return []

    rating_ids = []
    count = 0

    def random_stars():
        # Mostly 4–5 stars, some mid, few very low
        roll = random.random()
        if roll < 0.05:
            return random.choice([1, 2])  # 5% very bad
        elif roll < 0.20:
            return 3                      # 15% neutral
        elif roll < 0.60:
            return 4                      # 40% good
        else:
            return 5                      # 40% excellent

    def random_comment(stars, author_role, target_role):
        # Optionally return None to simulate no comment
        if random.random() < 0.4:
            return None

        # Simple canned phrases
        if stars >= 4:
            if author_role == "Passenger" and target_role == "Driver":
                return random.choice([
                    "Very smooth ride.",
                    "Friendly and professional driver.",
                    "Arrived on time and the ride was great.",
                    "No issues, would ride again.",
                ])
            elif author_role == "Driver" and target_role == "Passenger":
                return random.choice([
                    "Polite passenger, everything went smoothly.",
                    "Easy pickup and dropoff.",
                    "On time and respectful.",
                    "No problems at all.",
                ])
        elif stars == 3:
            return random.choice([
                "Average experience.",
                "It was okay.",
                "Nothing special, but no major issues either.",
            ])
        else:  # 1–2 stars
            if author_role == "Passenger":
                return random.choice([
                    "Driver was late and the ride was not great.",
                    "Had some issues during the ride.",
                    "Not very satisfied with this trip.",
                ])
            else:
                return random.choice([
                    "Passenger caused some issues.",
                    "Difficult communication during the trip.",
                    "Would not prefer to drive this passenger again.",
                ])

        return None

    for ride_id, driver_id, passenger_id, status in rides:
        # Decide probabilities based on ride status
        if status == "Completed":
            p_passenger_rates = 0.8
            p_driver_rates = 0.6
        elif status in ("Scheduled", "InProgress"):
            p_passenger_rates = 0.1
            p_driver_rates = 0.05
        elif status == "Cancelled":
            p_passenger_rates = 0.2
            p_driver_rates = 0.1
        else:
            p_passenger_rates = 0.1
            p_driver_rates = 0.05

        # Passenger → Driver
        if random.random() < p_passenger_rates:
            stars = random_stars()
            comment = random_comment(stars, "Passenger", "Driver")
            cursor.execute(
                """
                INSERT INTO [dbo].[Rating] (
                    RideId,
                    AuthorUserId,
                    TargetUserId,
                    Stars,
                    Comment,
                    CreatedAt
                )
                VALUES (?, ?, ?, ?, ?, GETUTCDATE())
                """,
                ride_id,
                passenger_id,
                driver_id,
                stars,
                comment,
            )
            count += 1
            commit_batch(cursor, count, "Rating")

        # Driver → Passenger
        if random.random() < p_driver_rates:
            stars = random_stars()
            comment = random_comment(stars, "Driver", "Passenger")
            cursor.execute(
                """
                INSERT INTO [dbo].[Rating] (
                    RideId,
                    AuthorUserId,
                    TargetUserId,
                    Stars,
                    Comment,
                    CreatedAt
                )
                VALUES (?, ?, ?, ?, ?, GETUTCDATE())
                """,
                ride_id,
                driver_id,
                passenger_id,
                stars,
                comment,
            )
            count += 1
            commit_batch(cursor, count, "Rating")

    print(f"✔ Seeded {count} ratings")
    return []


def seed_inapp_messages(cursor):
    print("Seeding InAppMessage...")

    cursor.execute("""
        SELECT RideId, DriverUserId, PassengerUserId, StartedAt, EndedAt, Status
        FROM [dbo].[Ride]
    """)
    rides = cursor.fetchall()

    if not rides:
        print("⚠️ No rides → no messages.")
        return

    count = 0

    # Predefined short templates
    passenger_msgs_pre = [
        "Hi! I'm on my way to the pickup point.",
        "I will be there in a minute.",
        "Where exactly should I wait?",
        "I'm standing near the entrance.",
        "Just letting you know I'm ready!",
        "Please don't leave, I'm almost there.",
    ]

    driver_msgs_pre = [
        "I'm arriving shortly.",
        "I’m on my way to you.",
        "I will be there in 2 minutes.",
        "Stuck in a bit of traffic but coming.",
        "Please wait at the marked pickup spot.",
        "I'm nearby, coming now.",
    ]

    passenger_msgs_mid = [
        "Everything good?",
        "Could we take a slightly faster route?",
        "Can you drop me a bit further ahead?",
        "Please stop at the next corner.",
        "I forgot something, could we turn back?",
    ]

    driver_msgs_mid = [
        "Traffic ahead, we may be delayed.",
        "We'll arrive in about 5 minutes.",
        "Hold on, taking a detour.",
        "Is the temperature okay?",
        "We’re almost there.",
    ]

    passenger_msgs_cancel = [
        "I'm cancelling the ride.",
        "Sorry, I won’t make it.",
        "Had to cancel, something came up.",
    ]

    driver_msgs_cancel = [
        "I can't make it, sorry.",
        "I'm running late, might need to cancel.",
    ]

    def random_time_between(start, end):
        # If missing timestamps, use now
        if not start or not end:
            base = datetime.utcnow()
            return base - timedelta(minutes=random.randint(1, 30))
        delta = end - start
        seconds = random.randint(1, max(60, int(delta.total_seconds())))
        return start + timedelta(seconds=seconds)

    for ride_id, driver_id, passenger_id, started_at, ended_at, status in rides:

        # Determine expected number of messages
        if status == "Completed":
            n_pre = random.randint(1, 3)
            n_mid = random.randint(2, 5)
        elif status == "InProgress":
            n_pre = random.randint(1, 3)
            n_mid = random.randint(1, 3)
        elif status == "Scheduled":
            n_pre = random.randint(0, 2)
            n_mid = 0
        elif status == "Cancelled":
            n_pre = random.randint(0, 1)
            n_mid = 0
        else:
            continue

        # Pre-ride messages
        for _ in range(n_pre):
            if random.random() < 0.5:
                sender, recipient = passenger_id, driver_id
                body = random.choice(passenger_msgs_pre)
            else:
                sender, recipient = driver_id, passenger_id
                body = random.choice(driver_msgs_pre)

            cursor.execute(
                """
                INSERT INTO [dbo].[InAppMessage] (SenderUserId, RecipientUserId, Body, SentAt, Ride)
                VALUES (?, ?, ?, ?, ?)
                """,
                sender,
                recipient,
                body,
                random_time_between(started_at or datetime.utcnow() - timedelta(minutes=10),
                                    started_at or datetime.utcnow()),
                ride_id,
            )
            count += 1
            commit_batch(cursor, count, "InAppMessage")

        # Mid-ride messages
        for _ in range(n_mid):
            if random.random() < 0.5:
                sender, recipient = passenger_id, driver_id
                body = random.choice(passenger_msgs_mid)
            else:
                sender, recipient = driver_id, passenger_id
                body = random.choice(driver_msgs_mid)

            cursor.execute(
                """
                INSERT INTO [dbo].[InAppMessage] (SenderUserId, RecipientUserId, Body, SentAt, Ride)
                VALUES (?, ?, ?, ?, ?)
                """,
                sender,
                recipient,
                body,
                random_time_between(started_at, ended_at),
                ride_id,
            )
            count += 1
            commit_batch(cursor, count, "InAppMessage")

        # Cancel messages (if applicable)
        if status == "Cancelled":
            if random.random() < 0.5:
                sender, recipient = passenger_id, driver_id
                body = random.choice(passenger_msgs_cancel)
            else:
                sender, recipient = driver_id, passenger_id
                body = random.choice(driver_msgs_cancel)

            cursor.execute(
                """
                INSERT INTO [dbo].[InAppMessage] (SenderUserId, RecipientUserId, Body, SentAt, Ride)
                VALUES (?, ?, ?, ?, ?)
                """,
                sender,
                recipient,
                body,
                datetime.utcnow() - timedelta(minutes=random.randint(1, 20)),
                ride_id,
            )
            count += 1
            commit_batch(cursor, count, "InAppMessage")

    print(f"✔ Seeded {count} in-app messages")


# ==============================
# GDPR & VEHICLE LOCATION
# ==============================

def seed_gdpr_requests(cursor, all_user_ids):
    print("Seeding GdprRequest...")

    types = ["DataAccess", "DataDeletion", "DataExport", "DataCorrection"]
    # Include 'Completed' as a possible final state
    statuses = ["Pending", "Under-Review", "Pre-Approved", "Approved", "Denied", "Completed"]
    # Weighted distribution for more realism
    status_weights = [40, 20, 10, 15, 10, 5]  # must sum to 100 logically

    gdpr_ids = []
    num_requests = max(5, len(all_user_ids) // 5)

    for i in range(num_requests):
        user = random.choice(all_user_ids)
        req_type = random.choice(types)
        status = random.choices(statuses, weights=status_weights, k=1)[0]

        requested_at = datetime.utcnow() - timedelta(days=random.randint(0, 30))

        # Only final decisions get DecidedAt
        if status in ("Approved", "Denied", "Completed"):
            decided_at = requested_at + timedelta(days=random.randint(1, 10))
        else:
            decided_at = None

        gdpr_id = insert_with_identity(
            cursor,
            """
            INSERT INTO [dbo].[GdprRequest] (
                UserId, Type, Status, Reason, RequestedAt, DecidedAt
            )
            OUTPUT INSERTED.GdprId
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user,
                req_type,
                status,
                f"Seeder auto-request ({req_type})",
                requested_at,
                decided_at,
            ),
        )
        gdpr_ids.append(gdpr_id)
        commit_batch(cursor, i + 1, "GdprRequest")

    print(f"✔ Seeded {len(gdpr_ids)} GDPR requests")
    return gdpr_ids


def seed_gdpr_logs(cursor, gdpr_ids, operator_ids):
    print("Seeding GdprLog...")

    if not gdpr_ids:
        print("⚠️ No GDPR requests → skipping GdprLog")
        return

    count = 0

    for gid in gdpr_ids:
        # Fetch request details to shape the log story
        cursor.execute(
            """
            SELECT UserId, Type, Status, RequestedAt, DecidedAt
            FROM [dbo].[GdprRequest]
            WHERE GdprId = ?
            """,
            gid,
        )
        row = cursor.fetchone()
        if not row:
            continue

        user_id, req_type, status, requested_at, decided_at = row

        # Build a sequence of log "events" depending on final status
        events = []

        # Always at least "created"
        events.append((
            None,  # system / auto
            requested_at,
            f"Request created for {req_type} by user {user_id}."
        ))

        if status in ("Under-Review", "Pre-Approved", "Approved", "Denied", "Completed"):
            # Marked as under review
            events.append((
                random.choice(operator_ids) if operator_ids else None,
                requested_at + timedelta(hours=random.randint(1, 24)),
                "Request marked as Under-Review."
            ))

        if status in ("Pre-Approved", "Approved", "Denied", "Completed"):
            # Pre-approval step (for some, skip randomly so it's not always present)
            if random.random() < 0.7:
                events.append((
                    random.choice(operator_ids) if operator_ids else None,
                    requested_at + timedelta(days=random.randint(1, 5)),
                    "Request preliminarily assessed (Pre-Approved)."
                ))

        if status in ("Approved", "Denied", "Completed"):
            decision_time = decided_at or (requested_at + timedelta(days=random.randint(2, 10)))
            decision_note = f"Final decision: {status}."

            # Slightly more detailed note for Completed
            if status == "Completed":
                decision_note = f"Final decision: Approved and actions completed for {req_type}."

            events.append((
                random.choice(operator_ids) if operator_ids else None,
                decision_time,
                decision_note
            ))

            # If Completed, add a final log entry marking actual completion
            if status == "Completed":
                events.append((
                    random.choice(operator_ids) if operator_ids else None,
                    decision_time + timedelta(hours=random.randint(1, 24)),
                    "Request marked as Completed. All GDPR actions executed successfully."
                ))

        # Insert between 1 and len(events) logs (random subset but in order)
        # to avoid every request getting the full story
        max_logs = len(events)
        num_logs = random.randint(1, max_logs)

        # Sort by timestamp and take the first num_logs to maintain chronology
        events_sorted = sorted(events, key=lambda e: (e[1] or requested_at))
        selected_events = events_sorted[:num_logs]

        for actor_id, logged_at, note in selected_events:
            cursor.execute(
                """
                INSERT INTO [dbo].[GdprLog] (
                    GdprId, ActorAdminId, LoggedAt, Note
                )
                VALUES (?, ?, ?, ?)
                """,
                gid,
                actor_id,
                logged_at or datetime.utcnow(),
                note,
            )
            count += 1
            commit_batch(cursor, count, "GdprLog")

    print(f"✔ Seeded {count} GDPR logs")


def seed_vehicle_location_live(cursor, vehicle_ids):
    print("Seeding VehicleLocationLive based on availability zones...")

    if not vehicle_ids:
        print("⚠️  No vehicles → skipping VehicleLocationLive")
        return

    # 1) Preload zone bounds
    cursor.execute(
        "SELECT ZoneId, MinLat, MinLng, MaxLat, MaxLng FROM [dbo].[GeofenceZone]"
    )
    zone_bounds = {}
    for zone_id, min_lat, min_lng, max_lat, max_lng in cursor.fetchall():
        if min_lat is None or min_lng is None or max_lat is None or max_lng is None:
            continue
        zone_bounds[zone_id] = (float(min_lat), float(min_lng), float(max_lat), float(max_lng))

    if not zone_bounds:
        print("⚠️  No valid geofence zone bounds → falling back to random Cyprus box")
        zone_bounds = None

    count = 0

    for i, vid in enumerate(vehicle_ids, start=1):
        # 2) Find zones where this vehicle has approved enrollments + availability
        cursor.execute(
            """
            SELECT DISTINCT da.GeofencezoneId
            FROM [dbo].[UserServiceEnrollment] AS e
            INNER JOIN [dbo].[DriverAvailability] AS da
                ON e.EnrollId = da.EnrollId
            WHERE e.VehicleId = ?
              AND e.Status = 'Approved'
            """,
            vid,
        )
        rows = cursor.fetchall()

        chosen_zone_id = None
        if rows:
            possible_zones = [row[0] for row in rows if row[0] in (zone_bounds or {})]
            if possible_zones:
                chosen_zone_id = random.choice(possible_zones)

        # Fallback: random zone from all zone bounds
        if chosen_zone_id is None and zone_bounds:
            chosen_zone_id = random.choice(list(zone_bounds.keys()))

        # If still nothing, fallback to coarse random box (Cyprus-ish)
        if chosen_zone_id is not None and zone_bounds:
            min_lat, min_lng, max_lat, max_lng = zone_bounds[chosen_zone_id]
            lat = round(random.uniform(min_lat, max_lat), 6)
            lng = round(random.uniform(min_lng, max_lng), 6)
        else:
            # extreme fallback if no bounds at all
            lat = round(random.uniform(34.6, 35.2), 6)
            lng = round(random.uniform(32.9, 33.7), 6)

        cursor.execute(
            """
            INSERT INTO [dbo].[VehicleLocationLive] (
                VehicleId, Lat, Lng, UpdatedAt
            )
            VALUES (?, ?, ?, GETUTCDATE())
            """,
            vid,
            lat,
            lng,
        )
        count += 1
        commit_batch(cursor, count, "VehicleLocationLive")

    print(f"✔ Seeded VehicleLocationLive for {len(vehicle_ids)} vehicles")


# ==============================
# MAIN (ONE TRANSACTION, BUT BATCH COMMITS)
# ==============================

def main():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 1) Zones / Points / Bridges
        # seed_geofence_data(cursor)

        # 2) Admins, Operators and Inspectors
        admin_ids = seed_admins(cursor, num_admins=NUM_ADMINS)
        operator_ids = seed_operators(cursor, num_operators=NUM_OPERATORS, admin_ids=admin_ids)
        inspector_ids = seed_inspectors(cursor, num_inspectors=NUM_INSPECTORS)

        # 3) Users and role tables
        passenger_ids, driver_ids, company_ids, all_user_ids = seed_users(
            cursor,
            num_passengers=NUM_PASSENGERS,
            num_drivers=NUM_DRIVERS,
            num_company=NUM_COMPANY_REPS,
        )
        seed_passengers(cursor, passenger_ids)
        seed_drivers(cursor, driver_ids)
        seed_company_reps(cursor, company_ids)
        seed_user_preferences(cursor, all_user_ids)

        # 4) Service / ride / vehicle types / allowed profiles
        service_type_ids = seed_service_types(cursor)
        ride_type_ids = seed_ride_types(cursor)
        vehicle_type_ids = seed_vehicle_types(cursor)
        allowed_profiles = seed_allowed_profiles(cursor, service_type_ids, ride_type_ids, vehicle_type_ids)

        # 5) Vehicles & docs/tests
        vehicle_ids = seed_vehicles(
            cursor,
            num_vehicles=NUM_VEHICLES,
            vehicle_type_data=vehicle_type_ids,
            owner_user_ids=driver_ids + company_ids,
            operator_ids=operator_ids,
        )
        seed_person_documents(
            cursor,
            passenger_ids=passenger_ids,
            driver_ids=driver_ids,
            company_ids=company_ids,
            operator_ids=operator_ids,
        )
        seed_vehicle_documents(cursor, vehicle_ids, operator_ids)

        # 6) Enrollments & driver availability
        enrollments_by_user, all_enroll_ids = seed_user_service_enrollments(
            cursor,
            driver_ids=driver_ids,
            company_ids=company_ids,
            service_type_ids=service_type_ids,
            ride_type_ids=ride_type_ids,
            operator_ids=operator_ids,
        )
        seed_driver_availability(cursor)

        # 7) Ride requests / logs / progress / itinerary + offers
        zone_points_by_zone = get_zone_points(cursor)
        zone_graph = get_zone_graph(cursor)
        ride_request_ids, request_info = seed_ride_requests(
            cursor,
            num_requests=NUM_RIDE_REQUESTS,
            passenger_ids=passenger_ids,
            allowed_profiles=allowed_profiles,
            zone_points_by_zone=zone_points_by_zone,
            zone_graph = zone_graph
        )
        leg_ids = seed_itinerary_legs(cursor, request_info)

        ensure_supply_for_each_leg(cursor, operator_ids)

        cursor.execute("SELECT VehicleId FROM [dbo].[Vehicle]")
        all_vehicle_ids = [row[0] for row in cursor.fetchall()]
        seed_vehicle_location_live(cursor, all_vehicle_ids)

        offer_ids = seed_dispatch_offers(cursor, leg_ids)

        seed_rides_from_offers(cursor)
        seed_payments(cursor)
        seed_ratings(cursor)
        seed_inapp_messages(cursor)

        # 9) GDPR
        gdpr_ids = seed_gdpr_requests(cursor, all_user_ids)
        seed_gdpr_logs(cursor, gdpr_ids, operator_ids)

        seed_vehicle_tests(cursor, vehicle_ids, inspector_ids)

        # Final commit to flush any leftover < BATCH_SIZE rows
        conn.commit()
        print("\nALL DONE ✔✔✔ (batches committed)")

    except Exception as e:
        print("❌ ERROR during seeding, rolling back last batch:", e)
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
