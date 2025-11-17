import os
import pyodbc
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

SERVER = os.getenv("DB_HOST", "YOUR_SERVER") + ",1433"
DB_NAME = os.getenv("DB_NAME", "YOUR_DB")
PASSWORD = os.getenv("DB_PASS", "YOUR_PASSWORD")

SQL_DIR = Path("seed_sql")

EXECUTION_ORDER = [
    # 1. Independent tables
    "Admin.sql",
    "Ridetype.sql",
    "Servicetype.sql",
    "VehicleType.sql",
    "Geofencezone.sql",
    
    # 2. Tables depending on Admin
    "Operator.sql",
    "Inspector.sql",
    
    # 3. User and related tables
    "User.sql",
    "UserPreferences.sql",
    "Passenger.sql",
    "Driver.sql",
    "CompanyRepresentative.sql",
    "PersonDocument.sql",
    
    # 4. Vehicle-related tables (depend on User and VehicleType)
    "Vehicle.sql",
    "VehicleDocument.sql",
    "VehicleTest.sql",
    "VehicleLocationLive.sql",
    
    # 5. Service configuration tables
    "AllowedRideProfile.sql",
    
    # 6. Enrollment and availability
    "UserServiceEnrollment.sql",
    "DriverAvailability.sql",
    
    # 7. Bridge (depends on Geofencezone)
    "Bridge.sql",
    
    # 8. Ride request flow
    "RideRequest.sql",
    "ItineraryLeg.sql",
    "LegCrossesBridge.sql",
    "DispatchOffer.sql",
    
    # 9. Payment and Rating (independent of Ride initially)
    "Payment.sql",
    "Rating.sql",
    
    # 10. Ride (depends on DispatchOffer, Payment, Rating)
    "Ride.sql",
    
    # 11. Messages (depend on Ride)
    "InAppMessage.sql",
]

def get_connection():
    """Create and return a database connection"""
    cn_str = (
        "Driver={ODBC Driver 18 for SQL Server};"
        f"Server={SERVER};Database={DB_NAME};UID={DB_NAME};PWD={PASSWORD};"
        "Encrypt=yes;TrustServerCertificate=yes"
    )
    return pyodbc.connect(cn_str)

def read_sql_file(filepath):
    """Read SQL file and return its contents"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def execute_sql_batch(cursor, sql_content, filename):
    # Split by GO statements (case insensitive)
    batches = []
    current_batch = []
    
    for line in sql_content.split('\n'):
        stripped = line.strip().upper()
        if stripped == 'GO' or stripped.startswith('GO '):
            if current_batch:
                batches.append('\n'.join(current_batch))
                current_batch = []
        else:
            current_batch.append(line)
    
    # Add remaining batch
    if current_batch:
        batches.append('\n'.join(current_batch))
    
    # Execute each batch
    executed = 0
    for i, batch in enumerate(batches):
        batch = batch.strip()
        if not batch or batch.startswith('--'):
            continue
        
        try:
            cursor.execute(batch)
            executed += 1
        except Exception as e:
            print(f"   ⚠️  Error in batch {i+1}: {str(e)[:100]}")
            # Continue with next batch instead of failing completely
            continue
    
    return executed

def import_sql_files():
    """Main function to import all SQL files in order"""
    
    # Check if SQL directory exists
    if not SQL_DIR.exists():
        print(f"❌ Directory {SQL_DIR} does not exist!")
        return
    
    # Get list of available SQL files
    available_files = {f.name for f in SQL_DIR.glob("*.sql")}
    
    # Verify all files in execution order exist
    missing_files = [f for f in EXECUTION_ORDER if f not in available_files]
    if missing_files:
        print(f"⚠️  Warning: The following files are in EXECUTION_ORDER but not found:")
        for f in missing_files:
            print(f"   - {f}")
        print()
    
    # Warn about files not in execution order
    extra_files = available_files - set(EXECUTION_ORDER)
    if extra_files:
        print(f"⚠️  Warning: The following SQL files exist but are NOT in EXECUTION_ORDER:")
        for f in extra_files:
            print(f"   - {f}")
        print("   These files will be SKIPPED.\n")
    
    # Connect to database
    print(f"📊 Connecting to database: {DB_NAME}...")
    try:
        conn = get_connection()
        cursor = conn.cursor()
        print("✅ Connected successfully\n")
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return
    
    # Execute files in order
    total_files = 0
    total_batches = 0
    failed_files = []
    
    print("=" * 70)
    print("STARTING SQL IMPORT")
    print("=" * 70)
    
    try:
        for i, filename in enumerate(EXECUTION_ORDER, 1):
            filepath = SQL_DIR / filename
            
            if not filepath.exists():
                print(f"{i:2d}. ⏭️  SKIP: {filename} (file not found)")
                continue
            
            print(f"{i:2d}. 📄 Executing: {filename}...", end=" ")
            
            try:
                sql_content = read_sql_file(filepath)
                
                # Execute the SQL
                batches = execute_sql_batch(cursor, sql_content, filename)
                
                # Commit after each file
                conn.commit()
                
                total_files += 1
                total_batches += batches
                print(f"✅ ({batches} batches)")
                
            except Exception as e:
                conn.rollback()
                failed_files.append((filename, str(e)))
                print(f"❌ FAILED: {str(e)[:100]}")
        
        print("\n" + "=" * 70)
        print("IMPORT COMPLETE")
        print("=" * 70)
        print(f"✅ Successfully executed: {total_files} files ({total_batches} batches)")
        
        if failed_files:
            print(f"❌ Failed files: {len(failed_files)}")
            for fname, error in failed_files:
                print(f"   - {fname}: {error[:80]}")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Import interrupted by user")
        conn.rollback()
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
        print("\n🔌 Database connection closed")

if __name__ == "__main__":
    import_sql_files()