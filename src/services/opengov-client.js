const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

class OpenGovApiClient {
  constructor() {
    this.baseUrl = config.api.baseUrl;
    this.apiKey = config.api.apiKey;
    this.timeout = config.api.timeout;
    this.retryAttempts = config.api.retryAttempts;
    this.retryDelay = config.api.retryDelay;
  }

  /**
   * Fetch all mandi price data from OpenGov API
   * @param {Object} params - Query parameters (limit, offset, filters)
   * @returns {Promise<Object>} API response with records and metadata
   */
  async fetchMandiPrices(params = {}) {
    const defaultParams = {
      'api-key': this.apiKey,
      format: 'json',
      limit: 10000,  // Changed from 'all' to 10000
      offset: 0,
      ...params,
    };

    let attempt = 0;
    let lastError;

    while (attempt < this.retryAttempts) {
      try {
        logger.info(`Fetching data from OpenGov API (Attempt ${attempt + 1}/${this.retryAttempts})`);
        
        const response = await axios.get(this.baseUrl, {
          params: defaultParams,
          timeout: this.timeout,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mandi-Price-Tracker/1.0',
          },
        });

        if (response.data && response.data.records) {
          logger.info(`Successfully fetched ${response.data.total} records from API`, {
            total: response.data.total,
            count: response.data.count,
            updated: response.data.updated_date,
          });
          
          return {
            success: true,
            data: response.data,
            metadata: {
              total: response.data.total,
              count: response.data.count,
              limit: response.data.limit,
              offset: response.data.offset,
              updated: response.data.updated_date,
              created: response.data.created_date,
            },
          };
        } else if (response.data && response.data.records && response.data.records.length === 0) {
          // API returned valid response but with 0 records (e.g., offset beyond available data)
          logger.info('API returned 0 records - offset may be beyond available data');
          return {
            success: true,
            data: { ...response.data, records: [] },
            metadata: {
              total: response.data.total || 0,
              count: 0,
              limit: response.data.limit,
              offset: response.data.offset,
              updated: response.data.updated_date,
              created: response.data.created_date,
            },
          };
        } else {
          throw new Error('Invalid API response format');
        }
      } catch (error) {
        lastError = error;
        attempt++;

        if (error.response) {
          // API returned error response
          logger.error(`API error (${error.response.status}): ${error.response.statusText}`, {
            status: error.response.status,
            data: error.response.data,
          });
        } else if (error.request) {
          // Request made but no response
          logger.error('No response from API', { error: error.message });
        } else {
          // Error in request setup
          logger.error('Request setup error', { error: error.message });
        }

        if (attempt < this.retryAttempts) {
          logger.info(`Retrying in ${this.retryDelay}ms...`);
          await this.sleep(this.retryDelay);
        }
      }
    }

    // All retries failed
    logger.error('All API fetch attempts failed', { error: lastError.message });
    return {
      success: false,
      error: lastError.message,
    };
  }

  /**
   * Fetch ALL available records with pagination
   * @returns {Promise<Object>} Combined response with all records
   */
  async fetchAllRecords() {
    const batchSize = 10000;
    let offset = 0;
    let allRecords = [];
    let totalRecords = 0;
    let metadata = null;

    logger.info('Starting paginated fetch of all records');

    while (true) {
      const result = await this.fetchMandiPrices({ limit: batchSize, offset });
      
      if (!result.success) {
        return result;
      }

      const records = result.data.records;
      allRecords = allRecords.concat(records);
      
      if (!metadata) {
        metadata = result.metadata;
        totalRecords = result.data.total;
        logger.info(`Total records available: ${totalRecords}`);
      }

      logger.info(`Fetched batch: ${records.length} records (offset: ${offset})`);

      // Check if we've fetched all records or API returned empty batch
      if (records.length === 0 || offset + records.length >= totalRecords || records.length < batchSize) {
        if (records.length === 0 && allRecords.length > 0) {
          logger.warn(`API returned 0 records at offset ${offset}. This may be an API limit. Total fetched: ${allRecords.length}`);
        }
        break;
      }

      offset += batchSize;

      // Check if we've fetched all records
      if (offset + records.length >= totalRecords || records.length < batchSize) {
        break;
      }

      offset += batchSize;
      
      // Add delay between batches to avoid overwhelming the API
      if (offset < totalRecords) {
        logger.info('Waiting 1 second before next batch...');
        await this.sleep(1000);
      }
    }

    logger.info(`Completed paginated fetch: ${allRecords.length} total records`);

    return {
      success: true,
      data: {
        ...metadata,
        records: allRecords,
        total: totalRecords,
        count: allRecords.length,
      },
      metadata: {
        ...metadata,
        total: totalRecords,
        count: allRecords.length,
      },
    };
  }

  /**
   * Fetch data for a specific date
   * @param {string} date - Date in DD/MM/YYYY format
   * @returns {Promise<Object>} API response
   */
  async fetchByDate(date) {
    return this.fetchMandiPrices({
      filters: {
        arrival_date: date,
      },
    });
  }

  /**
   * Fetch data for a specific state
   * @param {string} state - State name
   * @returns {Promise<Object>} API response
   */
  async fetchByState(state) {
    return this.fetchMandiPrices({
      filters: {
        state: state,
      },
    });
  }

  /**
   * Test API connectivity
   * @returns {Promise<boolean>} True if API is accessible
   */
  async testConnection() {
    try {
      logger.info('Testing OpenGov API connection...');
      
      const response = await axios.get(this.baseUrl, {
        params: {
          'api-key': this.apiKey,
          format: 'json',
          limit: 1,
        },
        timeout: 10000,
      });

      if (response.data && response.status === 200) {
        logger.info('API connection test successful');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('API connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Sleep helper for retry delays
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new OpenGovApiClient();
