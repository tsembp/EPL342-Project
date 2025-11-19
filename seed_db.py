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
            admin_id, username, password_hash
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
        approved_by = random.choice(admin_ids)
        approved_at = datetime.utcnow()
        cursor.execute(
            """
            INSERT INTO [dbo].[Operator] (OperatorId, Email, Username, PasswordHash, ApprovedByAdmin, ApprovedAt)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            op_id, email, username, password_hash, approved_by, approved_at
        )
        operator_ids.append(op_id)
    return operator_ids


def seed_users_and_roles(cursor, num_drivers, num_passengers, num_company_reps):
    users = {"D": [], "P": [], "C": []}

    # Drivers
    for i in range(num_drivers):
        uid = uuid.uuid4()
        first, last = random_name()
        email = f"driver{i+1}@seed.local"  # ✅ guaranteed unique per driver index
        cursor.execute(
            """
            INSERT INTO [dbo].[User] (
                UserId, FirstName, LastName, Role, Dob, Gender, Email,
                Phone, Address, Username, PasswordHash
            )
            VALUES (?, ?, ?, 'D', ?, ?, ?, ?, ?, ?, ?)
            """,
            uid,
            first,
            last,
            random_dob(),
            random.choice(["M", "F"]),
            email,
            random_phone(),
            random_address(),
            f"driver{i+1}",
            "$2a$10$fakeDriverHash",
        )
        cursor.execute("INSERT INTO [dbo].[Driver] (UserId) VALUES (?)", uid)
        users["D"].append(uid)

    # Passengers
    for i in range(num_passengers):
        uid = uuid.uuid4()
        first, last = random_name()
        email = f"passenger{i+1}@seed.local"  # ✅ unique per passenger
        cursor.execute(
            """
            INSERT INTO [dbo].[User] (
                UserId, FirstName, LastName, Role, Dob, Gender, Email,
                Phone, Address, Username, PasswordHash
            )
            VALUES (?, ?, ?, 'P', ?, ?, ?, ?, ?, ?, ?)
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
        email = f"company{i+1}@seed.local"  # ✅ unique per company rep
        cursor.execute(
            """
            INSERT INTO [dbo].[User] (
                UserId, FirstName, LastName, Role, Dob, Gender, Email,
                Phone, Address, Username, PasswordHash
            )
            VALUES (?, ?, ?, 'C', ?, ?, ?, ?, ?, ?, ?)
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
            company
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
            "Europe/Nicosia"
        )


def seed_service_ride_vehicle_types_from_combos(cursor):
    """
    Use combo_specs to seed:
      - Servicetype (Name = route type)
      - Ridetype (Name = ride mode)
      - VehicleType (Name = car/vehicle type)
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

    # VehicleType (IDENTITY)
    for name in vehicle_names:
        vid = insert_and_return_identity(
            cursor,
            """
            INSERT INTO [dbo].[VehicleType] (Name)
            OUTPUT INSERTED.VehicleTypeId
            VALUES (?)
            """,
            (name,),
        )
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
    
    # ✅ Calculate exact number of cells that fit
    num_rows = int((MAX_LAT - MIN_LAT) / CELL_SIZE)
    num_cols = int((MAX_LNG - MIN_LNG) / CELL_SIZE)
    
    zone_ids = []
    grid = []
    
    for r in range(num_rows):
        row_ids = []
        for c in range(num_cols):
            minlat = MIN_LAT + r * CELL_SIZE
            maxlat = minlat + CELL_SIZE  # ✅ Always CELL_SIZE apart
            minlng = MIN_LNG + c * CELL_SIZE
            maxlng = minlng + CELL_SIZE  # ✅ Always CELL_SIZE apart
            
            zone_id = insert_and_return_identity(
                cursor,
                """
                INSERT INTO [dbo].[Geofencezone] (MinLat, MinLng, MaxLat, MaxLng, Name, CreatedAt)
                OUTPUT INSERTED.ZoneId
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (minlat, minlng, maxlat, maxlng, f"Zone {len(zone_ids)+1}", datetime.utcnow())
            )
            zone_ids.append(zone_id)
            row_ids.append(zone_id)
        grid.append(row_ids)
    
    return zone_ids, grid

def seed_bridges(cursor, grid):
    """
    Create bridges connecting adjacent zones (right and down neighbors).
    Returns list of bridge_ids and a dict mapping (from_zone, to_zone) -> bridge_id
    """
    bridge_ids = []
    bridge_map = {}
    num_rows = len(grid)
    num_cols = len(grid[0])
    
    for r in range(num_rows):
        for c in range(num_cols):
            current = grid[r][c]
            
            # Bridge to right neighbor
            if c < num_cols - 1:
                right = grid[r][c+1]
                bridge_id = insert_and_return_identity(
                    cursor,
                    """
                    INSERT INTO [dbo].[Bridge] (Name, FromZone, ToZone)
                    OUTPUT INSERTED.BridgeId
                    VALUES (?, ?, ?)
                    """,
                    (f"Bridge {len(bridge_ids)+1}", current, right)
                )
                bridge_ids.append(bridge_id)
                bridge_map[(current, right)] = bridge_id
            
            # Bridge to down neighbor
            if r < num_rows - 1:
                down = grid[r+1][c]
                bridge_id = insert_and_return_identity(
                    cursor,
                    """
                    INSERT INTO [dbo].[Bridge] (Name, FromZone, ToZone)
                    OUTPUT INSERTED.BridgeId
                    VALUES (?, ?, ?)
                    """,
                    (f"Bridge {len(bridge_ids)+1}", current, down)
                )
                bridge_ids.append(bridge_id)
                bridge_map[(current, down)] = bridge_id
    
    return bridge_ids, bridge_map

def get_random_point_in_zone(cursor, zone_id):
    """Get random lat/lng within a zone's bounds."""
    cursor.execute(
        "SELECT MinLat, MinLng, MaxLat, MaxLng FROM [dbo].[Geofencezone] WHERE ZoneId = ?",
        zone_id
    )
    row = cursor.fetchone()
    if not row:
        return (34.7, 33.0)  # fallback
    min_lat, min_lng, max_lat, max_lng = row
    lat = random.uniform(float(min_lat), float(max_lat))
    lng = random.uniform(float(min_lng), float(max_lng))
    return (round(lat, 6), round(lng, 6))


def seed_vehicles(cursor, num_vehicles, vehicle_type_ids, owner_user_ids):
    vehicle_ids = []
    vehicle_type_name_list = list(vehicle_type_ids.keys())
    for i in range(num_vehicles):
        vid = uuid.uuid4()
        vtype_name = random.choice(vehicle_type_name_list)
        vtype_id = vehicle_type_ids[vtype_name]
        owner = random.choice(owner_user_ids)
        seats = random.randint(2, 7)
        cargo_volume = round(random.uniform(0.0, 5.0), 2)
        cargo_weight = round(random.uniform(0.0, 500.0), 2)
        cursor.execute(
            """
            INSERT INTO [dbo].[Vehicle] (
                VehicleId, VehicleTypeId, OwnerUserId, Seats, CargoVolume, CargoWeight, Status
            )
            VALUES (?, ?, ?, ?, ?, ?, 'Active')
            """,
            vid, vtype_id, owner, seats, cargo_volume, cargo_weight
        )
        vehicle_ids.append(vid)
    return vehicle_ids


def seed_allowed_ride_profiles(cursor, service_type_ids, ride_type_ids, vehicle_type_ids):
    """
    Use combo_specs exactly as given to seed AllowedRideProfile.
    """
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
            ride_profile_id, sid, rid, vid, profile_name
        )
        profile_ids.append(ride_profile_id)

    return profile_ids

def find_path_between_zones(start_zone, end_zone, grid, bridge_map):
    """
    Find a random valid path from start_zone to end_zone through the grid.
    Returns: list of (zone_id, bridge_id) tuples representing the path.
    Each tuple represents: "from current zone, cross bridge_id to reach next zone"
    """
    # Build zone position lookup: zone_id -> (row, col)
    zone_positions = {}
    for r in range(len(grid)):
        for c in range(len(grid[r])):
            zone_positions[grid[r][c]] = (r, c)
    
    if start_zone not in zone_positions or end_zone not in zone_positions:
        return []
    
    start_pos = zone_positions[start_zone]
    end_pos = zone_positions[end_zone]
    
    # Calculate Manhattan distance
    manhattan_dist = abs(end_pos[0] - start_pos[0]) + abs(end_pos[1] - start_pos[1])
    
    if manhattan_dist == 0:
        return []  # Same zone, no path needed
    
    # Build path by randomly choosing right/down (or left/up) at each step
    path = []
    current_zone = start_zone
    current_pos = start_pos
    
    while current_pos != end_pos:
        current_row, current_col = current_pos
        target_row, target_col = end_pos
        
        # Determine possible moves
        possible_moves = []
        
        # Move right (if we need to go right and can)
        if target_col > current_col and current_col < len(grid[0]) - 1:
            next_zone = grid[current_row][current_col + 1]
            bridge_id = bridge_map.get((current_zone, next_zone))
            if bridge_id:
                possible_moves.append(('right', next_zone, bridge_id, (current_row, current_col + 1)))
        
        # Move left (if we need to go left and can)
        if target_col < current_col and current_col > 0:
            next_zone = grid[current_row][current_col - 1]
            # Look for reverse bridge
            bridge_id = bridge_map.get((next_zone, current_zone))
            if bridge_id:
                possible_moves.append(('left', next_zone, bridge_id, (current_row, current_col - 1)))
        
        # Move down (if we need to go down and can)
        if target_row > current_row and current_row < len(grid) - 1:
            next_zone = grid[current_row + 1][current_col]
            bridge_id = bridge_map.get((current_zone, next_zone))
            if bridge_id:
                possible_moves.append(('down', next_zone, bridge_id, (current_row + 1, current_col)))
        
        # Move up (if we need to go up and can)
        if target_row < current_row and current_row > 0:
            next_zone = grid[current_row - 1][current_col]
            # Look for reverse bridge
            bridge_id = bridge_map.get((next_zone, current_zone))
            if bridge_id:
                possible_moves.append(('up', next_zone, bridge_id, (current_row - 1, current_col)))
        
        if not possible_moves:
            # Stuck, shouldn't happen with proper grid
            print(f"⚠️  No valid moves from zone {current_zone} at {current_pos} to {end_zone} at {end_pos}")
            break
        
        # Pick a random valid move
        direction, next_zone, bridge_id, next_pos = random.choice(possible_moves)
        path.append((current_zone, next_zone, bridge_id))
        current_zone = next_zone
        current_pos = next_pos
    
    return path

# Now replace seed_itinerary_legs() with this updated version:

def seed_itinerary_legs(cursor, ride_requests_info, bridge_map, grid):
    """
    Create itinerary legs for each ride request.
    For bridged routes, create multiple legs crossing bridges based on actual path.
    Returns list of all leg_ids
    """
    leg_ids = []
    
    for (req_id, start_zone, end_zone, is_bridged) in ride_requests_info:
        if not is_bridged or start_zone == end_zone:
            # Single leg, no bridge
            leg_id = insert_and_return_identity(
                cursor,
                """
                INSERT INTO [dbo].[ItineraryLeg] (SeqNo, RideRequestId)
                OUTPUT INSERTED.LegId
                VALUES (1, ?)
                """,
                (req_id,)
            )
            leg_ids.append(leg_id)
        else:
            # Multi-leg bridged route - find actual path
            path = find_path_between_zones(start_zone, end_zone, grid, bridge_map)
            
            if not path:
                # Fallback: create single leg if no path found
                print(f"⚠️  No path found from zone {start_zone} to {end_zone}, creating single leg")
                leg_id = insert_and_return_identity(
                    cursor,
                    """
                    INSERT INTO [dbo].[ItineraryLeg] (SeqNo, RideRequestId)
                    OUTPUT INSERTED.LegId
                    VALUES (1, ?)
                    """,
                    (req_id,)
                )
                leg_ids.append(leg_id)
                continue
            
            # Create one leg per bridge crossing
            for seq, (from_zone, to_zone, bridge_id) in enumerate(path, start=1):
                leg_id = insert_and_return_identity(
                    cursor,
                    """
                    INSERT INTO [dbo].[ItineraryLeg] (SeqNo, ViaBridgeId, RideRequestId)
                    OUTPUT INSERTED.LegId
                    VALUES (?, ?, ?)
                    """,
                    (seq, bridge_id, req_id)
                )
                leg_ids.append(leg_id)
                
                # ✅ Insert into LegCrossesBridge junction table
                cursor.execute(
                    "INSERT INTO [dbo].[LegCrossesBridge] (ItineraryLeg, Bridge) VALUES (?, ?)",
                    (leg_id, bridge_id)
                )
    
    return leg_ids


def seed_dispatch_offers(cursor, leg_ids, driver_ids):
    """
    For each itinerary leg, create a DispatchOffer to some driver.
    Returns list of OfferIds.
    """
    offer_ids = []
    for leg_id in leg_ids:
        recipient = random.choice(driver_ids)  # send offers to drivers
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


def seed_ride_requests(cursor, num_requests, passenger_ids, ride_profile_ids, zone_ids, bridge_map):
    """
    Create ride requests. Some will be bridged routes (multi-leg crossing zones).
    Returns list of (request_id, start_zone, end_zone, is_bridged) tuples
    """
    request_info = []
    
    for _ in range(num_requests):
        passenger_id = random.choice(passenger_ids)
        profile_id = random.choice(ride_profile_ids)
        
        # Determine if bridged route by checking the service type
        cursor.execute(
            """
            SELECT st.Name 
            FROM [dbo].[AllowedRideProfile] arp
            JOIN [dbo].[Servicetype] st ON arp.ServiceTypeId = st.ServiceTypeId
            WHERE arp.RideProfileId = ?
            """,
            profile_id
        )
        service_row = cursor.fetchone()
        is_bridged = (service_row and service_row[0] == 'bridged_route')
        
        # Pick start and end zones
        start_zone = random.choice(zone_ids)
        if is_bridged:
            end_zone = random.choice([z for z in zone_ids if z != start_zone])
        else:
            end_zone = start_zone
        
        pickup_lat, pickup_lng = get_random_point_in_zone(cursor, start_zone)
        drop_lat, drop_lng = get_random_point_in_zone(cursor, end_zone)
        
        num_people = random.randint(1, 4)
        pickup_at = datetime.utcnow() + timedelta(hours=random.randint(1, 72))
        status = random.choice(['Pending', 'Accepted', 'Completed'])
        
        req_id = insert_and_return_identity(
            cursor,
            """
            INSERT INTO [dbo].[RideRequest] (
                PassengerId, NumOfPeople, PickupAt,
                PickupCountry, PickupCity, PickupLat, PickupLng,
                DropCountry, DropCity, DropLat, DropLng,
                Status, RideProfileId
            )
            OUTPUT INSERTED.RequestId
            VALUES (?, ?, ?, 'Cyprus', 'Nicosia', ?, ?, 'Cyprus', 'Nicosia', ?, ?, ?, ?)
            """,
            (passenger_id, num_people, pickup_at, pickup_lat, pickup_lng, drop_lat, drop_lng, status, profile_id)
        )
        request_info.append((req_id, start_zone, end_zone, is_bridged))
    
    return request_info


def seed_rides(cursor, num_rides, driver_ids, passenger_ids, vehicle_ids, offer_ids):
    """
    Create rides from completed ride requests.
    Returns list of (ride_id, status, price_final) tuples
    """
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
        
        ride_id = insert_and_return_identity(
            cursor,
            """
            INSERT INTO [dbo].[Ride] (
                OfferId, DriverUserId, PassengerUserId, VehicleId,
                StartedAt, EndedAt, PriceFinal, Status
            )
            OUTPUT INSERTED.RideId
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (offer_id, driver_id, passenger_id, vehicle_id, started_at, ended_at, price_final, status)
        )
        rides_info.append((ride_id, status, price_final))
    
    return rides_info

def seed_driver_availability(cursor, drivers, vehicles, service_type_ids, ride_type_ids, zone_ids):
    """
    Create driver availability schedules.
    Each enrollment gets availability for specific dates/times in specific zones.
    """
    # Get all approved enrollments
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
                    (enroll_id, availability_date, zone_id, starts_at, ends_at, is_recurring, datetime.utcnow())
                )
            except:
                # Skip duplicates
                continue

def seed_payments(cursor, rides_info):
    """
    Create payments ONLY for completed rides.
    Links back via Ride.Payment FK.
    """
    payment_ids = []
    
    for (ride_id, status, amount) in rides_info:
        if status != 'Completed':
            continue
        
        # Get the driver and passenger for this ride
        cursor.execute(
            "SELECT DriverUserId, PassengerUserId FROM [dbo].[Ride] WHERE RideId = ?",
            ride_id
        )
        ride_row = cursor.fetchone()
        if not ride_row:
            continue
        
        driver_id, passenger_id = ride_row
        
        # Calculate payment breakdown
        gross_amount = amount
        osrh_fee = round(gross_amount * 0.15, 2)  # 15% platform fee
        driver_payout = round(gross_amount - osrh_fee, 2)
        
        payment_id = uuid.uuid4()
        method = random.choice(['CreditCard', 'Cash'])
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
            (payment_id, passenger_id, driver_id, gross_amount, osrh_fee, driver_payout, method, paid_at)
        )
        
        # Link ride to payment
        cursor.execute(
            "UPDATE [dbo].[Ride] SET Payment = ? WHERE RideId = ?",
            (payment_id, ride_id)
        )
        
        payment_ids.append(payment_id)
    
    return payment_ids

def seed_ratings(cursor, num_ratings, author_user_ids, target_user_ids):
    rating_ids = []
    for _ in range(num_ratings):
        author = random.choice(author_user_ids)
        target = random.choice(target_user_ids)
        stars = random.randint(1, 5)
        comment = f"Auto-generated rating {stars} stars"
        rid = insert_and_return_identity(
            cursor,
            """
            INSERT INTO [dbo].[Rating] (AuthorUserId, TargetUserId, Stars, Comment)
            OUTPUT INSERTED.RatingId
            VALUES (?, ?, ?, ?)
            """,
            (author, target, stars, comment),
        )
        rating_ids.append(rid)
    return rating_ids


def seed_person_documents(cursor, user_ids, docs_per_user):
    doc_types = ["ID Card", "Driver License", "Passport"]
    for uid in user_ids:
        for _ in range(docs_per_user):
            doc_type = random.choice(doc_types)
            issue, expiry = random_future_date(365, 365 * 10)
            file_url = f"https://files.local/userdocs/{uid}/{doc_type.replace(' ', '_').lower()}.pdf"
            insert_and_return_identity(
                cursor,
                """
                INSERT INTO [dbo].[PersonDocument] (
                    UserId, DocType, IssueDate, ExpiryDate, FileUrl
                )
                OUTPUT INSERTED.DocId
                VALUES (?, ?, ?, ?, ?)
                """,
                (uid, doc_type, issue, expiry, file_url),
            )


def seed_vehicle_documents(cursor, vehicle_ids, docs_per_vehicle):
    doc_types = ["Registration", "Insurance", "TechnicalIns"]
    for vid in vehicle_ids:
        for _ in range(docs_per_vehicle):
            doc_type = random.choice(doc_types)
            issue, expiry = random_future_date(365, 365 * 5)
            file_url = f"https://files.local/vehicledocs/{vid}/{doc_type.replace(' ', '_').lower()}.pdf"
            image = f"https://files.local/vehicleimages/{vid}/{doc_type.replace(' ', '_').lower()}.png"
            insert_and_return_identity(
                cursor,
                """
                INSERT INTO [dbo].[VehicleDocument] (
                    VehicleId, DocType, IssueDate, ExpiryDate, FileUrl, Image
                )
                OUTPUT INSERTED.VehDocId
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (vid, doc_type, issue, expiry, file_url, image),
            )


def seed_user_service_enrollments(cursor, drivers, vehicles, service_type_ids, ride_type_ids, operator_ids):
    """
    Assign some drivers + vehicles to some service/ride types.
    If status is 'Approved', ApprovedById must reference an existing Operator.
    """
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
            checked_by = random.choice(operator_ids)  # ✅ valid OperatorId
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
        service_type_ids, ride_type_ids, vehicle_type_ids = seed_service_ride_vehicle_types_from_combos(cursor)

        print("Seeding Zones...")
        zone_ids, grid = seed_zones(cursor, CONFIG["NUM_ZONES"])

        print("Seeding Bridges...")
        bridge_ids, bridge_map = seed_bridges(cursor, grid)

        print("Seeding Vehicles...")
        vehicle_ids = seed_vehicles(
            cursor,
            CONFIG["NUM_VEHICLES"],
            vehicle_type_ids,
            owner_user_ids=driver_ids + company_rep_ids,
        )

        print("Seeding AllowedRideProfiles from combo_specs...")
        ride_profile_ids = seed_allowed_ride_profiles(cursor, service_type_ids, ride_type_ids, vehicle_type_ids)

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
        seed_driver_availability(cursor, driver_ids, vehicle_ids, service_type_ids, ride_type_ids, zone_ids)

        print("Seeding RideRequests...")
        request_info = seed_ride_requests(
            cursor,
            CONFIG["NUM_RIDE_REQUESTS"],
            passenger_ids,
            ride_profile_ids,
            zone_ids,
            bridge_map,
        )

        print("Seeding ItineraryLegs...")
        leg_ids = seed_itinerary_legs(cursor, request_info, bridge_map, grid)  # ✅ Pass grid

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
            author_user_ids=passenger_ids,
            target_user_ids=driver_ids,
        )

        print("Seeding PersonDocuments...")
        seed_person_documents(
            cursor,
            all_user_ids,
            CONFIG["NUM_PERSON_DOCS_PER_USER"],
        )

        print("Seeding VehicleDocuments...")
        seed_vehicle_documents(
            cursor,
            vehicle_ids,
            CONFIG["NUM_VEHICLE_DOCS_PER_VEHICLE"],
        )

        conn.commit()
        print("✅ Seeding completed successfully.")

    except Exception as e:
        conn.rollback()
        print("❌ Error during seeding, rolled back transaction.")
        print(e)
    finally:
        conn.close()


if __name__ == "__main__":
    main()