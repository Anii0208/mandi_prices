const express = require('express');
const pool = require('../config/database');
const scheduler = require('../schedulers/daily-fetch');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/sync/status
 * Get latest sync status and history
 */
router.get('/status', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const query = `
      SELECT 
        id,
        sync_date,
        records_fetched,
        records_inserted,
        records_skipped,
        errors,
        status,
        error_message,
        api_updated_date,
        duration_ms
      FROM sync_logs
      ORDER BY sync_date DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    const schedulerStatus = scheduler.getStatus();

    res.json({
      success: true,
      scheduler: schedulerStatus,
      latest: result.rows[0] || null,
      history: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching sync status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync status',
    });
  }
});

/**
 * POST /api/sync/trigger
 * Manually trigger data sync
 */
router.post('/trigger', async (req, res) => {
  try {
    logger.info('Manual sync triggered via API');

    // Execute sync in background
    scheduler.execute().catch((error) => {
      logger.error('Manual sync failed', { error: error.message });
    });

    res.json({
      success: true,
      message: 'Data sync triggered successfully',
      note: 'Check /api/sync/status for progress',
    });
  } catch (error) {
    logger.error('Error triggering sync', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to trigger sync',
    });
  }
});

/**
 * GET /api/sync/stats
 * Get overall database statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM states) AS total_states,
        (SELECT COUNT(*) FROM districts) AS total_districts,
        (SELECT COUNT(*) FROM markets) AS total_markets,
        (SELECT COUNT(*) FROM commodities) AS total_commodities,
        (SELECT COUNT(*) FROM daily_prices) AS total_price_records,
        (SELECT MAX(arrival_date)::text FROM daily_prices) AS latest_data_date,
        (SELECT MIN(arrival_date)::text FROM daily_prices) AS earliest_data_date,
        (SELECT MAX(sync_date) FROM sync_logs WHERE status = 'completed') AS last_successful_sync
    `;

    const result = await pool.query(statsQuery);

    res.json({
      success: true,
      stats: result.rows[0],
    });
  } catch (error) {
    logger.error('Error fetching stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

module.exports = router;
