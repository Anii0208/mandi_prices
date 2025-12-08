const express = require('express');
const pool = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/commodities
 * Get all commodities with variety and grade
 */
router.get('/', async (req, res) => {
  try {
    const { name, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        c.id,
        c.name,
        c.variety,
        c.grade,
        COUNT(dp.id) AS price_records_count,
        MAX(dp.arrival_date) AS latest_data_date
      FROM commodities c
      LEFT JOIN daily_prices dp ON c.id = dp.commodity_id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (name) {
      query += ` AND c.name ILIKE $${paramIndex}`;
      params.push(`%${name}%`);
      paramIndex++;
    }

    query += `
      GROUP BY c.id, c.name, c.variety, c.grade
      ORDER BY c.name, c.variety, c.grade
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      filters: { name },
      pagination: { limit: parseInt(limit), offset: parseInt(offset) },
    });
  } catch (error) {
    logger.error('Error fetching commodities', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commodities',
    });
  }
});

/**
 * GET /api/commodities/names
 * Get unique commodity names
 */
router.get('/names', async (req, res) => {
  try {
    const query = `
      SELECT 
        DISTINCT c.name,
        COUNT(DISTINCT c.id) AS variety_count
      FROM commodities c
      GROUP BY c.name
      ORDER BY c.name
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching commodity names', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commodity names',
    });
  }
});

module.exports = router;
