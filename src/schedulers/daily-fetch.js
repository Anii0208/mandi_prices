const cron = require('node-cron');
const opengovClient = require('../services/opengov-client');
const ingestionService = require('../services/data-ingestion');
const logger = require('../utils/logger');
const config = require('../config/config');

class DailyFetchScheduler {
  constructor() {
    this.schedule = config.scheduler.fetchSchedule;
    this.isRunning = false;
    this.task = null;
  }

  /**
   * Execute the data fetch and ingestion
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('Fetch already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    logger.info('=== Starting scheduled data fetch ===');

    try {
      // Fetch data from OpenGov API
      const apiResponse = await opengovClient.fetchMandiPrices();

      if (!apiResponse.success) {
        throw new Error(`API fetch failed: ${apiResponse.error}`);
      }

      // Ingest records into database
      const summary = await ingestionService.ingestRecords(
        apiResponse.data.records,
        apiResponse.metadata
      );

      logger.info('=== Scheduled fetch completed successfully ===', {
        summary,
        apiMetadata: apiResponse.metadata,
      });

      return summary;
    } catch (error) {
      logger.error('Scheduled fetch failed', { error: error.message, stack: error.stack });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the scheduler
   */
  start() {
    logger.info(`Starting scheduler with cron expression: ${this.schedule}`);
    logger.info(`Timezone: ${config.scheduler.timezone}`);

    this.task = cron.schedule(
      this.schedule,
      async () => {
        logger.info('Cron job triggered');
        await this.execute();
      },
      {
        scheduled: true,
        timezone: config.scheduler.timezone,
      }
    );

    logger.info('✅ Scheduler started successfully');
    logger.info('Next execution will occur based on the cron schedule');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      logger.info('Scheduler stopped');
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isScheduled: this.task !== null,
      isRunning: this.isRunning,
      schedule: this.schedule,
      timezone: config.scheduler.timezone,
    };
  }
}

// Export singleton instance
const scheduler = new DailyFetchScheduler();

// If this file is run directly, execute immediately
if (require.main === module) {
  (async () => {
    try {
      logger.info('Running manual data fetch...');
      await scheduler.execute();
      logger.info('Manual fetch completed');
      process.exit(0);
    } catch (error) {
      logger.error('Manual fetch failed', { error: error.message });
      process.exit(1);
    }
  })();
}

module.exports = scheduler;
