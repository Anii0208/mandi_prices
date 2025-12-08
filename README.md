# Mandi Price Tracker

Automated system to fetch and manage daily agricultural commodity prices from OpenGov Data API across all states, districts, and markets in India.

## Features

- 🔄 **Automated Daily Data Fetch** - Scheduled data synchronization from OpenGov API
- 🚫 **Duplicate Prevention** - Intelligent detection to avoid storing duplicate price records
- 📊 **Latest Price Queries** - Fast API endpoints to retrieve most recent market rates
- 🗂️ **Normalized Database** - Efficient storage with proper indexing for quick queries
- 📝 **Comprehensive Logging** - Track all data sync operations and errors

## Architecture

```
├── src/
│   ├── config/         # Configuration management
│   ├── database/       # Database connection, migrations, models
│   ├── services/       # Business logic (API client, data ingestion)
│   ├── routes/         # REST API endpoints
│   ├── schedulers/     # Automated cron jobs
│   ├── utils/          # Helper functions and logger
│   └── server.js       # Express server entry point
└── logs/               # Application logs
```

## Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your database credentials and API key

5. Create the database:
   ```bash
   createdb agrimatrix_prices
   ```

6. Run migrations:
   ```bash
   npm run migrate
   ```

### Running the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**Run scheduler manually:**
```bash
npm run scheduler
```

## API Endpoints

### Get Latest Prices
```
GET /api/prices/latest?state=Gujarat&district=Surat&commodity=Tomato
```

### Get Specific Commodity Prices
```
GET /api/prices/commodity/:commodityName
```

### Get All Markets
```
GET /api/markets
```

### Get Data Sync Status
```
GET /api/sync/status
```

## Database Schema

- **states** - State master data
- **districts** - District information with state reference
- **markets** - Market/Mandi details with location
- **commodities** - Commodity types with variety and grade
- **daily_prices** - Daily price records (min, max, modal) with unique constraints

## Scheduled Tasks

The system runs a daily cron job (default: 6:00 AM) to:
1. Fetch latest data from OpenGov API
2. Parse and validate records
3. Normalize and insert into database
4. Skip duplicates automatically
5. Log sync statistics

## Data Source

Data is fetched from the official OpenGov Data API:
- **Dataset**: Current Daily Price of Various Commodities from Various Markets
- **Provider**: Ministry of Agriculture and Farmers Welfare
- **Update Frequency**: Daily

## License

MIT
