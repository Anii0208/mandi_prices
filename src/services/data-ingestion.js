const pool = require('../config/database');
const logger = require('../utils/logger');

class DataIngestionService {
  /**
   * Parse date from DD/MM/YYYY format to YYYY-MM-DD
   * @param {string} dateStr - Date in DD/MM/YYYY format
   * @returns {string} Date in YYYY-MM-DD format
   */
  parseDate(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  /**
   * Get or create state
   * @param {string} stateName - State name
   * @returns {Promise<number>} State ID
   */
  async getOrCreateState(stateName) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO states (name) VALUES ($1) 
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
        [stateName.trim()]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Get or create district
   * @param {number} stateId - State ID
   * @param {string} districtName - District name
   * @returns {Promise<number>} District ID
   */
  async getOrCreateDistrict(stateId, districtName) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO districts (state_id, name) VALUES ($1, $2) 
         ON CONFLICT (state_id, name) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
        [stateId, districtName.trim()]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Get or create market
   * @param {number} districtId - District ID
   * @param {string} marketName - Market name
   * @returns {Promise<number>} Market ID
   */
  async getOrCreateMarket(districtId, marketName) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO markets (district_id, name) VALUES ($1, $2) 
         ON CONFLICT (district_id, name) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
        [districtId, marketName.trim()]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Get or create commodity
   * @param {string} commodityName - Commodity name
   * @param {string} variety - Variety
   * @param {string} grade - Grade
   * @returns {Promise<number>} Commodity ID
   */
  async getOrCreateCommodity(commodityName, variety, grade) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO commodities (name, variety, grade) VALUES ($1, $2, $3) 
         ON CONFLICT (name, variety, grade) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
        [commodityName.trim(), variety.trim(), grade.trim()]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Insert price record (with duplicate prevention)
   * @param {Object} priceData - Price data object
   * @returns {Promise<Object>} Result object
   */
  async insertPrice(priceData) {
    const { marketId, commodityId, arrivalDate, minPrice, maxPrice, modalPrice } = priceData;
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO daily_prices 
         (market_id, commodity_id, arrival_date, min_price, max_price, modal_price) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (market_id, commodity_id, arrival_date) DO NOTHING
         RETURNING id`,
        [marketId, commodityId, arrivalDate, minPrice, maxPrice, modalPrice]
      );

      return {
        inserted: result.rowCount > 0,
        id: result.rows[0]?.id,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Process and ingest a single record
   * @param {Object} record - Raw API record
   * @returns {Promise<Object>} Processing result
   */
  async processRecord(record) {
    try {
      // Parse and validate date
      const arrivalDate = this.parseDate(record.arrival_date);
      
      // Get or create normalized entities
      const stateId = await this.getOrCreateState(record.state);
      const districtId = await this.getOrCreateDistrict(stateId, record.district);
      const marketId = await this.getOrCreateMarket(districtId, record.market);
      const commodityId = await this.getOrCreateCommodity(
        record.commodity,
        record.variety || 'Other',
        record.grade || 'FAQ'
      );

      // Insert price record
      const result = await this.insertPrice({
        marketId,
        commodityId,
        arrivalDate,
        minPrice: parseFloat(record.min_price),
        maxPrice: parseFloat(record.max_price),
        modalPrice: parseFloat(record.modal_price),
      });

      return {
        success: true,
        inserted: result.inserted,
        skipped: !result.inserted,
      };
    } catch (error) {
      logger.error('Error processing record', {
        error: error.message,
        record: {
          state: record.state,
          market: record.market,
          commodity: record.commodity,
        },
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Ingest multiple records from API response
   * @param {Array} records - Array of API records
   * @param {Object} metadata - API response metadata
   * @returns {Promise<Object>} Ingestion summary
   */
  async ingestRecords(records, metadata = {}) {
    logger.info(`Starting ingestion of ${records.length} records`);
    
    const startTime = Date.now();
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    // Start sync log
    const syncLogId = await this.createSyncLog({
      recordsFetched: records.length,
      apiUpdatedDate: metadata.updated,
    });

    for (const record of records) {
      const result = await this.processRecord(record);
      
      if (result.success) {
        if (result.inserted) {
          inserted++;
        } else {
          skipped++;
        }
      } else {
        errors++;
      }
    }

    const duration = Date.now() - startTime;

    // Update sync log
    await this.updateSyncLog(syncLogId, {
      recordsInserted: inserted,
      recordsSkipped: skipped,
      errors,
      status: errors > 0 ? 'completed_with_errors' : 'completed',
      durationMs: duration,
    });

    const summary = {
      total: records.length,
      inserted,
      skipped,
      errors,
      duration,
    };

    logger.info('Ingestion completed', summary);
    return summary;
  }

  /**
   * Create sync log entry
   * @param {Object} data - Sync log data
   * @returns {Promise<number>} Sync log ID
   */
  async createSyncLog(data) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO sync_logs 
         (records_fetched, api_updated_date, status) 
         VALUES ($1, $2, 'running') 
         RETURNING id`,
        [data.recordsFetched, data.apiUpdatedDate]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Update sync log entry
   * @param {number} id - Sync log ID
   * @param {Object} data - Update data
   */
  async updateSyncLog(id, data) {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE sync_logs 
         SET records_inserted = $1, 
             records_skipped = $2, 
             errors = $3, 
             status = $4, 
             duration_ms = $5
         WHERE id = $6`,
        [
          data.recordsInserted,
          data.recordsSkipped,
          data.errors,
          data.status,
          data.durationMs,
          id,
        ]
      );
    } finally {
      client.release();
    }
  }
}

module.exports = new DataIngestionService();
