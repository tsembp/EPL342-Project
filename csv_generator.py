import os
from pathlib import Path
import uuid, random
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from faker import Faker
from dotenv import load_dotenv
import csv

load_dotenv()

# ---------- CONFIG ----------
NUM_ADMINS     = 2
NUM_OPERATORS  = 5
NUM_INSPECTORS = 5

NUM_PASSENGERS = 10
NUM_DRIVERS    = 3
NUM_VEHICLES_PER_DRIVER = 2
NUM_CREDIT_CARDS_PER_ENTITY = 2

NUM_COMPANY_REPRESENTATIVES = 2

NUM_GEOFENCE_ZONES = 10
RIDES_TO_CREATE = 300  

CSV_DIR = Path("seed_data")
CSV_DIR.mkdir(exist_ok=True)
# ----------------------------

fake = Faker("en")
Faker.seed(342)

def guid(): return str(uuid.uuid4())
utcnow = datetime.now(timezone.utc)

def write_csv(filename, headers, rows):
    """Write data to CSV file, overwriting if exists"""
    filepath = CSV_DIR / f"{filename}.csv"
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"✅ Written {len(rows)} rows to {filepath}")

start_time = datetime.now(timezone.utc)

# Ride Types
ride_types = [
    ("vehicle_with_driver", "Vehicle with driver"),
    ("vehicle_no_driver",   "Vehicle without driver"),
    ("teledriving",         "Teledriving vehicle at user location"),
    ("fully_autonomous",    "Fully autonomous vehicle at user location"),
    ("small_cargo_van",     "Small cargo van"),
]
rt_ids = {}
ridetype_rows = []
for idx, (key, label) in enumerate(ride_types, start=1):
    rt_ids[key] = idx
    ridetype_rows.append([idx, label, label, utcnow, None])

write_csv('Ridetype', ['RideTypeId', 'Name', 'Description', 'CreatedAt', 'UpdatedAt'], ridetype_rows)


# Service Types
services = [
    ("simple_route",    "Passenger transport from A to Z"),
    ("luxury_route",    "Like simple but with higher specifications"),
    ("light_cargo",     "Small household volume/weight"),
    ("heavy_cargo",     "Moving/larger volume"),
    ("bridged_route",   "Multiple means due to geofencing/bridges"),
]
svc_ids = {}
servicetype_rows = []
for idx, (name, desc) in enumerate(services, start=1):
    svc_ids[name] = idx
    servicetype_rows.append([idx, name, desc, 3.50, 0.80, 0.20, utcnow, None, 1, utcnow, None])

write_csv('Servicetype', ['ServiceTypeId', 'Name', 'Description', 'BaseFare', 'PerKm', 'PerMin', 
                          'ValidFrom', 'ValidTo', 'Active', 'CreatedAt', 'UpdatedAt'], servicetype_rows)


# Vehicle Types
veh_types = [
    "Sedan", "Hatchback", "SUV", "Coupe", "Convertible", "Pickup Truck", "Minivan", "Van", 
    "Wagon", "Crossover", "Luxury Car", "Sports Car", "Electric Car", "Hybrid Car", "Truck",
]
vt_ids = {}
vehicletype_rows = []
for idx, vt in enumerate(veh_types, start=1):
    vt_ids[vt] = idx
    vehicletype_rows.append([idx, vt])

write_csv('VehicleType', ['VehicleTypeId', 'Name'], vehicletype_rows)


# AllowedRideProfile
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

allowedrideprofile_rows = []

for svc_key, rt_key, vt_name, profile_name in combo_specs:
    svc_id = svc_ids[svc_key]
    rt_id = rt_ids[rt_key]
    vt_id = vt_ids[vt_name]
    
    profile_id = guid()
    allowedrideprofile_rows.append([profile_id, svc_id, rt_id, vt_id, profile_name])
    
write_csv('AllowedRideProfile', ['RideProfileId', 'ServiceTypeId', 'RideTypeId', 'VehicleTypeId', 'ProfileName'], 
          allowedrideprofile_rows)


# Admins
admin_rows = []
admin_ids = []
for i in range(NUM_ADMINS):
    aid = guid()
    admin_rows.append([aid, f"admin{i+1}", "admin-hash", utcnow])
    admin_ids.append(aid)

write_csv('Admin', ['AdminId', 'Username', 'PasswordHash', 'CreatedAt'], admin_rows)


# Operators
operator_rows = []
operator_ids = []
for i in range(NUM_OPERATORS):
    oid = guid()
    operator_rows.append([oid, f"operator{i+1}@example.com", f"operator{i+1}", "operator-hash", 
                         random.choice(admin_ids), utcnow, utcnow])
    operator_ids.append(oid)

write_csv('Operator', ['OperatorId', 'Email', 'Username', 'PasswordHash', 'ApprovedByAdmin', 'ApprovedAt', 'CreatedAt'], 
          operator_rows)


# Inspectors
inspector_rows = []
inspector_ids = []
for i in range(NUM_INSPECTORS):
    ins = guid()
    inspector_rows.append([ins, f"inspector{i+1}@example.com", f"inspector{i+1}", "hash-inspector", utcnow])
    inspector_ids.append(ins)

write_csv('Inspector', ['InspectorId', 'Email', 'Username', 'PasswordHash', 'CreatedAt'], inspector_rows)


vehicle_specs = {
    "Sedan":        {"seats": (4,5),   "vol": (350,500),    "wt": (200,400)},
    "Hatchback":    {"seats": (4,5),   "vol": (250,400),    "wt": (150,300)},
    "SUV":          {"seats": (5,7),   "vol": (500,800),    "wt": (400,800)},
    "Coupe":        {"seats": (2,4),   "vol": (200,300),    "wt": (150,250)},
    "Convertible":  {"seats": (2,4),   "vol": (150,300),    "wt": (150,250)},
    "Pickup Truck": {"seats": (2,5),   "vol": (800,1500),   "wt": (1000,2000)},
    "Minivan":      {"seats": (6,8),   "vol": (1000,1500),  "wt": (800,1500)},
    "Van":          {"seats": (2,3),   "vol": (2000,4000),  "wt": (2000,4000)},
    "Wagon":        {"seats": (4,5),   "vol": (500,700),    "wt": (400,800)},
    "Crossover":    {"seats": (5,5),   "vol": (450,600),    "wt": (400,700)},
    "Luxury Car":   {"seats": (4,5),   "vol": (400,600),    "wt": (300,600)},
    "Sports Car":   {"seats": (2,4),   "vol": (150,300),    "wt": (150,300)},
    "Electric Car": {"seats": (4,5),   "vol": (300,500),    "wt": (300,600)},
    "Hybrid Car":   {"seats": (4,5),   "vol": (300,500),    "wt": (250,500)},
    "Truck":        {"seats": (2,3),   "vol": (5000,20000), "wt": (5000,20000)},
}

# Users
user_rows = []
userpreferences_rows = []
enroll_id_counter = 1

# Passengers
passengers = []
for i in range(NUM_PASSENGERS):
    user_id = guid()
    email = f"passenger{i+1}@example.com"
    
    full_name = fake.name()
    name_parts = full_name.split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ''
    
    user_rows.append([user_id, first_name, last_name, 'P', fake.date_of_birth(minimum_age=18, maximum_age=75),
                     random.choice(['M','F']), email, fake.phone_number(), fake.address()[:250],
                     email.split('@')[0], "hash", utcnow, None])
    
    userpreferences_rows.append([guid(), user_id, random.choice([0,1]), 'el', random.choice([0,1]), 
                                'Asia/Nicosia', None, utcnow, None])
    passengers.append(user_id)

# Lists for drivers & comp representatives entries
vehicle_rows = []
vehicledocument_rows = []
vehicletest_rows = []
vehiclelocationlive_rows = []
userserviceenrollment_rows = []
persondocument_rows = []

# Company Representatives
companyrep_rows = []
for i in range(NUM_COMPANY_REPRESENTATIVES):
    user_id = guid()
    email = f"companyrep{i+1}@example.com"
    
    full_name = fake.name()
    name_parts = full_name.split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ''
    
    user_rows.append([user_id, first_name, last_name, 'C', fake.date_of_birth(minimum_age=25, maximum_age=65),
                     random.choice(['M','F']), email, fake.phone_number(), fake.address()[:250],
                     email.split('@')[0], "hash", utcnow, None])
    
    company_name = fake.company()
    companyrep_rows.append([user_id, company_name])
    
    userpreferences_rows.append([guid(), user_id, random.choice([0,1]), 'el', random.choice([0,1]), 
                                'Asia/Nicosia', None, utcnow, None])

    # Person Documents for Company Representatives
    pd_issue = utcnow - timedelta(days=365*5)
    pd_exp   = utcnow + timedelta(days=365*3)
    persondocument_rows.append([guid(), user_id, 'Driver License', pd_issue, utcnow, pd_exp, 
                                'https://example.com/license.pdf'])
    
    id_issue = utcnow - timedelta(days=365*8)
    id_exp   = utcnow + timedelta(days=365*2)
    persondocument_rows.append([guid(), user_id, 'ID', id_issue, utcnow, id_exp, 
                                'https://example.com/id.pdf'])
    
    criminal_issue = utcnow - timedelta(days=90)
    criminal_exp   = utcnow + timedelta(days=275)
    persondocument_rows.append([guid(), user_id, 'Criminal Record Certificate', criminal_issue, utcnow, 
                                criminal_exp, 'https://example.com/criminal_record.pdf'])
    
    medical_issue = utcnow - timedelta(days=180)
    medical_exp   = utcnow + timedelta(days=185)
    persondocument_rows.append([guid(), user_id, 'Medical Certificate', medical_issue, utcnow, 
                                medical_exp, 'https://example.com/medical_cert.pdf'])

    # Company Representative Vehicles
    for v in range(NUM_VEHICLES_PER_DRIVER):
        veh_id = guid()
        vt_id = random.choice(list(vt_ids.values()))
        vt_name = [k for k, v in vt_ids.items() if v == vt_id][0]

        spec = vehicle_specs.get(vt_name, {"seats": (4,5), "vol": (300,500), "wt": (200,600)})
        seats = random.randint(spec["seats"][0], spec["seats"][1])
        cargo_vol = Decimal(str(random.randint(spec["vol"][0], spec["vol"][1])))
        cargo_wt  = Decimal(str(random.randint(spec["wt"][0], spec["wt"][1])))

        vehicle_rows.append([veh_id, vt_id, user_id, seats, cargo_vol, cargo_wt, 'Active'])

        # Vehicle Documents
        mot_issue = utcnow - timedelta(days=180)
        mot_exp = utcnow + timedelta(days=185)
        vehicledocument_rows.append([guid(), veh_id, 'MOT', mot_issue, utcnow, mot_exp,
                                    'https://example.com/mot.pdf', 'https://example.com/mot.png'])
        
        ownership_issue = utcnow - timedelta(days=365*2)
        ownership_exp = utcnow + timedelta(days=365*3)
        vehicledocument_rows.append([guid(), veh_id, 'Ownership', ownership_issue, utcnow, ownership_exp,
                                    'https://example.com/ownership.pdf', 'https://example.com/ownership.png'])
        
        service_issue = utcnow - timedelta(days=90)
        service_exp = utcnow + timedelta(days=275)
        vehicledocument_rows.append([guid(), veh_id, 'Service Report', service_issue, utcnow, service_exp,
                                    'https://example.com/service.pdf', 'https://example.com/service.png'])
        
        # Vehicle Test
        vehicletest_rows.append([guid(), veh_id, random.choice(inspector_ids), 
                                utcnow - timedelta(days=20), 'OK'])

        # Vehicle Location
        vehiclelocationlive_rows.append([veh_id, 34.69, 32.96, utcnow])

        # Company Rep Service Enrollment - ONLY teledriving services
        teledriving_combos = [(svc_key, rt_key) for svc_key, rt_key, vt, _ in combo_specs 
                     if vt == vt_name and rt_key in ["teledriving", "fully_autonomous"]]
        if teledriving_combos:
            svc_key, rt_key = random.choice(teledriving_combos)
            enroll_id = enroll_id_counter
            enroll_id_counter += 1
            userserviceenrollment_rows.append([enroll_id, user_id, veh_id, svc_ids[svc_key], rt_ids[rt_key],
                                              'Approved', utcnow, random.choice(operator_ids)])

# Drivers
driver_rows = []
driveravailability_rows = []
drivers = []

for i in range(NUM_DRIVERS):
    user_id = guid()
    email = f"driver{i+1}@example.com"

    full_name = fake.name()
    name_parts = full_name.split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ''
    
    user_rows.append([user_id, first_name, last_name, 'D', fake.date_of_birth(minimum_age=22, maximum_age=70),
                     random.choice(['M','F']), email, fake.phone_number(), fake.address()[:250],
                     email.split('@')[0], "hash", utcnow, None])
    
    driver_rows.append([user_id])

    # Person Documents
    pd_issue = utcnow - timedelta(days=365*5)
    pd_exp   = utcnow + timedelta(days=365*3)
    persondocument_rows.append([guid(), user_id, 'Driver License', pd_issue, utcnow, pd_exp, 
                                'https://example.com/license.pdf'])
    
    id_issue = utcnow - timedelta(days=365*8)
    id_exp   = utcnow + timedelta(days=365*2)
    persondocument_rows.append([guid(), user_id, 'ID', id_issue, utcnow, id_exp, 
                                'https://example.com/id.pdf'])
    
    criminal_issue = utcnow - timedelta(days=90)
    criminal_exp   = utcnow + timedelta(days=275)
    persondocument_rows.append([guid(), user_id, 'Criminal Record Certificate', criminal_issue, utcnow, 
                                criminal_exp, 'https://example.com/criminal_record.pdf'])
    
    medical_issue = utcnow - timedelta(days=180)
    medical_exp   = utcnow + timedelta(days=185)
    persondocument_rows.append([guid(), user_id, 'Medical Certificate', medical_issue, utcnow, 
                                medical_exp, 'https://example.com/medical_cert.pdf'])

    vehicle_ids = []
    
    for v in range(NUM_VEHICLES_PER_DRIVER):
        veh_id = guid()
        vt_id = random.choice(list(vt_ids.values()))
        vt_name = [k for k, v in vt_ids.items() if v == vt_id][0]

        spec = vehicle_specs.get(vt_name, {"seats": (4,5), "vol": (300,500), "wt": (200,600)})
        seats = random.randint(spec["seats"][0], spec["seats"][1])
        cargo_vol = Decimal(str(random.randint(spec["vol"][0], spec["vol"][1])))
        cargo_wt  = Decimal(str(random.randint(spec["wt"][0], spec["wt"][1])))

        vehicle_rows.append([veh_id, vt_id, user_id, seats, cargo_vol, cargo_wt, 'Active'])

        # Vehicle Documents
        mot_issue = utcnow - timedelta(days=180)
        mot_exp = utcnow + timedelta(days=185)
        vehicledocument_rows.append([guid(), veh_id, 'MOT', mot_issue, utcnow, mot_exp,
                                    'https://example.com/mot.pdf', 'https://example.com/mot.png'])
        
        ownership_issue = utcnow - timedelta(days=365*2)
        ownership_exp = utcnow + timedelta(days=365*3)
        vehicledocument_rows.append([guid(), veh_id, 'Ownership', ownership_issue, utcnow, ownership_exp,
                                    'https://example.com/ownership.pdf', 'https://example.com/ownership.png'])
        
        service_issue = utcnow - timedelta(days=90)
        service_exp = utcnow + timedelta(days=275)
        vehicledocument_rows.append([guid(), veh_id, 'Service Report', service_issue, utcnow, service_exp,
                                    'https://example.com/service.pdf', 'https://example.com/service.png'])
        
        # Vehicle Test
        vehicletest_rows.append([guid(), veh_id, random.choice(inspector_ids), 
                                utcnow - timedelta(days=20), 'OK'])

        # Vehicle Location
        vehiclelocationlive_rows.append([veh_id, 34.69, 32.96, utcnow])

        # Driver Service Enrollment
        compatible_combos = [(svc_key, rt_key) for svc_key, rt_key, vt, _ in combo_specs if vt == vt_name]
        if compatible_combos:
            svc_key, rt_key = random.choice(compatible_combos)
            enroll_id = enroll_id_counter
            enroll_id_counter += 1
            userserviceenrollment_rows.append([enroll_id, user_id, veh_id, svc_ids[svc_key], rt_ids[rt_key],
                                              'Approved', utcnow, random.choice(operator_ids)])

        vehicle_ids.append(veh_id)

    drivers.append((user_id, vehicle_ids))

# Write User-related CSVs
write_csv('User', ['UserId', 'FirstName', 'LastName', 'Role', 'Dob', 'Gender', 'Email', 'Phone', 'Address', 
                   'Username', 'PasswordHash', 'CreatedAt', 'UpdatedAt'], user_rows)


write_csv('Passenger', ['UserId'], [[p] for p in passengers])


write_csv('Driver', ['UserId'], driver_rows)


write_csv('CompanyRepresentative', ['UserId', 'Company'], companyrep_rows)


write_csv('UserPreferences', ['UserPreferencesId', 'UserId', 'NotificationsEnabled', 'Language', 'LocEnabled', 
                              'Timezone', 'PreferredPaymentMethod', 'CreatedAt', 'UpdatedAt'], userpreferences_rows)


write_csv('PersonDocument', ['DocId', 'UserId', 'DocType', 'IssueDate', 'UploadedAt', 'ExpiryDate', 'FileUrl'], 
          persondocument_rows)


# Write Vehicle-related CSVs
write_csv('Vehicle', ['VehicleId', 'VehicleTypeId', 'OwnerUserId', 'Seats', 'CargoVolume', 'CargoWeight', 'Status'], 
          vehicle_rows)


write_csv('VehicleDocument', ['VehDocId', 'VehicleId', 'DocType', 'IssueDate', 'UploadedAt', 'ExpiryDate', 'FileUrl', 'Image'], 
          vehicledocument_rows)


write_csv('VehicleTest', ['TestId', 'VehicleId', 'InspectorId', 'CheckDate', 'Comments'], vehicletest_rows)


write_csv('VehicleLocationLive', ['VehicleId', 'Lat', 'Lng', 'UpdatedAt'], vehiclelocationlive_rows)


write_csv('UserServiceEnrollment', ['EnrollId', 'UserId', 'VehicleId', 'ServiceType', 'RideType', 'Status', 'ApprovedAt', 'ApprovedById'], 
          userserviceenrollment_rows)


# Geofences
MIN_LAT = 34.56
MAX_LAT = 35.20
MIN_LNG = 32.30
MAX_LNG = 34.10
CELL_SIZE = 0.10

lat_span = MAX_LAT - MIN_LAT
lng_span = MAX_LNG - MIN_LNG

num_rows = int(lat_span / CELL_SIZE) + 1
num_cols = int(lng_span / CELL_SIZE) + 1

geofencezone_rows = []
zones = []
grid = []

zone_id = 1
for r in range(num_rows):
    row_ids = []
    for c in range(num_cols):

        minlat = MIN_LAT + r * CELL_SIZE
        maxlat = min(minlat + CELL_SIZE, MAX_LAT)

        minlng = MIN_LNG + c * CELL_SIZE
        maxlng = min(minlng + CELL_SIZE, MAX_LNG)

        geofencezone_rows.append([
            zone_id,
            minlat,
            minlng,
            maxlat,
            maxlng,
            f"Zone {zone_id}",
            utcnow,
            None
        ])

        row_ids.append(zone_id)
        zones.append(zone_id)

        zone_id += 1
    grid.append(row_ids)

write_csv(
    'Geofencezone',
    ['ZoneId','MinLat','MinLng','MaxLat','MaxLng','Name','CreatedAt','UpdatedAt'],
    geofencezone_rows
)

# Bridges
bridge_rows = []
bridge_ids = []
bridge_id = 1

for r in range(num_rows):
    for c in range(num_cols):

        current = grid[r][c]

        # Bridge → Right neighbor
        if c < num_cols - 1:
            right = grid[r][c+1]
            bridge_rows.append([
                bridge_id,
                f"Bridge {bridge_id}",
                current,
                right
            ])
            bridge_ids.append(bridge_id)
            bridge_id += 1

        # Bridge → Down neighbor
        if r < num_rows - 1:
            down = grid[r+1][c]
            bridge_rows.append([
                bridge_id,
                f"Bridge {bridge_id}",
                current,
                down
            ])
            bridge_ids.append(bridge_id)
            bridge_id += 1

write_csv(
    'Bridge',
    ['BridgeId','Name','FromZone','ToZone'],
    bridge_rows
)

# Rides
riderequest_rows = []
itineraryleg_rows = []
legcrossesbridge_rows = []
dispatchoffer_rows = []
payment_rows = []
ride_rows = []
inappmessage_rows = []
rating_rows = []

request_id_counter = 1
leg_id_counter = 1
offer_id_counter = 1
ride_id_counter = 1
msg_id_counter = 1
rating_id_counter = 1

# Collect all drivers and company reps with their vehicles and enrollments
service_providers = []
for d_user, veh_list in drivers:
    for veh in veh_list:
        # Find enrollments for this driver+vehicle
        driver_enrollments = [e for e in userserviceenrollment_rows if e[1] == d_user and e[2] == veh]
        for enroll in driver_enrollments:
            service_providers.append({
                'user_id': d_user,
                'vehicle_id': veh,
                'service_type_id': enroll[3],
                'ride_type_id': enroll[4],
                'role': 'D'
            })

for comp_row in companyrep_rows:
    comp_user = comp_row[0]
    comp_vehicles = [v[0] for v in vehicle_rows if v[2] == comp_user]
    for veh in comp_vehicles:
        comp_enrollments = [e for e in userserviceenrollment_rows if e[1] == comp_user and e[2] == veh]
        for enroll in comp_enrollments:
            service_providers.append({
                'user_id': comp_user,
                'vehicle_id': veh,
                'service_type_id': enroll[3],
                'ride_type_id': enroll[4],
                'role': 'C'
            })

# Group profiles by service type for variety
profiles_by_service = {}
for profile_row in allowedrideprofile_rows:
    svc_id = profile_row[1]
    if svc_id not in profiles_by_service:
        profiles_by_service[svc_id] = []
    profiles_by_service[svc_id].append(profile_row)

ride_scenarios = [
    {'status': 'Completed', 'weight': 0.5, 'has_rating': 0.7, 'has_messages': 0.8, 'num_offers': (1, 2)},  # Reduced from (2,5) to (1,2)
    {'status': 'InProgress', 'weight': 0.15, 'has_rating': 0, 'has_messages': 0.5, 'num_offers': (1, 1)},
    {'status': 'Scheduled', 'weight': 0.2, 'has_rating': 0, 'has_messages': 0.2, 'num_offers': (1, 1)},
    {'status': 'Cancelled', 'weight': 0.15, 'has_rating': 0.1, 'has_messages': 0.3, 'num_offers': (1, 2)},  # Reduced from (1,4) to (1,2)
]

# Normalize weights
total_weight = sum(s['weight'] for s in ride_scenarios)
for scenario in ride_scenarios:
    scenario['weight'] = scenario['weight'] / total_weight

for i in range(RIDES_TO_CREATE):
    # Select scenario based on weights
    rand = random.random()
    cumulative = 0
    selected_scenario = ride_scenarios[0]
    for scenario in ride_scenarios:
        cumulative += scenario['weight']
        if rand <= cumulative:
            selected_scenario = scenario
            break
    
    p_user = random.choice(passengers)
    
    # Select a random service type and profile
    svc_id = random.choice(list(profiles_by_service.keys()))
    profile_row = random.choice(profiles_by_service[svc_id])
    profile_id = profile_row[0]
    rt_id = profile_row[2]
    vt_id = profile_row[3]
    
    # Create ride request
    req_id = request_id_counter
    request_id_counter += 2  # IDENTITY(1,2)
    
    pickup_time = utcnow - timedelta(minutes=random.randint(10, 2880))  # Up to 2 days ago
    
    # Determine if this is a bridged route
    is_bridged = (svc_id == svc_ids['bridged_route'])
    num_legs = random.randint(2, 4) if is_bridged else 1
    
    # Generate realistic coordinates (Cyprus area)
    pickup_lat = round(random.uniform(34.65, 34.75), 6)
    pickup_lng = round(random.uniform(32.95, 33.05), 6)
    drop_lat = round(random.uniform(34.65, 34.75), 6)
    drop_lng = round(random.uniform(32.95, 33.05), 6)
    
    request_status = 'Pending' if selected_scenario['status'] in ['Scheduled', 'InProgress'] else selected_scenario['status']
    
    riderequest_rows.append([
        req_id, p_user, random.randint(1, 4), pickup_time,
        pickup_lat, pickup_lng, drop_lat, drop_lng,
        'Cyprus', 'Nicosia', 'Nicosia', random.choice(['Center', 'Strovolos', 'Latsia', 'Engomi']), 
        random.choice(['1010', '1020', '1030', '2040']),
        'Cyprus', 'Nicosia', 'Nicosia', random.choice(['Center', 'Strovolos', 'Latsia', 'Engomi']), 
        random.choice(['1010', '1020', '1030', '2040']),
        utcnow, None, request_status, profile_id
    ])
    
    # Create itinerary legs
    leg_ids = []
    for leg_seq in range(1, num_legs + 1):
        leg_id = leg_id_counter
        leg_id_counter += 1
        
        via_bridge = random.choice(bridge_ids) if is_bridged and bridge_ids and leg_seq > 1 else None
        itineraryleg_rows.append([leg_id, leg_seq, via_bridge, req_id])
        leg_ids.append(leg_id)
        
        # Add bridge crossings if applicable
        if via_bridge:
            legcrossesbridge_rows.append([leg_id, via_bridge])
            # Sometimes a leg crosses multiple bridges
            if random.random() < 0.3 and len(bridge_ids) > 1:
                extra_bridge = random.choice([b for b in bridge_ids if b != via_bridge])
                legcrossesbridge_rows.append([leg_id, extra_bridge])
    
    # Create dispatch offers
    num_offers = random.randint(selected_scenario['num_offers'][0], selected_scenario['num_offers'][1])
    
    # Filter providers that match this ride's requirements
    matching_providers = [
        sp for sp in service_providers 
        if sp['service_type_id'] == svc_id and sp['ride_type_id'] == rt_id
    ]
    
    if not matching_providers:
        # Fallback: use any provider
        matching_providers = service_providers[:min(10, len(service_providers))]
    
    selected_providers = random.sample(matching_providers, min(num_offers, len(matching_providers)))
    accepted_offer_id = None
    accepted_provider = None
    
    for idx, provider in enumerate(selected_providers):
        # Assign to first leg (could be more sophisticated)
        target_leg = random.choice(leg_ids)
        
        offer_id = offer_id_counter
        offer_id_counter += 1
        
        # First offer more likely to be accepted for completed/in-progress rides
        if idx == 0 and selected_scenario['status'] in ['Completed', 'InProgress', 'Scheduled']:
            offer_status = 'Accepted'
            accepted_offer_id = offer_id
            accepted_provider = provider
            responded_at = pickup_time + timedelta(seconds=random.randint(10, 300))
        else:
            offer_status = random.choice(['Sent', 'Declined', 'Expired'])
            responded_at = pickup_time + timedelta(seconds=random.randint(10, 600)) if offer_status != 'Sent' else None
        
        dispatchoffer_rows.append([
            offer_id, target_leg, provider['user_id'], offer_status,
            pickup_time + timedelta(seconds=random.randint(1, 60)),
            responded_at
        ])
    
    # Create ride if offer was accepted
    if accepted_offer_id and accepted_provider:
        started = pickup_time + timedelta(minutes=random.randint(5, 20))
        duration_mins = random.randint(10, 60)
        ended = started + timedelta(minutes=duration_mins) if selected_scenario['status'] != 'InProgress' else None
        
        # Calculate price based on service type
        service_type = [s for s in servicetype_rows if s[0] == svc_id][0]
        base_fare = float(service_type[3])
        per_km = float(service_type[4])
        per_min = float(service_type[5])
        
        distance_km = random.uniform(5, 30)
        gross = round(base_fare + (per_km * distance_km) + (per_min * duration_mins), 2)
        fee = round(gross * 0.15, 2)  # 15% platform fee
        payout = round(gross - fee, 2)
        
        # Create payment if ride completed
        pay_id = None
        if selected_scenario['status'] == 'Completed':
            pay_id = guid()
            payment_method = random.choice(['CreditCard', 'Cash'])
            payment_rows.append([
                pay_id, p_user, accepted_provider['user_id'], 
                gross, fee, payout, ended, payment_method, 'Completed'
            ])
        
        # Create rating if applicable
        rating_ref = None
        if selected_scenario['status'] == 'Completed' and random.random() < selected_scenario['has_rating']:
            rating_ref = rating_id_counter
            rating_id_counter += 1
            stars = random.choices([1, 2, 3, 4, 5], weights=[0.05, 0.05, 0.1, 0.3, 0.5])[0]
            comments = [
                "Great ride!", "Very professional", "Smooth journey", "Excellent service",
                "Good driver", "Clean vehicle", "On time", "Friendly driver",
                "Could be better", "Acceptable", "Not bad", "Average experience"
            ]
            rating_rows.append([
                rating_ref, p_user, accepted_provider['user_id'], 
                stars, random.choice(comments), utcnow, None
            ])
        
        ride_id = ride_id_counter
        ride_id_counter += 2  # IDENTITY(1,2)
        
        # Ensure EndedAt is always after StartedAt (required by CHECK constraint)
        ended_safe = ended if ended else started + timedelta(minutes=1)
        
        ride_rows.append([
            ride_id, accepted_offer_id, accepted_provider['user_id'], 
            p_user, accepted_provider['vehicle_id'],
            started, ended_safe, gross, selected_scenario['status'],
            rating_ref, pay_id
        ])
        
        # Create in-app messages if applicable
        if random.random() < selected_scenario['has_messages']:
            num_messages = random.randint(1, 2)  # Reduced from (1,5) to (1,2)
            for msg_idx in range(num_messages):
                msg_id = msg_id_counter
                msg_id_counter += 1
                
                # Alternate sender
                if msg_idx % 2 == 0:
                    sender = accepted_provider['user_id']
                    recipient = p_user
                    messages = [
                        "I'm on my way", "Arriving in 5 minutes", "I'm here",
                        "Running a bit late", "Found parking", "Ready when you are"
                    ]
                else:
                    sender = p_user
                    recipient = accepted_provider['user_id']
                    messages = [
                        "Thanks, see you soon", "I'm waiting outside", "Take your time",
                        "Can you wait a minute?", "I'm coming down", "Thank you!"
                    ]
                
                msg_time = started - timedelta(minutes=random.randint(1, 10))
                inappmessage_rows.append([
                    msg_id, sender, recipient, random.choice(messages), msg_time, ride_id
                ])

# Write ride-related CSVs
write_csv('RideRequest', ['RequestId', 'PassengerId', 'NumOfPeople', 'PickupAt', 'PickupLat', 'PickupLng', 
                          'DropLat', 'DropLng', 'PickupCountry', 'PickupRegion', 'PickupCity', 'PickupDistrict', 
                          'PickupPostalCode', 'DropCountry', 'DropRegion', 'DropCity', 'DropDistrict', 
                          'DropPostalCode', 'CreatedAt', 'UpdatedAt', 'Status', 'RideProfileId'], riderequest_rows)

write_csv('ItineraryLeg', ['LegId', 'SeqNo', 'ViaBridgeId', 'RideRequestId'], itineraryleg_rows)


write_csv('LegCrossesBridge', ['ItineraryLeg', 'Bridge'], legcrossesbridge_rows)


write_csv('DispatchOffer', ['OfferId', 'LegId', 'RecipientUserId', 'Status', 'SentAt', 'RespondedAt'], 
          dispatchoffer_rows)


write_csv('Payment', ['PaymentId', 'SenderUserId', 'ReceiverUserId', 'GrossAmount', 'OsrhFee', 'DriverPayout', 
                      'PaidAt', 'Method', 'Status'], payment_rows)


write_csv('Ride', ['RideId', 'OfferId', 'DriverUserId', 'PassengerUserId', 'VehicleId', 'StartedAt', 'EndedAt', 
                   'PriceFinal', 'Status', 'Rating', 'Payment'], ride_rows)


write_csv('InAppMessage', ['MsgId', 'SenderUserId', 'RecipientUserId', 'Body', 'SentAt', 'Ride'], inappmessage_rows)


write_csv('Rating', ['RatingId', 'AuthorUserId', 'TargetUserId', 'Stars', 'Comment', 'CreatedAt', 'UpdatedAt'], 
          rating_rows)


# Print statistics
print(f"\n📊 Ride Creation Statistics:")
print(f"   • Ride Requests: {len(riderequest_rows)}")
print(f"   • Itinerary Legs: {len(itineraryleg_rows)}")
print(f"   • Bridge Crossings: {len(legcrossesbridge_rows)}")
print(f"   • Dispatch Offers: {len(dispatchoffer_rows)}")
print(f"   • Completed Rides: {len(ride_rows)}")
print(f"   • Payments: {len(payment_rows)}")
print(f"   • Ratings: {len(rating_rows)}")
print(f"   • Messages: {len(inappmessage_rows)}")

# Breakdown by ride type
ride_types_used = {}
for r in riderequest_rows:
    profile_id = r[21]  # RideProfileId
    profile = next(p for p in allowedrideprofile_rows if p[0] == profile_id)
    rt_id = profile[2]
    rt_name = next(rt[1] for rt in ridetype_rows if rt[0] == rt_id)
    ride_types_used[rt_name] = ride_types_used.get(rt_name, 0) + 1

print(f"\n📋 Requests by Ride Type:")
for rt_name, count in sorted(ride_types_used.items(), key=lambda x: -x[1]):
    print(f"   • {rt_name}: {count}")

# Driver Availability (for both drivers and company representatives)
driveravailability_rows = []
all_enrollments = {}
for enroll in userserviceenrollment_rows:
    user_id = enroll[1]
    enroll_id = enroll[0]
    if user_id not in all_enrollments:
        all_enrollments[user_id] = []
    all_enrollments[user_id].append(enroll_id)

# Generate availability for next 30 days
base_date = datetime.now(timezone.utc).date()

for user_id, enroll_ids in all_enrollments.items():
    # Determine user role
    user_row = next((u for u in user_rows if u[0] == user_id), None)
    if not user_row:
        continue
    
    user_role = user_row[3]  # 'D' or 'C'
    
    # Each user has availability for 3-6 days per week
    working_days_per_week = random.randint(3, 6)
    
    # Generate availability for next 4 weeks
    for week in range(4):
        # Randomly select working days for this week
        days_this_week = random.sample(range(7), working_days_per_week)
        
        for day_offset in days_this_week:
            availability_date = base_date + timedelta(days=week*7 + day_offset)
            
            # Each user can have 1-2 time slots per day
            num_slots = random.randint(1, 2)
            
            # Select enrollment and zone for this availability
            enroll_id = random.choice(enroll_ids)
            zone_id = random.choice(zones)
            is_recurring = random.choice([0, 1])
            
            if num_slots == 1:
                # Single shift (e.g., 8:00-17:00)
                start_hour = random.choice([6, 7, 8, 9])
                end_hour = start_hour + random.randint(7, 9)
                
                driveravailability_rows.append([
                    enroll_id, availability_date, zone_id,
                    f"{start_hour:02d}:00:00", f"{end_hour:02d}:00:00",
                    is_recurring, utcnow
                ])
            else:
                # Split shift (e.g., 7:00-12:00 and 14:00-19:00)
                morning_start = random.choice([6, 7, 8])
                morning_end = morning_start + random.randint(4, 5)
                afternoon_start = random.choice([13, 14, 15])
                afternoon_end = afternoon_start + random.randint(4, 6)
                
                # Morning shift
                driveravailability_rows.append([
                    enroll_id, availability_date, zone_id,
                    f"{morning_start:02d}:00:00", f"{morning_end:02d}:00:00",
                    is_recurring, utcnow
                ])
                
                # Afternoon shift (potentially different zone/enrollment)
                enroll_id_afternoon = random.choice(enroll_ids)
                zone_id_afternoon = random.choice(zones)
                
                driveravailability_rows.append([
                    enroll_id_afternoon, availability_date, zone_id_afternoon,
                    f"{afternoon_start:02d}:00:00", f"{afternoon_end:02d}:00:00",
                    is_recurring, utcnow
                ])

write_csv('DriverAvailability', ['EnrollId', 'AvailabilityDate', 'GeofencezoneId', 'StartsAt', 'EndsAt',
                                  'IsRecurring', 'UpdatedAt'], driveravailability_rows)


end_time = datetime.now(timezone.utc)
print(f"\n✅ All seed data written to CSV files in {CSV_DIR}")
print(f"⏱️  Completed in {end_time - start_time}")