# API Documentation

## Base URL
```
http://localhost:3000
```

## Endpoints

### 1. Health Check
```
GET /health
```
Check if the server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-08T05:00:00.000Z",
  "uptime": 12345.67
}
```

---

### 2. Get Latest Prices

#### Get Latest Prices with Filters
```
GET /api/prices/latest
```

**Query Parameters:**
- `state` (optional) - Filter by state name (case-insensitive partial match)
- `district` (optional) - Filter by district name
- `market` (optional) - Filter by market name
- `commodity` (optional) - Filter by commodity name
- `limit` (optional, default: 100) - Number of records to return
- `offset` (optional, default: 0) - Pagination offset

**Example Requests:**
```
GET /api/prices/latest?state=Gujarat
GET /api/prices/latest?commodity=Tomato&limit=50
GET /api/prices/latest?state=Tamil Nadu&district=Coimbatore
GET /api/prices/latest?market=Surat APMC
```

**Response:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "state": "Gujarat",
      "district": "Surat",
      "market": "Surat APMC",
      "commodity": "Tomato",
      "variety": "Other",
      "grade": "FAQ",
      "arrival_date": "2025-12-08",
      "min_price": 1500,
      "max_price": 3500,
      "modal_price": 2500
    }
  ],
  "filters": {
    "state": "Gujarat",
    "district": null,
    "market": null,
    "commodity": null
  },
  "pagination": {
    "limit": 100,
    "offset": 0
  }
}
```

---

#### Get Prices for Specific Commodity
```
GET /api/prices/commodity/:name
```

**Example:**
```
GET /api/prices/commodity/Tomato
GET /api/prices/commodity/Potato
```

**Response:**
```json
{
  "success": true,
  "commodity": "Tomato",
  "count": 25,
  "data": [...]
}
```

---

#### Get Price History
```
GET /api/prices/history
```

**Query Parameters:**
- `market` (required) - Market name
- `commodity` (required) - Commodity name
- `days` (optional, default: 30) - Number of days of history

**Example:**
```
GET /api/prices/history?market=Surat APMC&commodity=Tomato&days=30
```

**Response:**
```json
{
  "success": true,
  "market": "Surat APMC",
  "commodity": "Tomato",
  "days": 30,
  "count": 15,
  "data": [...]
}
```

---

#### Get Price Statistics
```
GET /api/prices/stats
```

**Query Parameters:**
- `commodity` (required) - Commodity name
- `days` (optional, default: 30) - Period for statistics

**Example:**
```
GET /api/prices/stats?commodity=Tomato&days=30
```

**Response:**
```json
{
  "success": true,
  "commodity": "Tomato",
  "days": 30,
  "stats": {
    "commodity": "Tomato",
    "record_count": 150,
    "avg_price": 2500.50,
    "lowest_price": 1200,
    "highest_price": 4500,
    "earliest_date": "2025-11-08",
    "latest_date": "2025-12-08"
  }
}
```

---

### 3. Markets

#### Get All Markets
```
GET /api/markets
```

**Query Parameters:**
- `state` (optional) - Filter by state
- `district` (optional) - Filter by district
- `limit` (optional, default: 100)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id": 1,
      "market_name": "Surat APMC",
      "district": "Surat",
      "state": "Gujarat",
      "price_records_count": 150,
      "latest_data_date": "2025-12-08"
    }
  ]
}
```

---

#### Get All States
```
GET /api/markets/states
```

**Response:**
```json
{
  "success": true,
  "count": 28,
  "data": [
    {
      "id": 1,
      "name": "Gujarat",
      "district_count": 25,
      "market_count": 120
    }
  ]
}
```

---

#### Get All Districts
```
GET /api/markets/districts?state=Gujarat
```

**Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": 1,
      "district": "Surat",
      "state": "Gujarat",
      "market_count": 15
    }
  ]
}
```

---

### 4. Commodities

#### Get All Commodities
```
GET /api/commodities
```

**Query Parameters:**
- `name` (optional) - Filter by commodity name
- `limit` (optional, default: 100)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id": 1,
      "name": "Tomato",
      "variety": "Other",
      "grade": "FAQ",
      "price_records_count": 200,
      "latest_data_date": "2025-12-08"
    }
  ]
}
```

---

#### Get Commodity Names
```
GET /api/commodities/names
```

**Response:**
```json
{
  "success": true,
  "count": 150,
  "data": [
    {
      "name": "Tomato",
      "variety_count": 3
    }
  ]
}
```

---

### 5. Data Synchronization

#### Get Sync Status
```
GET /api/sync/status
```

**Response:**
```json
{
  "success": true,
  "scheduler": {
    "isScheduled": true,
    "isRunning": false,
    "schedule": "0 6 * * *",
    "timezone": "Asia/Kolkata"
  },
  "latest": {
    "id": 5,
    "sync_date": "2025-12-08T06:00:00.000Z",
    "records_fetched": 4832,
    "records_inserted": 4832,
    "records_skipped": 0,
    "errors": 0,
    "status": "completed",
    "duration_ms": 45000
  },
  "history": [...]
}
```

---

#### Trigger Manual Sync
```
POST /api/sync/trigger
```

Manually trigger a data fetch and sync operation.

**Response:**
```json
{
  "success": true,
  "message": "Data sync triggered successfully",
  "note": "Check /api/sync/status for progress"
}
```

---

#### Get Database Statistics
```
GET /api/sync/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_states": 28,
    "total_districts": 450,
    "total_markets": 2500,
    "total_commodities": 200,
    "total_price_records": 50000,
    "latest_data_date": "2025-12-08",
    "earliest_data_date": "2025-11-01",
    "last_successful_sync": "2025-12-08T06:00:00.000Z"
  }
}
```

---

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing required parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding it for production use.

## CORS

CORS is enabled for all origins in development. Configure appropriately for production.

## Date Format

- **Input**: DD/MM/YYYY (from OpenGov API)
- **Output**: YYYY-MM-DD (ISO 8601 format)
- All times are in UTC
