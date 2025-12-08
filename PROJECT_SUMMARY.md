# Mandi Price Tracker - Complete System

## ✅ What Has Been Built

### 1. **Backend API (Node.js + Express)**
- RESTful API with comprehensive endpoints for:
  - Latest price queries with multiple filters
  - Market and commodity master data
  - Historical price data and statistics
  - Data synchronization status and controls

### 2. **Database Schema (PostgreSQL)**
- Normalized relational database with:
  - States, Districts, Markets (location hierarchy)
  - Commodities with variety and grade
  - Daily prices with unique constraints
  - Sync logs for audit trail
- Optimized indexes for fast queries
- Views and functions for latest price retrieval

### 3. **OpenGov API Integration**
- Robust HTTP client with retry logic
- Automatic error handling
- Date parsing (DD/MM/YYYY → YYYY-MM-DD)
- Metadata extraction and logging

### 4. **Data Ingestion Pipeline**
- ETL (Extract, Transform, Load) process
- Duplicate prevention via unique constraints
- Normalized data insertion
- Comprehensive error tracking

### 5. **Automated Scheduler**
- Daily cron job (default: 6 AM IST)
- Configurable schedule via environment variables
- Manual trigger support via API
- Background execution with logging

### 6. **Frontend Dashboard**
- Responsive HTML5 interface
- Real-time statistics display
- Advanced filtering (state, district, market, commodity)
- Clean, modern UI with data tables

### 7. **Configuration & Logging**
- Environment-based configuration (.env)
- Multi-level logging (info, error)
- Separate log files for different operations
- Winston logger integration

---

## 📁 Project Structure

```
mandi prices/
├── src/
│   ├── config/
│   │   ├── config.js           # Configuration loader
│   │   └── database.js         # PostgreSQL connection pool
│   ├── database/
│   │   ├── schema.sql          # Database schema
│   │   └── migrate.js          # Migration runner
│   ├── services/
│   │   ├── opengov-client.js   # API client
│   │   └── data-ingestion.js   # ETL pipeline
│   ├── routes/
│   │   ├── prices.js           # Price endpoints
│   │   ├── markets.js          # Market endpoints
│   │   ├── commodities.js      # Commodity endpoints
│   │   └── sync.js             # Sync control endpoints
│   ├── schedulers/
│   │   └── daily-fetch.js      # Cron job scheduler
│   ├── utils/
│   │   └── logger.js           # Logging utility
│   └── server.js               # Express server
├── public/
│   └── index.html              # Frontend dashboard
├── logs/                       # Application logs (created at runtime)
├── .env                        # Environment variables
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies
├── README.md                   # Main documentation
├── SETUP.md                    # Setup instructions
├── API_DOCS.md                 # API documentation
└── hello.json                  # Sample API response
```

---

## 🚀 Quick Start Commands

### Install Dependencies
```powershell
npm install
```

### Setup Database
```powershell
# Create database
psql -U postgres -c "CREATE DATABASE agrimatrix_prices;"

# Run migrations
npm run migrate
```

### Configure Environment
Edit `.env` file:
- Add PostgreSQL password
- Add OpenGov API key

### Fetch Initial Data
```powershell
npm run scheduler
```

### Start Server
```powershell
# Development
npm run dev

# Production
npm start
```

### Access Dashboard
Open browser: http://localhost:3000

---

## 🎯 Key Features

### Duplicate Prevention
- Unique constraint on (market_id, commodity_id, arrival_date)
- ON CONFLICT DO NOTHING ensures no duplicates
- Skipped records are logged in sync_logs

### Latest Data Guarantee
- Subquery ensures only most recent prices returned
- Indexed by arrival_date for performance
- View `latest_prices_view` for convenience

### Automated Updates
- Cron schedule: `0 6 * * *` (6 AM daily)
- Configurable via FETCH_SCHEDULE in .env
- Manual trigger available via API

### Data Freshness
- API metadata tracked (updated_date)
- Sync logs maintain audit trail
- Stats endpoint shows latest data date

---

## 📊 API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/prices/latest` | GET | Latest prices with filters |
| `/api/prices/commodity/:name` | GET | Prices for specific commodity |
| `/api/prices/history` | GET | Historical price data |
| `/api/prices/stats` | GET | Price statistics |
| `/api/markets` | GET | All markets |
| `/api/markets/states` | GET | All states |
| `/api/markets/districts` | GET | All districts |
| `/api/commodities` | GET | All commodities |
| `/api/commodities/names` | GET | Unique commodity names |
| `/api/sync/status` | GET | Sync status and history |
| `/api/sync/trigger` | POST | Manual data sync |
| `/api/sync/stats` | GET | Database statistics |
| `/health` | GET | Server health check |

See `API_DOCS.md` for detailed documentation.

---

## 🔧 Configuration Options

### Database (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agrimatrix_prices
DB_USER=postgres
DB_PASSWORD=your_password
```

### API (.env)
```
OPENGOV_API_URL=https://api.data.gov.in/resource/...
OPENGOV_API_KEY=your_api_key
```

### Server (.env)
```
PORT=3000
NODE_ENV=development
START_SCHEDULER=true
```

### Scheduler (.env)
```
FETCH_SCHEDULE=0 6 * * *
```

Cron format: `minute hour day month weekday`

Examples:
- `0 6 * * *` - 6:00 AM daily
- `30 7 * * *` - 7:30 AM daily
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Midnight every Sunday

---

## 📈 Database Schema Details

### Tables
1. **states** - 28+ Indian states
2. **districts** - 450+ districts
3. **markets** - 2500+ mandis/markets
4. **commodities** - 200+ commodity variants
5. **daily_prices** - Daily price records (50K+ records)
6. **sync_logs** - Data sync audit trail

### Key Relationships
- State → District → Market (1:N:N hierarchy)
- Market + Commodity + Date → Daily Price (unique)

### Indexes
- arrival_date (DESC) for latest data
- market_id, commodity_id for joins
- Composite index on (market_id, commodity_id, arrival_date)

---

## 🛡️ Data Quality

### Validation
- Date parsing with error handling
- Price validation (numeric)
- Required field checks
- Duplicate detection

### Error Handling
- API retry logic (3 attempts)
- Database transaction rollback
- Comprehensive error logging
- Failed record tracking

### Audit Trail
- Every sync logged with statistics
- Error messages captured
- Duration tracking
- API metadata stored

---

## 🔄 Data Flow

1. **Scheduled Trigger** (6 AM daily)
   ↓
2. **OpenGov API Fetch** (4000+ records)
   ↓
3. **Data Validation** (date parsing, field checks)
   ↓
4. **Normalization** (create/get states, districts, markets, commodities)
   ↓
5. **Price Insertion** (with duplicate check)
   ↓
6. **Sync Logging** (statistics and status)
   ↓
7. **API Response** (latest prices served to users)

---

## 📦 Dependencies

### Core
- `express` - Web framework
- `pg` - PostgreSQL client
- `axios` - HTTP client
- `node-cron` - Task scheduler

### Utilities
- `dotenv` - Environment configuration
- `winston` - Logging
- `cors` - Cross-origin requests

---

## 🚀 Deployment Considerations

### Production Checklist
- [ ] Set NODE_ENV=production
- [ ] Configure production database
- [ ] Add proper API key
- [ ] Enable START_SCHEDULER=true
- [ ] Set up monitoring (PM2, New Relic)
- [ ] Configure log rotation
- [ ] Set up database backups
- [ ] Add rate limiting
- [ ] Configure CORS properly
- [ ] Set up SSL/TLS
- [ ] Add authentication if needed

### Scaling
- Database indexing is already optimized
- Consider caching for frequent queries
- Use connection pooling (already configured)
- Add read replicas for heavy traffic
- Consider CDN for static assets

---

## 📝 Next Steps

### Immediate
1. Add your PostgreSQL password to `.env`
2. Get OpenGov API key and add to `.env`
3. Run `npm run migrate` to setup database
4. Run `npm run scheduler` to fetch initial data
5. Start server with `npm run dev`

### Enhancements
- Add user authentication
- Implement caching (Redis)
- Add data visualization charts
- Create mobile app
- Add price alerts/notifications
- Implement data export (CSV, Excel)
- Add more analytics features

---

## 🆘 Troubleshooting

### Common Issues

**Database Connection Error**
```
Error: password authentication failed
```
Solution: Check DB_PASSWORD in .env

**API Key Error**
```
Error: 401 Unauthorized
```
Solution: Add valid OPENGOV_API_KEY to .env

**Port Already in Use**
```
Error: EADDRINUSE: address already in use
```
Solution: Change PORT in .env or kill existing process

**No Data Returned**
```
No results found
```
Solution: Run `npm run scheduler` to fetch initial data

---

## 📄 License

MIT License - Feel free to use and modify for your needs.

---

## 👨‍💻 Support

For issues or questions:
1. Check SETUP.md for setup instructions
2. Review API_DOCS.md for API usage
3. Check logs in `logs/` directory
4. Review database with psql commands

---

Built with ❤️ for Indian farmers and agricultural market transparency.
