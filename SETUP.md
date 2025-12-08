# Quick Start Guide

## Prerequisites

1. **Install Node.js** (v18 or higher)
   - Download from: https://nodejs.org/

2. **Install PostgreSQL** (v14 or higher)
   - Download from: https://www.postgresql.org/download/

## Setup Steps

### 1. Install Dependencies
```powershell
npm install
```

### 2. Configure Environment Variables
Edit `.env` file and add:
- Your PostgreSQL password for `DB_PASSWORD`
- Your OpenGov API key for `OPENGOV_API_KEY` (get from https://data.gov.in)

### 3. Create Database
```powershell
# Using psql command
psql -U postgres -c "CREATE DATABASE agrimatrix_prices;"

# Or use pgAdmin GUI
```

### 4. Run Database Migration
```powershell
npm run migrate
```

You should see:
```
✅ Database schema created successfully!
📊 Tables created: states, districts, markets, commodities, daily_prices, sync_logs
```

### 5. Test API Connection (Optional)
Create a test file to verify OpenGov API access:
```javascript
// test-api.js
const opengovClient = require('./src/services/opengov-client');
opengovClient.testConnection();
```

### 6. Fetch Initial Data
Run manual data fetch:
```powershell
npm run scheduler
```

This will:
- Fetch all current mandi prices from OpenGov API
- Insert into database (4000+ records typically)
- Create sync logs

### 7. Start the Server
```powershell
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server starts at: http://localhost:3000

### 8. Test API Endpoints

**Health Check:**
```
http://localhost:3000/health
```

**Latest Prices:**
```
http://localhost:3000/api/prices/latest?state=Gujarat
http://localhost:3000/api/prices/latest?commodity=Tomato
```

**Markets:**
```
http://localhost:3000/api/markets
http://localhost:3000/api/markets/states
```

**Sync Status:**
```
http://localhost:3000/api/sync/status
```

## Enable Automatic Daily Updates

Edit `.env`:
```
START_SCHEDULER=true
```

This enables the cron job to fetch data daily at 6:00 AM IST automatically.

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running: `psql -U postgres -c "SELECT version();"`
- Check credentials in `.env` file
- Ensure database `agrimatrix_prices` exists

### API Key Error
- Get valid API key from https://data.gov.in
- Add to `.env` file: `OPENGOV_API_KEY=your_key_here`

### Port Already in Use
- Change `PORT` in `.env` file to another port (e.g., 3001)

## Next Steps

- Add frontend UI for farmers to view prices
- Set up monitoring and alerts
- Configure backup strategy for database
- Deploy to production server (AWS, Azure, DigitalOcean, etc.)
