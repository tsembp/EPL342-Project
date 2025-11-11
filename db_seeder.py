import os
import uuid, random, datetime
from decimal import Decimal
from faker import Faker
from dotenv import load_dotenv
import pyodbc

load_dotenv()

# ---------- CONFIG ----------
SERVER   = os.getenv("DB_HOST", "YOUR_SERVER") + ",1433"
DB_NAME = os.getenv("DB_NAME", "YOUR_DB")
PASSWORD = os.getenv("DB_PASS", "YOUR_PASSWORD")

NUM_ADMINS     = 5
NUM_OPERATORS  = 30
NUM_INSPECTORS = 100

NUM_PASSENGERS = 300
NUM_DRIVERS    = 400
NUM_VEHICLES_PER_DRIVER = 2
NUM_CREDIT_CARDS_PER_ENTITY = 3

NUM_COMPANIES  = 5
NUM_REPR_PER_COMPANY = 40

RIDES_TO_CREATE = 10
# ----------------------------

fake = Faker("el_GR")   # greek
Faker.seed(342)

def guid(): return str(uuid.uuid4())
utcnow = datetime.datetime.utcnow

cn = pyodbc.connect(
    "Driver={ODBC Driver 18 for SQL Server};"
    f"Server={SERVER};Database={DB_NAME};UID={DB_NAME};PWD={PASSWORD};"
    "Encrypt=yes;TrustServerCertificate=yes"
)
cn.autocommit = False

with cn:
    cur = cn.cursor()
    start_time = datetime.datetime.now()

    # Ride Types
    ride_types = [
        ("vehicle_with_driver", "Όχημα με οδηγό"),
        ("vehicle_no_driver",   "Όχημα χωρίς οδηγό"),
        ("teledriving",         "Όχημα τηλεοδήγησης στη θέση χρήστη"),
        ("fully_autonomous",    "Όχημα πλήρως αυτόνομο στη θέση χρήστη"),
        ("small_cargo_van",     "Μικρό βαν για φορτία"),
    ]
    rt_ids = {}
    for key, label in ride_types:
        cur.execute("""
            IF NOT EXISTS(SELECT 1 FROM dbo.Ridetype WHERE [Name]=?)
            INSERT dbo.Ridetype([Name],[Description]) VALUES(?,?);
        """, label, label, label)
        # capture actual id
        ridrow = cur.execute("SELECT TOP 1 RideTypeId FROM dbo.Ridetype WHERE [Name]=?", label).fetchone()
        rt_ids[key] = ridrow[0]

    # Service Types
    services = [
        ("simple_route",    "Μεταφορά επιβάτη από Α σε Ω"),
        ("luxury_route",    "Όπως απλή αλλά με ανώτερες προδιαγραφές"),
        ("light_cargo",     "Μικρός οικιακός όγκος/βάρος"),
        ("heavy_cargo",     "Μετακόμιση/μεγαλύτερος όγκος"),
        ("bridged_route",   "Πολλαπλά μέσα λόγω geofencing/bridges"),
    ]
    svc_ids = {}
    for name, desc in services:
        cur.execute("""
            IF NOT EXISTS(SELECT 1 FROM dbo.Servicetype WHERE [Name]=?)
            INSERT dbo.Servicetype([Name],[Description],BaseFare,PerKm,PerMin,ValidFrom,Active)
            VALUES(?, ?, 3.50, 0.80, 0.20, SYSUTCDATETIME(), 1);
        """, name, name, desc)
        row = cur.execute("SELECT TOP 1 ServiceTypeId FROM dbo.Servicetype WHERE [Name]=?", name).fetchone()
        svc_ids[name] = row[0]

    # Vehicle Types
    veh_types = [
        "Sedan", "Hatchback", "SUV", "Coupe", "Convertible", "Pickup Truck", "Minivan", "Van", 
        "Wagon", "Crossover", "Luxury Car", "Sports Car", "Electric Car", "Hybrid Car", "Truck",
    ]
    vt_ids = {}
    for vt in veh_types:
        cur.execute("""
            IF NOT EXISTS(SELECT 1 FROM dbo.VehicleType WHERE [Name]=?)
            INSERT dbo.VehicleType(VehicleTypeId,[Name]) VALUES(NEWID(), ?);
        """, vt, vt)
        row = cur.execute("SELECT TOP 1 VehicleTypeId FROM dbo.VehicleType WHERE [Name]=?", vt).fetchone()
        vt_ids[vt] = row[0]

    # AllowedRideProfile + ServicetypeAllowedRidetype
    combo_specs = [
        ("simple_route",    "vehicle_with_driver", "Sedan",    "Απλή διαδρομή επιβάτη με sedan"),
        ("simple_route",    "vehicle_with_driver", "Hatchback",    "Απλή διαδρομή επιβάτη με hatchback"),
        ("simple_route",    "vehicle_with_driver", "SUV",    "Απλή διαδρομή επιβάτη με SUV"),
        ("simple_route",    "vehicle_with_driver", "Coupe",    "Απλή διαδρομή επιβάτη με coupe"),
        ("simple_route",    "vehicle_with_driver", "Convertible",    "Απλή διαδρομή επιβάτη με convertible"),
        ("simple_route",    "vehicle_with_driver", "Crossover",    "Απλή διαδρομή επιβάτη με crossover"),
        ("simple_route",    "vehicle_with_driver", "Electric Car",    "Απλή διαδρομή επιβάτη με electric car"),
        ("simple_route",    "vehicle_with_driver", "Hybrid Car",    "Απλή διαδρομή επιβάτη με hybrid car"),
        ("simple_route",    "vehicle_with_driver", "Wagon",    "Απλή διαδρομή επιβάτη με wagon"),
        ("simple_route",    "vehicle_with_driver", "Convertible",    "Απλή διαδρομή επιβάτη με convertible"),
        
        ("luxury_route",    "vehicle_with_driver", "Luxury Car",      "Πολυτελής διαδρομή επιβάτη με luxury car"),
        ("luxury_route",    "vehicle_with_driver", "Sports Car",      "Πολυτελής διαδρομή επιβάτη με sports car"),
        ("luxury_route",    "vehicle_with_driver", "SUV",      "Πολυτελής διαδρομή επιβάτη με SUV"),
        ("luxury_route",    "vehicle_with_driver", "Electric Car",      "Πολυτελής διαδρομή επιβάτη με electric car"),
        ("luxury_route",    "vehicle_with_driver", "Minivan",      "Πολυτελής διαδρομή επιβάτη με minivan"),

        ("light_cargo",     "small_cargo_van",     "Van",      "Μεταφορά ελαφριού φορτίου με van"),
        ("light_cargo",     "small_cargo_van",     "Pickup Truck",      "Μεταφορά ελαφριού φορτίου με pickup truck"),
        ("light_cargo",     "small_cargo_van",     "Truck",      "Μεταφορά ελαφριού φορτίου με truck"),

        ("heavy_cargo",     "small_cargo_van",     "Minivan",  "Μεταφορά μεγάλου φορτίου με minivan"),
        ("heavy_cargo",     "small_cargo_van",     "Van",  "Μεταφορά μεγάλου φορτίου με van"),
        ("heavy_cargo",     "small_cargo_van",     "Truck",  "Μεταφορά μεγάλου φορτίου με truck"),

        ("bridged_route",   "vehicle_with_driver", "Sedan",    "Απλή διαδρομή επιβάτη με sedan"),
        ("bridged_route",   "vehicle_with_driver", "Hatchback",    "Απλή διαδρομή επιβάτη με hatchback"),
        ("bridged_route",   "vehicle_with_driver", "SUV",    "Απλή διαδρομή επιβάτη με SUV"),
        ("bridged_route",   "vehicle_with_driver", "Coupe",    "Απλή διαδρομή επιβάτη με coupe"),
        ("bridged_route",   "vehicle_with_driver", "Convertible",    "Απλή διαδρομή επιβάτη με convertible"),
        ("bridged_route",   "vehicle_with_driver", "Crossover",    "Απλή διαδρομή επιβάτη με crossover"),
        ("bridged_route",   "vehicle_with_driver", "Electric Car",    "Απλή διαδρομή επιβάτη με electric car"),
        ("bridged_route",   "vehicle_with_driver", "Hybrid Car",    "Απλή διαδρομή επιβάτη με hybrid car"),
        ("bridged_route",   "vehicle_with_driver", "Wagon",    "Απλή διαδρομή επιβάτη με wagon"),
        ("bridged_route",   "vehicle_with_driver", "Convertible",    "Απλή διαδρομή επιβάτη με convertible"),
    ]
    for svc_key, rt_key, vt_name, profile_name in combo_specs:
        svc_id = svc_ids[svc_key]
        rt_id = rt_ids[rt_key]
        vt_id = vt_ids[vt_name]

        # ensure junction row exists
        row = cur.execute(
            "SELECT 1 FROM dbo.ServicetypeAllowedRidetype WHERE ServiceTypeID = ? AND RideTypeID = ?",
            svc_id, rt_id
        ).fetchone()

        if not row:
            cur.execute(
                "INSERT INTO dbo.ServicetypeAllowedRidetype (ServiceTypeID, RideTypeID) VALUES (?, ?)",
                svc_id, rt_id
            )

        # insert allowed ride profile linked by service+ride type (avoid duplicates)
        cur.execute("""
            IF NOT EXISTS (
                SELECT 1 FROM dbo.AllowedRideProfile
                WHERE ServiceTypeId = ? AND RideTypeId = ? AND VehicleTypeId = ?
            )
            INSERT INTO dbo.AllowedRideProfile (RideProfileId, ServiceTypeId, RideTypeId, VehicleTypeId, ProfileName)
            VALUES (NEWID(), ?, ?, ?, ?);
        """, svc_id, rt_id, vt_id, svc_id, rt_id, vt_id, profile_name)

    # pick one profile id for use later
    profile_any = cur.execute("SELECT TOP 1 RideProfileId FROM dbo.AllowedRideProfile").fetchone()[0]

    # Admins
    admin_ids = []
    for i in range(NUM_ADMINS):
        aid = guid()
        cur.execute("INSERT dbo.Admin(AdminId,Username,PasswordHash) VALUES(?,?,?)",
                    aid, f"admin{i+1}", "admin-hash")
        admin_ids.append(aid)

    # Operators
    operator_ids = []
    for i in range(NUM_OPERATORS):
        oid = guid()
        cur.execute("INSERT dbo.Operator(OperatorId,Email,Username,PasswordHash,ApprovedByAdmin) VALUES(?,?,?,?,?)", 
                    oid, f"operator{i+1}@example.com", f"operator{i+1}", "operator-hash", random.choice(admin_ids))
        operator_ids.append(oid)

    # Inspectors
    inspector_ids = []
    for i in range(NUM_INSPECTORS):
        ins = guid()
        cur.execute("INSERT dbo.Inspector(InspectorId,Email,Username,PasswordHash) VALUES(?,?,?,?)",
                    ins, f"inspector{i+1}@example.com", f"inspector{i+1}", "hash-inspector")
        inspector_ids.append(ins)

    # Companies & Representatives
    company_ids = []
    comp_parties = []
    for i in range(NUM_COMPANIES):
        party_c = guid()
        cur.execute("INSERT dbo.Party(PartyId,PartyType,CreatedAt) VALUES(?, 'C', SYSUTCDATETIME())", party_c)
        cid = guid()
        cur.execute("INSERT dbo.Company(CompanyId,Name,PartyId) VALUES(?,?,?)",
                    cid, f"Company {i+1}", party_c)
        company_ids.append(cid)
        comp_parties.append(party_c)

        # Representatives per company
        for r in range(NUM_REPR_PER_COMPANY):
            user_id = guid()
            email = f"repr{i+1}-{r+1}@example.com"
            username = email.split('@')[0]
            cur.execute("""INSERT dbo.CompanyRepresentative(CompanyRepresentativeId,CompanyId,Email,Username,PasswordHash)
                   VALUES(?,?,?,?,?)""", user_id, cid, email, username, "hash")

    # # Passengers
    # passengers = []  # (party_id, user_id)
    # for i in range(NUM_PASSENGERS):
    #     party_u = guid()
    #     user_id = guid()
    #     email = f"passenger{i+1}@example.com"
    #     cur.execute("INSERT dbo.Party(PartyId,PartyType,CreatedAt) VALUES(?, 'U', SYSUTCDATETIME())", party_u)
    #     cur.execute("""INSERT dbo.[User](UserId,Name,Dob,Gender,Email,Phone,Address,Username,PasswordHash,PartyId)
    #                    VALUES(?,?,?,?,?,?,?,?,?,?)""",
    #                 user_id, fake.name(), fake.date_of_birth(minimum_age=18, maximum_age=75),
    #                 random.choice(['M','F', 'm', 'f']), email, fake.phone_number(), fake.address()[:250],
    #                 email.split('@')[0], "hash", party_u)
    #     cur.execute("INSERT dbo.Passenger(UserId) VALUES(?)", user_id)
    #     cur.execute("""INSERT dbo.UserPreferences(UserPreferencesId,UserId,NotificationsEnabled,[Language],LocEnabled,Timezone)
    #                    VALUES(NEWID(), ?, ?, 'el', ?, N'Asia/Nicosia')""",
    #                 user_id, random.choice([0,1]), random.choice([0,1]))
    #     passengers.append((party_u, user_id))

    # # Drivers
    # drivers = []  # (driver_party, driver_user, [vehicle_ids])
    # for i in range(NUM_DRIVERS):
    #     party_u = guid()
    #     user_id = guid()
    #     email = f"driver{i+1}@example.com"
    #     cur.execute("INSERT dbo.Party(PartyId,PartyType,CreatedAt) VALUES(?, 'U', SYSUTCDATETIME())", party_u)
    #     cur.execute("""INSERT dbo.[User](UserId,Name,Dob,Gender,Email,Phone,Address,Username,PasswordHash,PartyId)
    #                    VALUES(?,?,?,?,?,?,?,?,?,?)""",
    #                 user_id, fake.name(), fake.date_of_birth(minimum_age=22, maximum_age=70),
    #                 random.choice(['M','F', 'm', 'f']), email, fake.phone_number(), fake.address()[:250],
    #                 email.split('@')[0], "hash", party_u)
    #     cur.execute("INSERT dbo.Driver(UserId,Company) VALUES(?, ?)", user_id, random.choice(company_ids))

    #     # PersonDocument for driver (once per driver)
    #     # Driver License
    #     pd_issue = utcnow() - datetime.timedelta(days=365*5)
    #     pd_exp   = utcnow() + datetime.timedelta(days=365*3)
    #     cur.execute("""INSERT dbo.PersonDocument(DocId,UserId,DocType,IssueDate,UploadedAt,ExpiryDate,FileUrl)
    #                VALUES(NEWID(),?,?,?,?,?,?)""",
    #             user_id, 'DriverLicense', pd_issue, utcnow(), pd_exp, 'https://example.com/license.pdf')
        
    #     # ID Document
    #     id_issue = utcnow() - datetime.timedelta(days=365*8)
    #     id_exp   = utcnow() + datetime.timedelta(days=365*2)
    #     cur.execute("""INSERT dbo.PersonDocument(DocId,UserId,DocType,IssueDate,UploadedAt,ExpiryDate,FileUrl)
    #                VALUES(NEWID(),?,?,?,?,?,?)""",
    #             user_id, 'ID', id_issue, utcnow(), id_exp, 'https://example.com/id.pdf')
        
    #     # Proof of Address
    #     addr_issue = utcnow() - datetime.timedelta(days=30)
    #     addr_exp   = utcnow() + datetime.timedelta(days=90)
    #     cur.execute("""INSERT dbo.PersonDocument(DocId,UserId,DocType,IssueDate,UploadedAt,ExpiryDate,FileUrl)
    #                VALUES(NEWID(),?,?,?,?,?,?)""",
    #             user_id, 'ProofOfAddress', addr_issue, utcnow(), addr_exp, 'https://example.com/address.pdf')

    #     vehicle_ids = []
        
    #     # Vehicles per driver
    #     for v in range(NUM_VEHICLES_PER_DRIVER):
    #         veh_id = guid()
    #         vt_id = random.choice(list(vt_ids.values()))
    #         cur.execute("""INSERT dbo.Vehicle(VehicleId,VehicleTypeId,Seats,CargoVolume,CargoWeight,Status,UserOwnerPartyId)
    #                VALUES(?,?,?,?,?,?,?)""",
    #             veh_id, vt_id, random.choice([4,5,7]),
    #             Decimal("450.0"), Decimal("600.0"), 'Active', party_u)

    #         # MOT Document
    #         mot_issue = utcnow() - datetime.timedelta(days=180)
    #         mot_exp = utcnow() + datetime.timedelta(days=185)
    #         cur.execute("""INSERT dbo.VehicleDocument(VehDocId,VehicleId,DocType,IssueDate,UploadedAt,ExpiryDate,FileUrl,Image)
    #                    VALUES(NEWID(),?,?,?,?,?,?,?)""",
    #                 veh_id, 'MOT', mot_issue, utcnow(), mot_exp,
    #                 'https://example.com/mot.pdf', 'https://example.com/mot.png')
            
    #         # Ownership Document
    #         ownership_issue = utcnow() - datetime.timedelta(days=365*2)
    #         ownership_exp = utcnow() + datetime.timedelta(days=365*3)
    #         cur.execute("""INSERT dbo.VehicleDocument(VehDocId,VehicleId,DocType,IssueDate,UploadedAt,ExpiryDate,FileUrl,Image)
    #                    VALUES(NEWID(),?,?,?,?,?,?,?)""",
    #                 veh_id, 'Ownership', ownership_issue, utcnow(), ownership_exp,
    #                 'https://example.com/ownership.pdf', 'https://example.com/ownership.png')
            
    #         # Latest Service Report
    #         service_issue = utcnow() - datetime.timedelta(days=90)
    #         service_exp = utcnow() + datetime.timedelta(days=275)
    #         cur.execute("""INSERT dbo.VehicleDocument(VehDocId,VehicleId,DocType,IssueDate,UploadedAt,ExpiryDate,FileUrl,Image)
    #                    VALUES(NEWID(),?,?,?,?,?,?,?)""",
    #                 veh_id, 'ServiceReport', service_issue, utcnow(), service_exp,
    #                 'https://example.com/service.pdf', 'https://example.com/service.png')
            
    #         # Vehicle Test
    #         cur.execute("INSERT dbo.VehicleTest(TestId,VehicleId,InspectorId,CheckDate,Comments) VALUES(NEWID(), ?, ?, DATEADD(DAY,-20,SYSUTCDATETIME()), N'OK')", veh_id, random.choice(inspector_ids))

    #         # Daily Availability
    #         avail_date = utcnow().date()
    #         cur.execute("""INSERT dbo.VehicleAvailabilityDaily(VehicleId,AvailabilityDate,StartsAt,EndsAt,IsRecurring,UpdatedAt)
    #                        VALUES(?,?,?,?,?,SYSUTCDATETIME())""",
    #                     veh_id, avail_date, "08:00", "18:00", random.choice([0,1]))
            
    #         # Location
    #         cur.execute("""INSERT dbo.VehicleLocationLive(VehicleId,Lat,Lng,UpdatedAt)
    #                        VALUES(?, 34.69, 32.96, SYSUTCDATETIME())""", veh_id)

    #         # Find compatible service/ride type combinations for this vehicle type
    #         vt_name = [k for k, v in vt_ids.items() if v == vt_id][0]
    #         compatible_combos = [(svc_key, rt_key) for svc_key, rt_key, vt, _ in combo_specs if vt == vt_name]
            
    #         # Enrollment (approve by random operator)
    #         if compatible_combos:
    #             svc_key, rt_key = random.choice(compatible_combos)
    #             cur.execute("""INSERT dbo.UserServiceEnrollment(EnrollId,[Status],VehicleId,ServiceType,RideType,ApprovedAt,ApprovedById,UserId)
    #                            VALUES(NEWID(),'Approved', ?, ?, ?, SYSUTCDATETIME(), ?, ?)""",
    #                         veh_id, svc_ids[svc_key], rt_ids[rt_key],
    #                         random.choice(operator_ids), user_id)

    #         vehicle_ids.append(veh_id)

    #     drivers.append((party_u, user_id, vehicle_ids))

    # # Credit cards
    # owner_party_ids = []
    # owner_party_ids += [p_party for (p_party, _u) in passengers]
    # owner_party_ids += [d_party for (d_party, _u, _vehlist) in drivers]
    # owner_party_ids += comp_parties

    # cards = []
    # now = utcnow()
    # cur.fast_executemany = True

    # for owner in owner_party_ids:
    #     # exactly NUM_CREDIT_CARDS_PER_ENTITY per owner
    #     for i in range(NUM_CREDIT_CARDS_PER_ENTITY):
    #         card_id    = guid()
    #         last4      = f"{random.randint(0, 9999):04d}"
    #         exp_month  = random.randint(1, 12)
    #         exp_year   = now.year + random.randint(1, 5)
    #         token      = f"tok_{uuid.uuid4().hex}_{owner.replace('-', '')[:8]}_{i}"
    #         is_default = 1 if i == 0 else 0
    #         is_active  = 1 if i == 0 else random.choice([0, 1])

    #         cards.append((
    #             card_id, owner, last4, token,
    #             exp_month, exp_year, is_default, is_active, now
    #         ))

    # if cards:
    #     cur.executemany("""
    #         INSERT INTO dbo.CreditCard
    #         (CardId, OwnerId, Last4, Token, ExpMonth, ExpYear, IsDefault, IsActive, AddedAt)
    #         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    #     """, cards)

    # # Geofences & Bridges
    # zones = []
    # for i in range(3):
    #     zid = guid()
    #     minlat = 34.65 + i*0.02
    #     minlng = 32.95 + i*0.02
    #     maxlat = minlat + 0.02
    #     maxlng = minlng + 0.03
    #     cur.execute("""INSERT dbo.Geofencezone(ZoneId,MinLat,MinLng,MaxLat,MaxLng,[Name])
    #                    VALUES(?,?,?,?,?,?)""",
    #                 zid, minlat, minlng, maxlat, maxlng, f"Zone {i+1}")
    #     zones.append(zid)

    # # connect consecutive zones with a bridge
    # bridge_ids = []
    # for i in range(len(zones)-1):
    #     bid = guid()
    #     cur.execute("INSERT dbo.Bridge(BridgeId,[Name],FromZone,ToZone) VALUES(?,?,?,?)",
    #                 bid, f"Bridge {i+1}", zones[i], zones[i+1])
    #     bridge_ids.append(bid)

    # # Ride flow: requests -> legs -> dispatch offers -> rides (+payments, messages, rating) ----
    # # choose any profile
    # rp_id = profile_any

    # for i in range(RIDES_TO_CREATE):
    #     p_party, p_user = random.choice(passengers)
    #     d_party, d_user, veh = random.choice(drivers)

    #     # Ride Request
    #     req_id = guid()
    #     start_time = utcnow() - datetime.timedelta(minutes=random.randint(10, 120))
    #     cur.execute("""INSERT dbo.RideRequest(RequestId,PassengerId,NumOfPeople,PickupAt,PickupLat,PickupLng,DropLat,DropLng,
    #                  PickupCountry,PickupRegion,PickupCity,PickupDistrict,PickupPostalCode,
    #                  DropCountry,DropRegion,DropCity,DropDistrict,DropPostalCode,
    #                  CreatedAt,Status,RideProfileId)
    #                  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,SYSUTCDATETIME(),'Pending',?)""",
    #                 req_id, p_user, random.randint(1,2), start_time,
    #                 34.690, 32.960, 34.720, 33.010,
    #                 'Κύπρος','Λευκωσία','Λευκωσία', 'Κέντρο','1010',
    #                 'Κύπρος','Λευκωσία','Λευκωσία', 'Άλλη','1020',
    #                 rp_id)

    #     # Itinerary leg (maybe via first bridge)
    #     leg_id = guid()
    #     via_bid = random.choice(bridge_ids) if bridge_ids else None
    #     cur.execute("INSERT dbo.ItineraryLeg(LegId,SeqNo,ViaBridgeId,RideRequestId) VALUES(?,1,?,?)",
    #                 leg_id, via_bid, req_id)
    #     if via_bid:
    #         cur.execute("INSERT dbo.LegCrossesBridge(ItineraryLeg,Bridge) VALUES(?,?)", leg_id, via_bid)

    #     # Dispatch Offer to DRIVER party
    #     offer_id = guid()
    #     status = random.choice(["Accepted","Sent","Declined"])
    #     cur.execute("""INSERT dbo.DispatchOffer(OfferId,LegId,RecipientPartyId,VehicleId,[Status],SentAt,RespondedAt)
    #                    VALUES(?,?,?, ?, ?, SYSUTCDATETIME(), CASE WHEN ?='Accepted' THEN SYSUTCDATETIME() ELSE NULL END)""",
    #                 offer_id, leg_id, d_party, veh, status, status)

    #     # If accepted, create payment + ride + messages + optional rating
    #     if status == "Accepted":
    #         pay_id = guid()
    #         gross = round(random.uniform(7, 25), 2)
    #         fee   = round(gross * 0.1, 2)
    #         payout= round(gross - fee, 2)
    #         cur.execute("""INSERT dbo.Payment(PaymentId,SenderPartyId,ReceiverPartyId,GrossAmount,OsrhFee,DriverPayout,PaidAt,Method,[Status])
    #                        VALUES(?,?,?,?,?,?,SYSUTCDATETIME(),'CreditCard','Completed')""",
    #                     pay_id, p_party, d_party, gross, fee, payout)

    #         ride_id = guid()
    #         started = start_time + datetime.timedelta(minutes=random.randint(1, 10))
    #         ended   = started + datetime.timedelta(minutes=random.randint(10, 25))
    #         cur.execute("""INSERT dbo.Ride(RideId,OfferId,DriverUserId,PassengerUserId,VehicleId,
    #                        StartedAt,EndedAt,PriceFinal,[Status],Rating,[Payment])
    #                        VALUES(?,?,?,?,?,?,?,?, 'Completed', NULL, ?)""",
    #                     ride_id, offer_id, d_party, p_user, veh, started, ended, gross, pay_id)

    #         # Messages
    #         cur.execute("""INSERT dbo.InAppMessage(MsgId,SenderUserId,RecipientUserId,[Body],SentAt,[Ride])
    #                        VALUES(NEWID(),?,?,N'Φτάνω σε 3 λεπτά',DATEADD(MINUTE,-2,SYSUTCDATETIME()),?)""",
    #                     d_user, p_user, ride_id)
    #         cur.execute("""INSERT dbo.InAppMessage(MsgId,SenderUserId,RecipientUserId,[Body],SentAt,[Ride])
    #                        VALUES(NEWID(),?,?,N'ΟΚ, είμαι στο σημείο',DATEADD(MINUTE,-1,SYSUTCDATETIME()),?)""",
    #                     p_user, d_user, ride_id)

    #         # Sometimes a rating
    #         if random.random() < 0.6:
    #             rating_id = guid()
    #             stars = random.randint(4,5) if random.random() < 0.7 else random.randint(2,3)
    #             cur.execute("""INSERT dbo.Rating(RatingId,AuthorUserId,TargetUserId,Stars,Comment,CreatedAt)
    #                            VALUES(?,?,?,?,?,SYSUTCDATETIME())""",
    #                         rating_id, p_user, d_user, stars, "Ευχάριστη διαδρομή")
    #             cur.execute("UPDATE dbo.Ride SET Rating=? WHERE RideId=?", rating_id, ride_id)

    cn.commit()
    end_time = datetime.datetime.now()
    print("✅ Seed completed in " + str(end_time - start_time))

