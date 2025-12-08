const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigrations() {
  console.log('🚀 Starting database migration...');
  
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    
    console.log('✅ Database schema created successfully!');
    console.log('📊 Tables created:');
    console.log('   - states');
    console.log('   - districts');
    console.log('   - markets');
    console.log('   - commodities');
    console.log('   - daily_prices');
    console.log('   - sync_logs');
    console.log('📈 Indexes and views created successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();
