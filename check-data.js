require('dotenv').config();
const pool = require('./src/config/database');

async function checkData() {
  try {
    console.log('\n📊 Checking Database...\n');
    
    // Total counts
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM states) as states,
        (SELECT COUNT(*) FROM districts) as districts,
        (SELECT COUNT(*) FROM markets) as markets,
        (SELECT COUNT(*) FROM commodities) as commodities,
        (SELECT COUNT(*) FROM daily_prices) as prices,
        (SELECT MAX(arrival_date) FROM daily_prices) as latest_date
    `);
    
    const data = counts.rows[0];
    console.log('✅ DATA IS STORED IN DATABASE:');
    console.log('─────────────────────────────');
    console.log(`   States:       ${data.states}`);
    console.log(`   Districts:    ${data.districts}`);
    console.log(`   Markets:      ${data.markets}`);
    console.log(`   Commodities:  ${data.commodities}`);
    console.log(`   Price Records: ${data.prices}`);
    console.log(`   Latest Date:  ${data.latest_date ? data.latest_date.toISOString().split('T')[0] : 'N/A'}`);
    
    // Sample data
    const samples = await pool.query(`
      SELECT 
        s.name as state,
        d.name as district,
        m.name as market,
        c.name as commodity,
        dp.modal_price,
        dp.arrival_date
      FROM daily_prices dp
      JOIN markets m ON dp.market_id = m.id
      JOIN districts d ON m.district_id = d.id
      JOIN states s ON d.state_id = s.id
      JOIN commodities c ON dp.commodity_id = c.id
      ORDER BY dp.arrival_date DESC
      LIMIT 5
    `);
    
    console.log('\n📋 Sample Records:');
    console.log('─────────────────────────────');
    samples.rows.forEach((r, i) => {
      console.log(`${i + 1}. ${r.commodity} @ ${r.market}, ${r.district}, ${r.state}`);
      console.log(`   Price: ₹${r.modal_price} | Date: ${r.arrival_date.toISOString().split('T')[0]}`);
    });
    
    console.log('\n✅ Database is working perfectly!\n');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkData();
