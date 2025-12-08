# 🚀 Getting Started with Mandi Price Tracker

This guide will walk you through setting up and running the Mandi Price Tracker system in 10 minutes.

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ installed ([Download](https://nodejs.org/))
- ✅ PostgreSQL 14+ installed ([Download](https://www.postgresql.org/download/))
- ✅ OpenGov API key ([Get one](https://data.gov.in))

---

## Step-by-Step Setup

### Step 1: Install Dependencies ⏱️ 1 min

Open PowerShell in the project directory and run:

```powershell
npm install
```

Wait for all packages to install (about 400+ packages).

---

### Step 2: Create Database ⏱️ 1 min

Open a new PowerShell window and create the database:

```powershell
# Option A: Using psql command
psql -U postgres -c "CREATE DATABASE agrimatrix_prices;"

# Option B: Using pgAdmin
# 1. Open pgAdmin
# 2. Right-click on Databases
# 3. Create → Database
# 4. Name: agrimatrix_prices
# 5. Click Save
```

---

### Step 3: Configure Environment ⏱️ 2 min

1. Open the `.env` file in your code editor

2. Update these values:

```env
# Add your PostgreSQL password
DB_PASSWORD=your_postgres_password_here

# Add your OpenGov API key
OPENGOV_API_KEY=your_api_key_here
```

3. Save the file

**Where to get API key?**
- Visit https://data.gov.in
- Register/Login
- Navigate to API section
- Request API access for the Mandi dataset

---

### Step 4: Run Database Migration ⏱️ 30 seconds

```powershell
npm run migrate
```

You should see:
```
✅ Database schema created successfully!
📊 Tables created:
   - states
   - districts
   - markets
   - commodities
   - daily_prices
   - sync_logs
```

---

### Step 5: Test Database Connection (Optional) ⏱️ 30 seconds

```powershell
npm run test:db
```

Expected output:
```
🔍 Testing Database Connection...
✅ Database connected successfully!
Database Tables:
  ✓ states
  ✓ districts
  ✓ markets
  ✓ commodities
  ✓ daily_prices
  ✓ sync_logs
```

---

### Step 6: Test API Connection (Optional) ⏱️ 30 seconds

```powershell
npm run test:api
```

Expected output:
```
🔍 Testing OpenGov API Connection...
✅ API connection successful!
✅ Data fetch successful!
Total Records: 4832
```

---

### Step 7: Fetch Initial Data ⏱️ 2-3 min

```powershell
npm run scheduler
```

This will:
1. Fetch 4000+ records from OpenGov API
2. Parse and validate the data
3. Insert into database (normalized)
4. Skip any duplicates
5. Log the sync operation

Expected output:
```
Starting scheduled data fetch...
Fetching data from OpenGov API...
Successfully fetched 4832 records from API
Starting ingestion of 4832 records
Ingestion completed
  total: 4832
  inserted: 4832
  skipped: 0
  errors: 0
```

---

### Step 8: Start the Server ⏱️ 10 seconds

```powershell
npm run dev
```

Expected output:
```
🚀 Server started on port 3000
Environment: development
API Base URL: http://localhost:3000
```

---

### Step 9: Test the System ⏱️ 1 min

**Open your browser and visit:**

1. **Dashboard** (Frontend UI)
   ```
   http://localhost:3000
   ```
   You should see a beautiful dashboard with statistics and price data.

2. **API Endpoints** (Test these in browser or Postman)
   
   - Health Check:
     ```
     http://localhost:3000/health
     ```
   
   - Latest Prices:
     ```
     http://localhost:3000/api/prices/latest?limit=10
     ```
   
   - Filter by State:
     ```
     http://localhost:3000/api/prices/latest?state=Gujarat
     ```
   
   - Filter by Commodity:
     ```
     http://localhost:3000/api/prices/latest?commodity=Tomato
     ```
   
   - Sync Status:
     ```
     http://localhost:3000/api/sync/status
     ```
   
   - Database Stats:
     ```
     http://localhost:3000/api/sync/stats
     ```

---

### Step 10: Enable Auto-Updates (Optional) ⏱️ 30 seconds

To enable automatic daily data fetching at 6 AM:

1. Edit `.env` file:
   ```env
   START_SCHEDULER=true
   ```

2. Restart the server:
   ```powershell
   # Press Ctrl+C to stop
   npm run dev
   ```

Now the system will automatically fetch fresh data every day at 6 AM IST!

---

## 🎉 Congratulations!

Your Mandi Price Tracker is now fully operational!

### What You Have Now:

✅ Complete backend API with 10+ endpoints  
✅ PostgreSQL database with 6 normalized tables  
✅ 4000+ daily mandi price records  
✅ Automated daily data sync scheduler  
✅ Beautiful web dashboard  
✅ Comprehensive logging system  
✅ Duplicate prevention mechanism  
✅ Latest price guarantee  

---

## 📱 Using the Dashboard

1. **View Statistics** - See total records, markets, commodities at the top

2. **Filter Prices** - Use the filter boxes to search:
   - By State: "Gujarat", "Tamil Nadu", etc.
   - By District: "Surat", "Coimbatore", etc.
   - By Market: "Surat APMC", etc.
   - By Commodity: "Tomato", "Potato", etc.

3. **View Results** - Prices displayed in a clean table with:
   - Location details
   - Commodity info
   - Min, Max, and Modal prices
   - Arrival date

---

## 🔄 Daily Workflow

The system runs automatically, but you can also:

### Manual Data Sync
```powershell
npm run scheduler
```

### Trigger via API
```powershell
curl -X POST http://localhost:3000/api/sync/trigger
```

### Check Sync Status
Visit: http://localhost:3000/api/sync/status

---

## 🛠️ Customization

### Change Scheduler Time

Edit `.env`:
```env
# Run at 7:30 AM instead of 6:00 AM
FETCH_SCHEDULE=30 7 * * *

# Run every 6 hours
FETCH_SCHEDULE=0 */6 * * *

# Run at midnight
FETCH_SCHEDULE=0 0 * * *
```

### Change Server Port

Edit `.env`:
```env
PORT=8080
```

---

## 📊 Sample API Calls

### Get All Markets in Gujarat
```
GET http://localhost:3000/api/markets?state=Gujarat
```

### Get Tomato Prices
```
GET http://localhost:3000/api/prices/commodity/Tomato
```

### Get Price History
```
GET http://localhost:3000/api/prices/history?market=Surat APMC&commodity=Tomato&days=30
```

### Get Commodity Statistics
```
GET http://localhost:3000/api/prices/stats?commodity=Potato&days=30
```

### Get All States
```
GET http://localhost:3000/api/markets/states
```

### Get All Commodities
```
GET http://localhost:3000/api/commodities/names
```

---

## 🔍 Troubleshooting

### Issue: "Database connection failed"
**Solution:**
```powershell
# Check if PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Verify database exists
psql -U postgres -c "\l" | findstr agrimatrix
```

### Issue: "API key invalid"
**Solution:**
- Get valid API key from https://data.gov.in
- Update `OPENGOV_API_KEY` in `.env`
- Restart server

### Issue: "No data found"
**Solution:**
```powershell
# Run the scheduler to fetch data
npm run scheduler
```

### Issue: "Port 3000 already in use"
**Solution:**
- Change PORT in `.env` to 3001 or another port
- Or kill the existing process

### Issue: "Module not found"
**Solution:**
```powershell
# Reinstall dependencies
Remove-Item node_modules -Recurse -Force
npm install
```

---

## 📚 Documentation

- **API Documentation**: See `API_DOCS.md`
- **Project Overview**: See `PROJECT_SUMMARY.md`
- **Setup Details**: See `SETUP.md`
- **Main README**: See `README.md`

---

## 🚀 Next Steps

### For Development:
1. Add user authentication
2. Implement caching (Redis)
3. Add data visualization charts
4. Create mobile app API
5. Add price alerts via email/SMS

### For Production:
1. Set up on cloud server (AWS, Azure, DigitalOcean)
2. Configure domain name
3. Add SSL certificate
4. Set up monitoring (PM2, New Relic)
5. Configure database backups
6. Add rate limiting
7. Implement user management

---

## 💡 Tips

- Check logs in `logs/` directory for debugging
- Use `npm run dev` for development (auto-restart)
- Use `npm start` for production
- Keep `.env` file secure and never commit it to Git
- Run database backups regularly

---

## 🆘 Need Help?

1. **Check the logs**: `logs/combined.log` and `logs/error.log`
2. **Test database**: `npm run test:db`
3. **Test API**: `npm run test:api`
4. **Check sync status**: Visit http://localhost:3000/api/sync/status
5. **Review documentation**: All `.md` files in the project

---

## 📞 Support

For issues or questions:
- Review documentation files
- Check application logs
- Test individual components
- Verify environment configuration

---

**Enjoy using Mandi Price Tracker! 🌾**

Built with ❤️ for Indian farmers and agricultural market transparency.
