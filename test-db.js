const pool = require('./src/config/database');

async function testDatabase() {
  console.log('\n🔍 Testing Database Connection...\n');
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully!');
    
    // Test query
    const result = await client.query('SELECT version()');
    console.log('\nPostgreSQL Version:');
    console.log('  ', result.rows[0].version.split(',')[0]);
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\nDatabase Tables:');
    if (tablesResult.rows.length === 0) {
      console.log('  ⚠️  No tables found. Please run: npm run migrate');
    } else {
      tablesResult.rows.forEach(row => {
        console.log('  ✓', row.table_name);
      });
      
      // Get record counts
      console.log('\nRecord Counts:');
      const counts = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM states) as states,
          (SELECT COUNT(*) FROM districts) as districts,
          (SELECT COUNT(*) FROM markets) as markets,
          (SELECT COUNT(*) FROM commodities) as commodities,
          (SELECT COUNT(*) FROM daily_prices) as prices
      `);
      
      const c = counts.rows[0];
      console.log('  States:', c.states);
      console.log('  Districts:', c.districts);
      console.log('  Markets:', c.markets);
      console.log('  Commodities:', c.commodities);
      console.log('  Daily Prices:', c.prices);
      
      if (parseInt(c.prices) === 0) {
        console.log('\n⚠️  No price data found. Please run: npm run scheduler');
      }
    }
    
    client.release();
    console.log('\n✅ Database test completed!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.log('\n⚠️  Please check:');
    console.log('   1. PostgreSQL is running');
    console.log('   2. Database "agrimatrix_prices" exists');
    console.log('   3. Credentials in .env file are correct');
    console.log('\nCreate database with:');
    console.log('   psql -U postgres -c "CREATE DATABASE agrimatrix_prices;"');
    process.exit(1);
  }
}

testDatabase();
