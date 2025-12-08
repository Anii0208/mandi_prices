require('dotenv').config();

module.exports = {
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'agrimatrix_prices',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  },

  // OpenGov API configuration
  api: {
    baseUrl: process.env.OPENGOV_API_URL || 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070',
    apiKey: process.env.OPENGOV_API_KEY,
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 2000, // 2 seconds
  },

  // Server configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development',
  },

  // Scheduler configuration
  scheduler: {
    fetchSchedule: process.env.FETCH_SCHEDULE || '0 6 * * *', // 6 AM daily
    timezone: 'Asia/Kolkata',
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: './logs',
  },
};
