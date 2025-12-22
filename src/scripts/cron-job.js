/**
 * STANDALONE CRON JOB SCRIPT FOR MANDI PRICE FETCHING
 * 
 * SETUP INSTRUCTIONS:
 * 1. Install node-cron: npm install node-cron
 * 2. Set your desired schedule in the CRON_SCHEDULE variable below
 * 3. Run this file: node cron-job.js
 * 4. Keep it running - it will fetch data automatically at scheduled times
 * 
 * CRON SCHEDULE EXAMPLES (minute hour day month weekday):
 * Daily at 6 AM:        0 6 * * *
 * Daily at 8 AM:        0 8 * * *
 * Daily at 3:30 PM:     30 15 * * *
 * Every 6 hours:        0 star-slash-6 * * *
 * Twice daily 6AM/6PM:  0 6,18 * * *
 * Weekdays at 10 AM:    0 10 * * 1-5
 */

const cron = require('node-cron');
require('dotenv').config();

// ============================================
// CONFIGURATION - CHANGE THESE VALUES
// ============================================

const CRON_SCHEDULE = '0 */2 * * *';  // ⬅️ Every 2 hours (runs at 00:00, 02:00, 04:00, 06:00, etc.)
const TIMEZONE = 'Asia/Kolkata';      // ⬅️ CHANGE THIS: Your timezone
const API_URL = process.env.OPENGOV_API_URL || 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const API_KEY = process.env.OPENGOV_API_KEY;

// Database credentials
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'agrimatrix_prices',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
};

// ============================================
// DEPENDENCIES
// ============================================

const axios = require('axios');
const { Pool } = require('pg');

// Database connection
const pool = new Pool(DB_CONFIG);

// ============================================
// HELPER FUNCTIONS
// ============================================

// Parse date from DD/MM/YYYY to YYYY-MM-DD
function parseDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Fetch data from OpenGov API
async function fetchMandiPrices() {
  console.log('📡 Fetching data from OpenGov API...');
  
  try {
    const response = await axios.get(API_URL, {
      params: {
        'api-key': API_KEY,
        format: 'json',
        limit: '10000', // String format for API compatibility
      },
      timeout: 60000, // 60 seconds
    });

    if (response.data && response.data.records) {
      console.log(`✅ Fetched ${response.data.total} records from API`);
      
      // Filter to only get records from last 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const recentRecords = response.data.records.filter(record => {
        if (!record.arrival_date) return false;
        const recordDate = parseDate(record.arrival_date);
        return recordDate && new Date(recordDate) >= threeDaysAgo;
      });
      
      console.log(`📅 Filtered to ${recentRecords.length} records from last 3 days`);
      
      // Show date range of fetched data
      if (recentRecords.length > 0) {
        const dates = recentRecords.map(r => r.arrival_date).filter(Boolean);
        const uniqueDates = [...new Set(dates)].sort();
        console.log(`📆 Date range: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`);
      }
      return {
        success: true,
        records: recentRecords,
        metadata: {
          total: recentRecords.length,
          original_total: response.data.total,
          updated: response.data.updated_date,
        },
      };
    }

    return { success: false, error: 'Invalid API response' };
  } catch (error) {
    console.error('❌ API fetch failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Get or create state (using client instead of pool)
async function getOrCreateState(client, stateName) {
  const result = await client.query(
    `INSERT INTO states (name) VALUES ($1) 
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
     RETURNING id`,
    [stateName.trim()]
  );
  return result.rows[0].id;
}

// Get or create district (using client instead of pool)
async function getOrCreateDistrict(client, stateId, districtName) {
  const result = await client.query(
    `INSERT INTO districts (state_id, name) VALUES ($1, $2) 
     ON CONFLICT (state_id, name) DO UPDATE SET name = EXCLUDED.name 
     RETURNING id`,
    [stateId, districtName.trim()]
  );
  return result.rows[0].id;
}

// Get or create market (using client instead of pool)
async function getOrCreateMarket(client, districtId, marketName) {
  const result = await client.query(
    `INSERT INTO markets (district_id, name) VALUES ($1, $2) 
     ON CONFLICT (district_id, name) DO UPDATE SET name = EXCLUDED.name 
     RETURNING id`,
    [districtId, marketName.trim()]
  );
  return result.rows[0].id;
}

// Get or create commodity (using client instead of pool)
async function getOrCreateCommodity(client, commodityName, variety, grade) {
  const result = await client.query(
    `INSERT INTO commodities (name, variety, grade) VALUES ($1, $2, $3) 
     ON CONFLICT (name, variety, grade) DO UPDATE SET name = EXCLUDED.name 
     RETURNING id`,
    [commodityName.trim(), variety.trim(), grade.trim()]
  );
  return result.rows[0].id;
}

// Insert price record (using client instead of pool)
async function insertPrice(client, priceData) {
  const { marketId, commodityId, arrivalDate, minPrice, maxPrice, modalPrice } = priceData;
  
  const result = await client.query(
    `INSERT INTO daily_prices 
     (market_id, commodity_id, arrival_date, min_price, max_price, modal_price) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     ON CONFLICT (market_id, commodity_id, arrival_date) DO NOTHING
     RETURNING id`,
    [marketId, commodityId, arrivalDate, minPrice, maxPrice, modalPrice]
  );

  return result.rowCount > 0;
}

// Process and store records in batches
async function processRecords(records) {
  console.log(`🔄 Processing ${records.length} records...`);
  
  const BATCH_SIZE = 500; // Process 500 records at a time
  const processedDates = new Set();
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  // Get a single client from the pool for all operations
  const client = await pool.connect();
  
  try {
    // Process records in batches
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(records.length / BATCH_SIZE);
      
      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
      
      // Use a transaction for each batch
      await client.query('BEGIN');
      
      try {
        for (const record of batch) {
          try {
            const arrivalDate = parseDate(record.arrival_date);
            if (arrivalDate) {
              processedDates.add(record.arrival_date);
            }
            
            const stateId = await getOrCreateState(client, record.state);
            const districtId = await getOrCreateDistrict(client, stateId, record.district);
            const marketId = await getOrCreateMarket(client, districtId, record.market);
            const commodityId = await getOrCreateCommodity(
              client,
              record.commodity,
              record.variety || 'Other',
              record.grade || 'FAQ'
            );

            const wasInserted = await insertPrice(client, {
              marketId,
              commodityId,
              arrivalDate,
              minPrice: parseFloat(record.min_price),
              maxPrice: parseFloat(record.max_price),
              modalPrice: parseFloat(record.modal_price),
            });

            if (wasInserted) {
              inserted++;
            } else {
              skipped++;
            }
          } catch (error) {
            console.error(`Error processing record:`, error.message);
            errors++;
          }
        }
        
        // Commit the transaction for this batch
        await client.query('COMMIT');
        console.log(`✅ Batch ${batchNum} committed`);
        
      } catch (error) {
        // Rollback on batch failure
        await client.query('ROLLBACK');
        console.error(`❌ Batch ${batchNum} failed, rolled back:`, error.message);
        errors += batch.length;
      }
    }
  } finally {
    // Release the client back to the pool
    client.release();
  }

  console.log(`\n✅ Inserted: ${inserted} | ⏭️ Skipped: ${skipped} | ❌ Errors: ${errors}`);
  console.log(`📅 Dates processed: ${[...processedDates].sort().join(', ')}`);
  
  return { inserted, skipped, errors };
}

// ============================================
// MAIN CRON JOB FUNCTION
// ============================================

async function runDataFetch() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 STARTING DATA FETCH JOB');
  console.log('Time:', new Date().toLocaleString('en-IN', { timeZone: TIMEZONE }));
  console.log('='.repeat(60));
  
  const startTime = Date.now();

  try {
    // Step 1: Fetch from API
    const apiResponse = await fetchMandiPrices();
    console.log(apiResponse);
    if (!apiResponse.success) {
      throw new Error(`API fetch failed: ${apiResponse.error}`);
    }

    // Step 2: Process and store in database
    const summary = await processRecords(apiResponse.records);

    // Step 3: Log results
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ DATA FETCH COMPLETED SUCCESSFULLY!');
    console.log('─'.repeat(60));
    console.log(`Total Records:    ${apiResponse.records.length}`);
    console.log(`Inserted:         ${summary.inserted} (new)`);
    console.log(`Skipped:          ${summary.skipped} (duplicates)`);
    console.log(`Errors:           ${summary.errors}`);
    console.log(`Duration:         ${duration} seconds`);
    console.log(`API Last Updated: ${apiResponse.metadata.updated}`);
    console.log('─'.repeat(60) + '\n');

    // Log to database
    await pool.query(
      `INSERT INTO sync_logs 
       (records_fetched, records_inserted, records_skipped, errors, status, duration_ms) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        apiResponse.records.length,
        summary.inserted,
        summary.skipped,
        summary.errors,
        'completed',
        Date.now() - startTime
      ]
    );

  } catch (error) {
    console.error('\n❌ DATA FETCH FAILED!');
    console.error('Error:', error.message);
    console.error('─'.repeat(60) + '\n');
  }
}

// ============================================
// DIRECT EXECUTION (No Cron Scheduling)
// ============================================

console.log('\n' + '='.repeat(60));
console.log('📅 MANDI PRICE DATA FETCHER');
console.log('='.repeat(60));
console.log(`Database:  ${DB_CONFIG.database} @ ${DB_CONFIG.host}`);
console.log(`API:       ${API_URL}`);
console.log('='.repeat(60) + '\n');

// Run immediately on startup
console.log('🔄 Running data fetch...\n');
runDataFetch().then(() => {
  console.log('\n✅ Fetch complete. Exiting...');
  pool.end();
  process.exit(0);
}).catch(error => {
  console.error('❌ Fetch failed:', error);
  pool.end();
  process.exit(1);
});
