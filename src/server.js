const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const logger = require('./utils/logger');
const scheduler = require('./schedulers/daily-fetch');

// Import routes
const pricesRouter = require('./routes/prices');
const marketsRouter = require('./routes/markets');
const commoditiesRouter = require('./routes/commodities');
const syncRouter = require('./routes/sync');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/prices', pricesRouter);
app.use('/api/markets', marketsRouter);
app.use('/api/commodities', commoditiesRouter);
app.use('/api/sync', syncRouter);

// Root endpoint - serve HTML dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Mandi Price Tracker API',
    version: '1.0.0',
    description: 'Agricultural commodity price tracking system',
    endpoints: {
      prices: '/api/prices/latest',
      markets: '/api/markets',
      commodities: '/api/commodities',
      sync: '/api/sync/status',
      health: '/health',
    },
    documentation: 'See README.md for detailed API documentation',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info(`🚀 Server started on port ${PORT}`);
  logger.info(`Environment: ${config.server.env}`);
  logger.info(`API Base URL: http://localhost:${PORT}`);
  
  // Start the scheduler
  if (config.server.env === 'production' || process.env.START_SCHEDULER === 'true') {
    scheduler.start();
    logger.info('📅 Daily data fetch scheduler started');
  } else {
    logger.info('📅 Scheduler not started (set START_SCHEDULER=true to enable)');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  scheduler.stop();
  process.exit(0);
});

module.exports = app;
