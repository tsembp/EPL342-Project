# **One-Stop Ride-Hail (OSRH) – Database Systems Project**

**EPL342 – University of Cyprus**
**Team Project – Phase B Implementation**

This project implements the backend database system and a simple web interface for **OSRH (One-Stop Ride-Hail)**, a next-generation ride-hailing & logistics platform as defined in the official course specifications.
All business logic, validation, routing logic, dynamic pricing, dispatch workflows, reports, and data transformations are implemented **entirely inside Microsoft SQL Server 2022** (functions, stored procedures, triggers, views).

The backend (**Flask**) acts strictly as a **thin API wrapper** to expose SQL features to the frontend.
No backend-side processing is done — only parameter extraction, validation, and forwarding to the appropriate stored procedure.

The frontend is implemented in **React + TypeScript**, providing the operator, inspector, driver, and passenger user flows.

A Python seeding pipeline generates synthetic data (thousands of users, drivers, vehicles, ride requests, legs, dispatch offers, rides, payments, documents) in accordance with project requirements.


## **Tech Stack**

### **Database**

* **Microsoft SQL Server 2022**
* Hosted locally through **Podman** on Fedora Linux
* Heavy use of:

  * Stored Procedures
  * Functions
  * Views
  * Triggers
  * Custom indexing
  * Referential actions
* Schema and logic follow the EPL342 project specification 

### **Backend**

* **Python 3 + Flask API**
* Backend job:

  * Accept request body / query params
  * Call corresponding SQL stored procedure
  * Return results (JSON)
* *No business logic in Python.*

### **Frontend**

* **React + TypeScript**
* Provides:

  * Operator dashboard (analytics reports, documents & enrollments approvals, service & ride types addition)
  * Inspector workflows (vehicle tests)
  * Driver & Passenger flows (documents, availability, ride requests)
  * Admin dashboard (approve new Operators)

### **Data Generation**

* Python seeder scripts:

  * Generate thousands of entities
  * Insert bulk data efficiently
  * Ensure valid documents, vehicles, ride requests, dispatch flows


# **Project Structure**

```bash
EPL342-Project/
├── data/
│   └── ...                 # Synthetic dataset inputs (zones, bridges, etc.)
├── sources/
│   ├── backend/
│   │   └── ...             # Flask API source code
│   ├── frontend/
│   │   └── ...             # React + TypeScript frontend
│   ├── point_seeder.py
│   ├── run_all_sql.py      # Script that creates all sprocs, triggers etc.
│   └── seeder.py           # Main DB data seeding script
├── sql/                    # SQL scripts
│   ├── functions/
│   ├── indexes/
│   ├── reports/
│   ├── sproc/
│   ├── triggers/
│   └── views/
│   │
│   ├── availability_change.sql
│   ├── create_test_rides_offers.sql
│   ├── DB_definition.sql   # Full schema
│   ├── deploy_role_based_restrictions.sql
│   ├── driver_photo.sql
│   ├── gdpr_alter.sql
│   ├── vehicle_image_types_migration.sql
│   ├── vehicle_pricing_migration.sql
│   └── with_check_no_check.sql
│
├── .env
├── .gitignore
├── README.md
├── Referential_Actions.md
└── requirements.txt
```


# **Backend Architecture (Flask API)**

The backend is intentionally minimal.
Responsibilities:

### ✔ Extract request arguments

### ✔ Forward them to SQL Server stored procedures

### ✔ Return SQL results as JSON

### ✘ No business logic

### ✘ No data manipulation outside SQL

Example flow:

```
HTTP Request → Flask → Call sproc → ResultSet → JSON → Frontend
```


# **Database Architecture**

### **Implemented SQL Components**

* **DB Definition** (tables, PK/FK, constraints)
* **Stored Procedures**

  * User signup/login
  * Document submission & review
  * Vehicle registration and compliance
  * Route generation with intermediate legs
  * Dispatch offer creation
  * Ride acceptance workflow
  * Payments, ratings, messaging
  * Full reporting module
* **Triggers**

  * GDPR right-to-be-forgotten logging
  * Document state changes
* **Functions**

  * Price calculation
  * Distance / geofence checking
* **Views**

  * Reporting views and sprocs

### **Indexing**

We implemented indexing based on expected bottlenecks, query frequency, and join patterns.
Indexes were added only after query-plan analysis to meet the <1s execution rule for 10k rows.


# **Frontend Architecture (React + TypeScript)**

Simple interface offering:

### **Operator**

* Document review (driver & vehicle)
* User enrollment management
* GDPR requests
* Reporting dashboards

### **Driver**

* Document upload
* Vehicle management
* Availability scheduling
* Ride acceptance

### **Passenger**

* Ride request creation
* Multi-segment route selection
* Payment & rating

### **Inspector**

* Vehicle technical tests

### **Admin**

* Validate new Operator accounts


# **Data Seeding (Python)**

The `seeder.py` file generates:

* Thousands of users (Operators, Inspectors, Drivers, Company Reps, Passengers)
* Vehicles (with photos, documents, compliance)
* Driver documents
* Availability slots
* Ride Requests
* Itinerary Legs
* Dispatch Offers (ensuring at least one per leg)
* Rides
* Payments
* Ratings
* Messaging examples

Helpers:

* `point_seeder.py` → zone/bridge seeding
* `run_all_sql.py` → sequential DB deployment


# **Running the Project**

### **1. Start SQL Server (Podman – Fedora)**

```bash
podman run -e "ACCEPT_EULA=Y" \
  -e "SA_PASSWORD=Password123!" \
  -p 1433:1433 \
  --name mssql \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

### **2. Install Python dependencies**

```bash
pip install -r requirements.txt
```

### **3. Deploy the database**


```bash
python sources/run_all_sql.py
```

### **4. Seed the database**

```bash
python sources/point_seeder.py
python sources/seeder.py
```

### **5. Run the Flask backend**

```bash
python sources/backend/app.py
```

### **6. Run the React frontend**

```bash
cd sources/frontend
npm install
npm run dev
```


# **Credits**

This implementation follows the full specifications of the official EPL342 Database Systems course assignment.
Project structure complies with required deliverables: sources/, sql/, data/, doc/.


# Contributors
[Panagiotis Tsembekis](https://github.com/tsembp) | [Spyros Gavriil](https://github.com/sgavriil01/) | [Andreas Evagorou](https://github.com/AndreasEv)
