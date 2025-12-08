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
      limit: 'all',
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
