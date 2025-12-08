const express = require('express');
const pool = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/markets
 * Get all markets with optional state/district filter
 */
router.get('/', async (req, res) => {
  try {
    const { state, district, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        m.id,
        m.name AS market_name,
        d.name AS district,
        s.name AS state,
        COUNT(dp.id) AS price_records_count,
        MAX(dp.arrival_date) AS latest_data_date
      FROM markets m
      JOIN districts d ON m.district_id = d.id
      JOIN states s ON d.state_id = s.id
      LEFT JOIN daily_prices dp ON m.id = dp.market_id
      WHERE 1=1
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

    query += `
      GROUP BY m.id, m.name, d.name, s.name
      ORDER BY s.name, d.name, m.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      filters: { state, district },
      pagination: { limit: parseInt(limit), offset: parseInt(offset) },
    });
  } catch (error) {
    logger.error('Error fetching markets', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch markets',
    });
  }
});

/**
 * GET /api/markets/states
 * Get all states
 */
router.get('/states', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id,
        s.name,
        COUNT(DISTINCT d.id) AS district_count,
        COUNT(DISTINCT m.id) AS market_count
      FROM states s
      LEFT JOIN districts d ON s.id = d.state_id
      LEFT JOIN markets m ON d.id = m.district_id
      GROUP BY s.id, s.name
      ORDER BY s.name
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching states', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch states',
    });
  }
});

/**
 * GET /api/markets/districts
 * Get all districts with optional state filter
 */
router.get('/districts', async (req, res) => {
  try {
    const { state } = req.query;

    let query = `
      SELECT 
        d.id,
        d.name AS district,
        s.name AS state,
        COUNT(DISTINCT m.id) AS market_count
      FROM districts d
      JOIN states s ON d.state_id = s.id
      LEFT JOIN markets m ON d.id = m.district_id
      WHERE 1=1
    `;

    const params = [];
    if (state) {
      query += ` AND s.name ILIKE $1`;
      params.push(`%${state}%`);
    }

    query += `
      GROUP BY d.id, d.name, s.name
      ORDER BY s.name, d.name
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      filters: { state },
    });
  } catch (error) {
    logger.error('Error fetching districts', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch districts',
    });
  }
});

module.exports = router;
