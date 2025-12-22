import requests
import psycopg2
import os
from datetime import date, timedelta
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# -----------------------------
# CONFIG
# -----------------------------
API_URL = os.getenv("OPENGOV_API_URL")
API_KEY = os.getenv("OPENGOV_API_KEY")

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", 5432),
    "dbname": os.getenv("DB_NAME", "agrimatrix_prices"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD"),
}

# -----------------------------
# TEST 1: API HEALTH CHECK
# -----------------------------
def test_api():
    print("\n🔍 Testing Government API...")
    try:
        r = requests.get(API_URL, params={
            "api-key": API_KEY,
            "format": "json",
            "limit": 5
        }, timeout=120)  # Increased to 120 seconds

        if r.status_code == 200 and "records" in r.json():
            print("✅ API is reachable")
            print(f"📦 Sample records received: {len(r.json()['records'])}")
        else:
            print("❌ API test failed")
    except requests.exceptions.Timeout:
        print("⚠️ API timeout - server may be slow or unreachable")
    except Exception as e:
        print(f"❌ API error: {str(e)}")

# -----------------------------
# TEST 2: DATABASE CONNECTION
# -----------------------------
def get_db_connection():
    print("\n🔍 Testing database connection...")
    conn = psycopg2.connect(**DB_CONFIG)
    print("✅ Database connected")
    return conn

# -----------------------------
# TEST 3: CHECK DATA COUNT
# -----------------------------
def test_data_count(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM daily_prices;")
        count = cur.fetchone()[0]
        print(f"📊 Total records in daily_prices: {count}")

# -----------------------------
# TEST 4: CHECK LATEST DATES
# -----------------------------
def test_latest_dates(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT arrival_date
            FROM daily_prices
            ORDER BY arrival_date DESC
            LIMIT 5;
        """)
        rows = cur.fetchall()
        print("\n📅 Latest dates in DB:")
        for r in rows:
            print("   ", r[0])

# -----------------------------
# TEST 5: LAST 7 DAYS FOR JAIPUR
# -----------------------------
def test_jaipur_last_15_days(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT dp.arrival_date, c.name, dp.modal_price
            FROM daily_prices dp
            JOIN markets m ON dp.market_id = m.id
            JOIN commodities c ON dp.commodity_id = c.id
            WHERE m.name ILIKE '%jaipur%'
              AND dp.arrival_date >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY dp.arrival_date;
        """)
        rows = cur.fetchall()

        print("\n📍 Jaipur Mandi - Last 7 days:")
        if not rows:
            print("⚠️ No data found (possible API gap)")
        else:
            for r in rows:
                print(f"   {r[0]} | {r[1]} | ₹{r[2]}")

# -----------------------------
# MAIN RUNNER
# -----------------------------
if __name__ == "__main__":
    print("🚦 STARTING FULL PIPELINE TEST")

    test_api()
    conn = get_db_connection()
    test_data_count(conn)
    test_latest_dates(conn)
    test_jaipur_last_15_days(conn)

    conn.close()
    print("\n✅ PIPELINE TEST COMPLETED")
