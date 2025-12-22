const express = require('express');
const pool = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/prices/latest
 * Get latest prices with optional filters
 */
router.get('/latest', async (req, res) => {
  try {
    const { state, district, market, commodity, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        s.name AS state,
        d.name AS district,
        m.name AS market,
        c.name AS commodity,
        c.variety,
        c.grade,
        dp.arrival_date::text AS arrival_date,
        dp.min_price,
        dp.max_price,
        dp.modal_price
      FROM daily_prices dp
      JOIN markets m ON dp.market_id = m.id
      JOIN districts d ON m.district_id = d.id
      JOIN states s ON d.state_id = s.id
      JOIN commodities c ON dp.commodity_id = c.id
      WHERE dp.arrival_date = (
        SELECT MAX(arrival_date) 
        FROM daily_prices dp2 
        WHERE dp2.market_id = dp.market_id 
        AND dp2.commodity_id = dp.commodity_id
      )
    `;

    const params = [];
    let paramIndex = 1;

    if (state) {
      query += ` AND s.name ILIKE $${paramIndex}`;
      params.push(`%${state}%`);
      paramIndex++;
    }

    if (district) {
      query += ` AND d.name ILIKE $${paramIndex}`;
      params.push(`%${district}%`);
      paramIndex++;
    }

    if (market) {
      query += ` AND m.name ILIKE $${paramIndex}`;
      params.push(`%${market}%`);
      paramIndex++;
    }

    if (commodity) {
      query += ` AND c.name ILIKE $${paramIndex}`;
      params.push(`%${commodity}%`);
      paramIndex++;
    }

    query += ` ORDER BY dp.arrival_date DESC, s.name, d.name, m.name, c.name`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      filters: { state, district, market, commodity },
      pagination: { limit: parseInt(limit), offset: parseInt(offset) },
    });
  } catch (error) {
    logger.error('Error fetching latest prices', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest prices',
    });
  }
});

/**
 * GET /api/prices/commodity/:name
 * Get latest prices for a specific commodity across all markets
 */
router.get('/commodity/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { limit = 50 } = req.query;

    const query = `
      SELECT 
        s.name AS state,
        d.name AS district,
        m.name AS market,
        c.name AS commodity,
        c.variety,
        c.grade,
        dp.arrival_date::text AS arrival_date,
        dp.min_price,
        dp.max_price,
        dp.modal_price
      FROM daily_prices dp
      JOIN markets m ON dp.market_id = m.id
      JOIN districts d ON m.district_id = d.id
      JOIN states s ON d.state_id = s.id
      JOIN commodities c ON dp.commodity_id = c.id
      WHERE c.name ILIKE $1
      AND dp.arrival_date = (
        SELECT MAX(arrival_date) 
        FROM daily_prices dp2 
        WHERE dp2.market_id = dp.market_id 
        AND dp2.commodity_id = dp.commodity_id
      )
      ORDER BY dp.modal_price DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [`%${name}%`, limit]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No prices found for commodity: ${name}`,
      });
    }

    res.json({
      success: true,
      commodity: name,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching commodity prices', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commodity prices',
    });
  }
});

/**
 * GET /api/prices/history
 * Get price history for a specific market and commodity
 */
router.get('/history', async (req, res) => {
  try {
    const { market, commodity, days = 30 } = req.query;

    if (!market || !commodity) {
      return res.status(400).json({
        success: false,
        error: 'Market and commodity parameters are required',
      });
    }

    const query = `
      SELECT 
        s.name AS state,
        d.name AS district,
        m.name AS market,
        c.name AS commodity,
        c.variety,
        c.grade,
        dp.arrival_date::text AS arrival_date,
        dp.min_price,
        dp.max_price,
        dp.modal_price
      FROM daily_prices dp
      JOIN markets m ON dp.market_id = m.id
      JOIN districts d ON m.district_id = d.id
      JOIN states s ON d.state_id = s.id
      JOIN commodities c ON dp.commodity_id = c.id
      WHERE m.name ILIKE $1
      AND c.name ILIKE $2
      AND dp.arrival_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      ORDER BY dp.arrival_date DESC
    `;

    const result = await pool.query(query, [`%${market}%`, `%${commodity}%`]);

    res.json({
      success: true,
      market,
      commodity,
      days: parseInt(days),
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching price history', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price history',
    });
  }
});

/**
 * GET /api/prices/stats
 * Get price statistics for a commodity
 */
router.get('/stats', async (req, res) => {
  try {
    const { commodity, days = 30 } = req.query;

    if (!commodity) {
      return res.status(400).json({
        success: false,
        error: 'Commodity parameter is required',
      });
    }

    const query = `
      SELECT 
        c.name AS commodity,
        COUNT(*) AS record_count,
        AVG(dp.modal_price) AS avg_price,
        MIN(dp.min_price) AS lowest_price,
        MAX(dp.max_price) AS highest_price,
        MIN(dp.arrival_date)::text AS earliest_date,
        MAX(dp.arrival_date)::text AS latest_date
      FROM daily_prices dp
      JOIN commodities c ON dp.commodity_id = c.id
      WHERE c.name ILIKE $1
      AND dp.arrival_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      GROUP BY c.name
    `;

    const result = await pool.query(query, [`%${commodity}%`]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No data found for commodity: ${commodity}`,
      });
    }

    res.json({
      success: true,
      commodity,
      days: parseInt(days),
      stats: result.rows[0],
    });
  } catch (error) {
    logger.error('Error fetching price stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price statistics',
    });
  }
});

module.exports = router;
