import uuid
import random
import pyodbc
import pandas as pd
from datetime import datetime, timedelta, date, time
from pathlib import Path

# ==============================
# DB CONNECTION CONFIG
# ==============================
DB_HOST = "10.16.1.133"
DB_NAME = "aevago03"
DB_USER = "aevago03"
DB_PASS = "b9gDPgKA"

CN_STR = (
    "DRIVER={ODBC Driver 18 for SQL Server};"
    f"SERVER={DB_HOST},1433;"
    f"DATABASE={DB_NAME};"
    f"UID={DB_USER};"
    f"PWD={DB_PASS};"
    "Encrypt=no;"
    "TrustServerCertificate=yes;"
)

# ==============================
# SEEDER CONFIG – ALL COUNTS HERE
# ==============================
NUM_ADMINS = 1
NUM_OPERATORS = 1

NUM_PASSENGERS = 10
NUM_DRIVERS = 4
NUM_COMPANY_REPS = 10

NUM_INSPECTORS = 1
NUM_VEHICLES = 20
NUM_RIDE_REQUESTS = 100  # how many RideRequest rows to create

# max rows per transaction chunk
BATCH_SIZE = 100


def get_connection():
    # autocommit=False so we control the transaction
    return pyodbc.connect(CN_STR, autocommit=False)


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "seed_data" / "cyprus-zones-final"
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
    row = cursor.fetchone()
    return row[0]


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
                    1,
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
            random.choice([0, 1]),
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
            INSERT INTO [dbo].[CompanyRepresentative] (UserId, Company)
            VALUES (?, ?)
            """,
            uid,
            random.choice(["OSRH Ltd", "FarosCare Inc", "CyMobility SA"]),
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
        ("simple_route", "Simple point-to-point ride", 3.00, 0.80, 0.20),
        ("bridged_route", "Ride using bridges between zones", 4.00, 0.90, 0.25),
        ("luxury_route", "Premium vehicle and driver", 5.00, 1.20, 0.40),
        ("cargo_route", "Cargo / delivery ride", 6.00, 1.50, 0.50),
    ]
    service_type_ids = {}
    now = datetime.utcnow()

    for i, (name, desc, base, per_km, per_min) in enumerate(services, start=1):
        st_id = insert_with_identity(
            cursor,
            """
            INSERT INTO [dbo].[Servicetype] (
                Name, Description, BaseFare, PerKm, PerMin, ValidFrom, Active, CreatedAt
            )
            OUTPUT INSERTED.ServiceTypeId
            VALUES (?, ?, ?, ?, ?, ?, ?, GETUTCDATE())
            """,
            (name, desc, base, per_km, per_min, now, 1),
        )
        service_type_ids[name] = st_id
        commit_batch(cursor, i, "Servicetype")

    print(f"✔ Seeded {len(service_type_ids)} service types")
    return service_type_ids


def seed_ride_types(cursor):
    print("Seeding Ridetype...")
    ride_types = [
        ("vehicle_with_driver", "Driver provided"),
        ("vehicle_no_driver", "Self drive"),
    ]
    ride_type_ids = {}
    for i, (name, desc) in enumerate(ride_types, start=1):
        rt_id = insert_with_identity(
            cursor,
            """
            INSERT INTO [dbo].[Ridetype] (Name, Description, CreatedAt)
            OUTPUT INSERTED.RideTypeId
            VALUES (?, ?, GETUTCDATE())
            """,
            (name, desc),
        )
        ride_type_ids[name] = rt_id
        commit_batch(cursor, i, "Ridetype")
    print(f"✔ Seeded {len(ride_type_ids)} ride types")
    return ride_type_ids


def seed_vehicle_types(cursor):
    print("Seeding VehicleType...")
    vehicle_types = [
        ("Sedan", 4, 300, 500),
        ("Hatchback", 4, 250, 400),
        ("SUV", 5, 500, 700),
        ("Minivan", 7, 700, 900),
        ("Truck", 2, 2000, 3000),
        ("Electric Car", 4, 300, 500),
        ("Luxury Car", 4, 350, 550),
    ]
    vehicle_type_ids = {}
    for i, (name, seats, vol, weight) in enumerate(vehicle_types, start=1):
        vt_id = insert_with_identity(
            cursor,
            """
            INSERT INTO [dbo].[VehicleType] (Name, NumOfSeats, MinCargoVolume, MinCargoWeight)
            OUTPUT INSERTED.VehicleTypeId
            VALUES (?, ?, ?, ?)
            """,
            (name, seats, vol, weight),
        )
        vehicle_type_ids[name] = vt_id
        commit_batch(cursor, i, "VehicleType")
    print(f"✔ Seeded {len(vehicle_type_ids)} vehicle types")
    return vehicle_type_ids


def seed_allowed_profiles(cursor, service_type_ids, ride_type_ids, vehicle_type_ids):
    print("Seeding AllowedRideProfile...")
    combos = [
        ("simple_route", "vehicle_with_driver", "Sedan", "Simple passenger ride (Sedan)"),
        ("simple_route", "vehicle_with_driver", "SUV", "Simple passenger ride (SUV)"),
        ("bridged_route", "vehicle_with_driver", "SUV", "Bridged passenger ride (SUV)"),
        ("luxury_route", "vehicle_with_driver", "Luxury Car", "Luxury ride"),
        ("cargo_route", "vehicle_with_driver", "Truck", "Cargo delivery by driver"),
        ("simple_route", "vehicle_no_driver", "Sedan", "Self-drive simple ride"),
        ("cargo_route", "vehicle_no_driver", "Truck", "Self-drive cargo"),
    ]
    profile_ids = []
    for i, (s_name, r_name, v_name, profile_name) in enumerate(combos, start=1):
        stid = service_type_ids[s_name]
        rtid = ride_type_ids[r_name]
        vtid = vehicle_type_ids[v_name]
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

def seed_vehicles(cursor, num_vehicles, vehicle_type_ids, owner_user_ids, operator_ids):
    print("Seeding Vehicles...")
    vehicle_ids = []

    brands = ["Toyota", "Honda", "Ford", "BMW", "Mercedes", "Audi", "Nissan", "Kia", "Hyundai", "Tesla"]
    models = ["Corolla", "Civic", "Focus", "Model 3", "A-Class", "X5", "Q5", "Leaf", "Sportage", "i20"]
    colors = ["White", "Black", "Silver", "Red", "Blue", "Gray", "Green"]

    vt_names = list(vehicle_type_ids.keys())

    for i in range(num_vehicles):
        vid = uuid.uuid4()
        vt_name = random.choice(vt_names)
        vt_id = vehicle_type_ids[vt_name]
        owner = random.choice(owner_user_ids)

        plate_number = f"{random.choice(['CY', 'UK', 'DE', 'FR'])}-{random.randint(1000, 9999)}-{random.choice(['AA','BB','CC','DD'])}"
        brand = random.choice(brands)
        model = random.choice(models)
        color = random.choice(colors)

        seats = random.randint(2, 7)
        cargo_volume = round(random.uniform(200, 1000), 2)
        cargo_weight = round(random.uniform(300, 3000), 2)
        status = random.choice(["Pending", "Active", "Inactive", "Rejected"])

        reviewed_by = random.choice(operator_ids) if operator_ids and status != "Pending" else None
        reviewed_at = datetime.utcnow() if reviewed_by else None
        review_comment = None if not reviewed_by else "Auto-reviewed by seeder"

        cursor.execute(
            """
            INSERT INTO [dbo].[Vehicle] (
                VehicleId, VehicleTypeId, OwnerUserId, PlateNumber, Brand, Model, Color,
                Verified, Seats, CargoVolume, CargoWeight, Status,
                CreatedAt, ReviewedByOperatorId, ReviewComment, ReviewedAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETUTCDATE(), ?, ?, ?)
            """,
            vid,
            vt_id,
            owner,
            plate_number,
            brand,
            model,
            color,
            1 if status == "Active" else 0,
            seats,
            cargo_volume,
            cargo_weight,
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
    "ID_OR_PASSPORT",
    "RESIDENCE_PERMIT",
    "DRIVING_LICENSE",
    "CRIMINAL_RECORD",
    "MEDICAL_CERT",
    "PSYCHOLOGICAL_CERT",
]


def seed_person_documents(cursor, all_user_ids, operator_ids):
    print("Seeding PersonDocument...")
    count = 0
    for uid in all_user_ids:
        for doc_type in random.sample(PERSON_DOC_TYPES, k=2):
            issue_date = datetime.utcnow() - timedelta(days=random.randint(30, 365 * 5))
            status = random.choice(["Pending", "Accepted", "Rejected"])
            reviewed_by = random.choice(operator_ids) if status in ["Accepted", "Rejected"] else None
            reviewed_at = datetime.utcnow() if reviewed_by else None
            review_comments = None if not reviewed_by else "Checked by operator"

            cursor.execute(
                """
                INSERT INTO [dbo].[PersonDocument] (
                    UserId, DocType, DocNo, IssueDate, UploadedAt, ExpiryDate,
                    Status, ReviewedByOperatorId, ReviewedAt, ReviewComments, FileUrl
                )
                VALUES (?, ?, ?, ?, GETUTCDATE(), NULL, ?, ?, ?, ?, ?)
                """,
                uid,
                doc_type,
                f"{doc_type}_{uuid.uuid4().hex[:8]}",
                issue_date,
                status,
                reviewed_by,
                reviewed_at,
                review_comments,
                f"https://example.com/docs/{doc_type.lower()}_{uid}.pdf",
            )
            count += 1
            commit_batch(cursor, count, "PersonDocument")
    print("✔ Seeded PersonDocument rows")


VEHICLE_DOC_TYPES = [
    "VEHICLE_REGISTRATION",
    "MOT_CERTIFICATE",
    "VEHICLE_CLASSIFICATION_CERTIFICATE",
    "VEHICLE_IMAGE",
]


def seed_vehicle_documents(cursor, vehicle_ids, operator_ids):
    print("Seeding VehicleDocument...")
    count = 0
    for vid in vehicle_ids:
        for doc_type in random.sample(VEHICLE_DOC_TYPES, k=2):
            issue_date = datetime.utcnow() - timedelta(days=random.randint(30, 365 * 3))
            status = random.choice(["Pending", "Accepted", "Rejected"])
            reviewed_by = random.choice(operator_ids) if status in ["Accepted", "Rejected"] else None
            reviewed_at = datetime.utcnow() if reviewed_by else None
            review_comments = None if not reviewed_by else "Vehicle doc checked"

            cursor.execute(
                """
                INSERT INTO [dbo].[VehicleDocument] (
                    VehicleId, DocType, DocNo, UploadedAt, IssueDate, ExpiryDate,
                    FileUrl, Accepted, Status, ReviewedByOperatorId, ReviewedAt, ReviewComments
                )
                VALUES (?, ?, ?, GETUTCDATE(), ?, NULL, ?, ?, ?, ?, ?, ?)
                """,
                vid,
                doc_type,
                f"{doc_type}_{uuid.uuid4().hex[:8]}",
                issue_date,
                f"https://example.com/vehdocs/{doc_type.lower()}_{vid}.pdf",
                1 if status == "Accepted" else 0,
                status,
                reviewed_by,
                reviewed_at,
                review_comments,
            )
            count += 1
            commit_batch(cursor, count, "VehicleDocument")
    print("✔ Seeded VehicleDocument rows")


def seed_vehicle_tests(cursor, vehicle_ids, inspector_ids):
    print("Seeding VehicleTest...")
    for i, vid in enumerate(vehicle_ids, start=1):
        inspector = random.choice(inspector_ids)
        check_date = datetime.utcnow() - timedelta(days=random.randint(0, 365))
        comments = random.choice(["All good", "Minor issues", "Needs re-check", "No comments"])
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
    print("✔ Seeded VehicleTest rows")


# ==============================
# USER SERVICE ENROLLMENTS & AVAILABILITY
# ==============================

def seed_user_service_enrollments(cursor, drivers, vehicles, service_type_ids, ride_type_ids, operator_ids):
    print("Seeding UserServiceEnrollment...")
    service_ids_list = list(service_type_ids.values())
    ride_ids_list = list(ride_type_ids.values())

    enrollments_by_driver = {}
    all_enroll_ids = []

    for i, driver in enumerate(drivers, start=1):
        driver_vehicles = fetch_all(
            cursor,
            "SELECT VehicleId FROM [dbo].[Vehicle] WHERE OwnerUserId = ?",
            (driver,),
        )
        if driver_vehicles:
            vehicle_id = random.choice(driver_vehicles)[0]
        else:
            vehicle_id = random.choice(vehicles)

        service_type = random.choice(service_ids_list)
        ride_type = random.choice(ride_ids_list)

        status = random.choice(["Pending", "Approved", "Rejected"])
        reviewed_at = None
        checked_by = None
        review_comment = None

        if status in ["Approved", "Rejected"] and operator_ids:
            reviewed_at = datetime.utcnow()
            checked_by = random.choice(operator_ids)
            review_comment = "Enrollment checked by operator"

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
                driver,
                vehicle_id,
                service_type,
                ride_type,
                status,
                checked_by,
                reviewed_at,
                review_comment,
            ),
        )

        enrollments_by_driver.setdefault(driver, []).append(enroll_id)
        all_enroll_ids.append(enroll_id)
        commit_batch(cursor, i, "UserServiceEnrollment")

    print(f"✔ Seeded {len(all_enroll_ids)} enrollments")
    return enrollments_by_driver, all_enroll_ids


def seed_driver_availability(cursor, enroll_ids):
    print("Seeding DriverAvailability...")
    if not enroll_ids:
        print("⚠️  No enrollments → skipping DriverAvailability")
        return

    zones = fetch_all(cursor, "SELECT ZoneId FROM [dbo].[GeofenceZone]")
    if not zones:
        print("⚠️  No zones → skipping DriverAvailability")
        return
    zone_ids = [z[0] for z in zones]

    base_date = date.today()
    count = 0
    for enroll_id in enroll_ids:
        for _ in range(random.randint(1, 3)):
            day_offset = random.randint(0, 14)
            availability_date = base_date + timedelta(days=day_offset)
            zone_id = random.choice(zone_ids)
            start_hour = random.choice([6, 8, 10, 12, 14, 16])
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
                0,
            )
            count += 1
            commit_batch(cursor, count, "DriverAvailability")
    print("✔ Seeded DriverAvailability")


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


def seed_ride_requests(cursor, num_requests, passenger_ids, allowed_profiles, zone_points_by_zone):
    print("Seeding RideRequest + RideRequestLog...")
    request_ids = []
    request_info = []

    if not zone_points_by_zone:
        print("⚠️  No zone points available, skipping ride requests")
        return [], []

    zone_ids = list(zone_points_by_zone.keys())
    count = 0

    for _ in range(num_requests):
        passenger = random.choice(passenger_ids)
        ride_profile_id, stid, rtid, vtid = random.choice(allowed_profiles)

        zone_id = random.choice(zone_ids)
        points = zone_points_by_zone[zone_id]
        if len(points) < 2:
            continue
        pickup_point, dropoff_point = random.sample(points, 2)

        num_people = random.randint(1, 4)
        pickup_at = random_future_datetime(10)

        cursor.execute(
            """
            INSERT INTO [dbo].[RideRequest] (
                PassengerId, NumOfPeople, PickupAt, PickUpPoint, DropOffPoint,
                CreatedAt, Status, RideProfileId
            )
            VALUES (?, ?, ?, ?, ?, GETUTCDATE(), 'Pending', ?)
            """,
            (
                passenger,
                num_people,
                pickup_at,
                pickup_point,
                dropoff_point,
                ride_profile_id,
            ),
        )

        cursor.execute("SELECT CAST(SCOPE_IDENTITY() AS int)")
        req_id = cursor.fetchone()[0]

        request_ids.append(req_id)
        request_info.append((req_id, pickup_point, dropoff_point, zone_id))

        cursor.execute(
            """
            INSERT INTO [dbo].[RideRequestLog] (
                RequestId, Operation, PassengerId, NumOfPeople, PickupAt,
                PickUpPoint, DropOffPoint, CreatedAt, UpdatedAt, Status, RideProfileId
            )
            VALUES (?, 'I', ?, ?, ?, ?, ?, GETUTCDATE(), NULL, 'Pending', ?)
            """,
            req_id,
            passenger,
            num_people,
            pickup_at,
            pickup_point,
            dropoff_point,
            ride_profile_id,
        )
        count += 1
        commit_batch(cursor, count, "RideRequest")
    print(f"✔ Seeded {len(request_ids)} ride requests")
    return request_ids, request_info


def seed_itinerary_legs(cursor, request_info):
    print("Seeding ItineraryLeg + RideRequestProgress...")
    leg_ids = []
    count = 0
    for req_id, pickup_point, dropoff_point, zone_id in request_info:
        approx_start = datetime.utcnow() + timedelta(minutes=random.randint(10, 120))
        approx_end = approx_start + timedelta(minutes=random.randint(10, 40))

        leg_id = insert_with_identity(
            cursor,
            """
            INSERT INTO [dbo].[ItineraryLeg] (
                RideRequestId, SeqNo, ZoneId, FromPointId, ToPointId,
                ApproxStartTime, ApproxEndTime
            )
            OUTPUT INSERTED.LegId
            VALUES (?, 1, ?, ?, ?, ?, ?)
            """,
            (
                req_id,
                zone_id,
                pickup_point,
                dropoff_point,
                approx_start,
                approx_end,
            ),
        )
        leg_ids.append(leg_id)

        cursor.execute(
            """
            INSERT INTO [dbo].[RideRequestProgress] (
                RequestId, TotalLegs, AcceptedLegs, Status, UpdatedAt
            )
            VALUES (?, ?, 0, 'AwaitingDrivers', GETUTCDATE())
            """,
            req_id,
            1,
        )
        count += 1
        commit_batch(cursor, count, "ItineraryLeg/RideRequestProgress")

    print(f"✔ Seeded {len(leg_ids)} itinerary legs & progress rows")
    return leg_ids


def seed_dispatch_offers(cursor, leg_ids, driver_ids, enrollments_by_driver, all_enroll_ids):
    print("Seeding DispatchOffer...")
    offer_ids = []
    if not all_enroll_ids:
        print("⚠️  No enrollments → skipping DispatchOffer")
        return []

    for i, leg_id in enumerate(leg_ids, start=1):
        recipient = random.choice(driver_ids)
        driver_enrolls = enrollments_by_driver.get(recipient)
        enroll_id = random.choice(driver_enrolls) if driver_enrolls else random.choice(all_enroll_ids)
        status = random.choice(["Sent", "Accepted", "Declined", "Expired"])

        offer_id = insert_with_identity(
            cursor,
            """
            INSERT INTO [dbo].[DispatchOffer] (
                LegId, RecipientUserId, EnrollId, Status, SentAt, RespondedAt
            )
            OUTPUT INSERTED.OfferId
            VALUES (?, ?, ?, ?, GETUTCDATE(), NULL)
            """,
            (
                leg_id,
                recipient,
                enroll_id,
                status,
            ),
        )
        offer_ids.append(offer_id)
        commit_batch(cursor, i, "DispatchOffer")

    print(f"✔ Seeded {len(offer_ids)} dispatch offers")
    return offer_ids


# ==============================
# PAYMENTS, RIDES, RATINGS, MESSAGES
# ==============================

def seed_payments(cursor, passenger_ids, driver_ids):
    print("Seeding Payments...")
    payment_ids = []
    for i in range(len(passenger_ids)):
        sender = random.choice(passenger_ids)
        receiver = random.choice(driver_ids)
        gross = round(random.uniform(5, 60), 2)
        osrh_fee = round(gross * 0.15, 2)
        driver_payout = gross - osrh_fee
        method = random.choice(["CreditCard", "Cash"])
        status = random.choice(["Pending", "Completed", "Failed", "Refunded"])
        paid_at = datetime.utcnow() if status in ["Completed", "Refunded"] else None

        pid = uuid.uuid4()
        cursor.execute(
            """
            INSERT INTO [dbo].[Payment] (
                PaymentId, SenderUserId, ReceiverUserId, GrossAmount,
                OsrhFee, DriverPayout, PaidAt, Method, Status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            pid,
            sender,
            receiver,
            gross,
            osrh_fee,
            driver_payout,
            paid_at,
            method,
            status,
        )
        payment_ids.append(pid)
        commit_batch(cursor, i + 1, "Payment")
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


def seed_ratings(cursor, ride_ids, passenger_ids, driver_ids):
    print("Seeding Ratings...")
    rating_ids = []
    for i, ride_id in enumerate(ride_ids, start=1):
        author = random.choice(passenger_ids)
        target = random.choice(driver_ids)
        stars = random.randint(1, 5)
        comment = random.choice(
            ["Great ride", "Average", "Driver was late", "Very comfortable", "Would not recommend"]
        )

        cursor.execute(
            """
            INSERT INTO [dbo].[Rating] (
                RideId, AuthorUserId, TargetUserId, Stars, Comment, CreatedAt
            )
            VALUES (?, ?, ?, ?, ?, GETUTCDATE())
            """,
            ride_id,
            author,
            target,
            stars,
            comment,
        )
        rating_ids.append((ride_id, author, target))
        commit_batch(cursor, i, "Rating")
    print(f"✔ Seeded {len(rating_ids)} ratings")
    return rating_ids


def seed_inapp_messages(cursor, ride_ids, passenger_ids, driver_ids):
    print("Seeding InAppMessage...")
    msg_ids = []
    count = 0
    for ride_id in ride_ids:
        driver = random.choice(driver_ids)
        passenger = random.choice(passenger_ids)
        for body in ["Hello, I arrived", "I will be 5 minutes late"]:
            cursor.execute(
                """
                INSERT INTO [dbo].[InAppMessage] (
                    SenderUserId, RecipientUserId, Body, SentAt, Ride
                )
                VALUES (?, ?, ?, GETUTCDATE(), ?)
                """,
                driver,
                passenger,
                body,
                ride_id,
            )
            msg_ids.append(ride_id)
            count += 1
            commit_batch(cursor, count, "InAppMessage")
    print(f"✔ Seeded messages for {len(ride_ids)} rides")
    return msg_ids


# ==============================
# GDPR & VEHICLE LOCATION
# ==============================

def seed_gdpr_requests(cursor, all_user_ids):
    print("Seeding GdprRequest...")
    types = ["DataAccess", "DataDeletion", "DataExport", "DataCorrection"]
    statuses = ["Pending", "Under-Review", "Pre-Approved", "Approved", "Denied"]
    gdpr_ids = []
    for i in range(max(5, len(all_user_ids) // 5)):
        user = random.choice(all_user_ids)
        req_type = random.choice(types)
        status = random.choice(statuses)
        requested_at = datetime.utcnow() - timedelta(days=random.randint(0, 30))
        decided_at = requested_at + timedelta(days=random.randint(1, 10)) if status != "Pending" else None

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
    for i, gid in enumerate(gdpr_ids, start=1):
        actor = random.choice(operator_ids) if operator_ids else None
        cursor.execute(
            """
            INSERT INTO [dbo].[GdprLog] (
                GdprId, ActorAdminId, LoggedAt, Note
            )
            VALUES (?, ?, GETUTCDATE(), ?)
            """,
            gid,
            actor,
            "Seeder auto-log entry",
        )
        commit_batch(cursor, i, "GdprLog")
    print("✔ Seeded GDPR logs")


def seed_vehicle_location_live(cursor, vehicle_ids):
    print("Seeding VehicleLocationLive...")
    for i, vid in enumerate(vehicle_ids, start=1):
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
        commit_batch(cursor, i, "VehicleLocationLive")
    print(f"✔ Seeded VehicleLocationLive for {len(vehicle_ids)} vehicles")


# ==============================
# MAIN (ONE TRANSACTION, BUT BATCH COMMITS)
# ==============================

def main():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 1) Zones / Points / Bridges
        seed_geofence_data(cursor)

        # 2) Admins & Operators
        admin_ids = seed_admins(cursor, num_admins=NUM_ADMINS)
        operator_ids = seed_operators(cursor, num_operators=NUM_OPERATORS, admin_ids=admin_ids)

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
        inspector_ids = seed_inspectors(cursor, num_inspectors=NUM_INSPECTORS)
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
            vehicle_type_ids=vehicle_type_ids,
            owner_user_ids=driver_ids + company_ids,
            operator_ids=operator_ids,
        )
        seed_person_documents(cursor, all_user_ids, operator_ids)
        seed_vehicle_documents(cursor, vehicle_ids, operator_ids)
        seed_vehicle_tests(cursor, vehicle_ids, inspector_ids)

        # 6) Enrollments & driver availability
        enrollments_by_driver, all_enroll_ids = seed_user_service_enrollments(
            cursor, driver_ids, vehicle_ids, service_type_ids, ride_type_ids, operator_ids
        )
        seed_driver_availability(cursor, all_enroll_ids)

        # 7) Ride requests / logs / progress / itinerary + offers
        zone_points_by_zone = get_zone_points(cursor)
        ride_request_ids, request_info = seed_ride_requests(
            cursor,
            num_requests=NUM_RIDE_REQUESTS,
            passenger_ids=passenger_ids,
            allowed_profiles=allowed_profiles,
            zone_points_by_zone=zone_points_by_zone,
        )
        leg_ids = seed_itinerary_legs(cursor, request_info)
        offer_ids = seed_dispatch_offers(
            cursor, leg_ids, driver_ids, enrollments_by_driver, all_enroll_ids
        )

        # 8) Payments / rides / ratings / messages
        payment_ids = seed_payments(cursor, passenger_ids, driver_ids)
        ride_ids = seed_rides(cursor, offer_ids, driver_ids, passenger_ids, vehicle_ids, payment_ids)
        seed_ratings(cursor, ride_ids, passenger_ids, driver_ids)
        seed_inapp_messages(cursor, ride_ids, passenger_ids, driver_ids)

        # 9) GDPR & vehicle location
        gdpr_ids = seed_gdpr_requests(cursor, all_user_ids)
        seed_gdpr_logs(cursor, gdpr_ids, operator_ids)
        seed_vehicle_location_live(cursor, vehicle_ids)

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
