const opengovClient = require('./src/services/opengov-client');
const logger = require('./src/utils/logger');

async function testConnection() {
  console.log('\n🔍 Testing OpenGov API Connection...\n');
  
  try {
    const isConnected = await opengovClient.testConnection();
    
    if (isConnected) {
      console.log('✅ API connection successful!');
      console.log('\nFetching sample data...\n');
      
      const response = await opengovClient.fetchMandiPrices({ limit: 5 });
      
      if (response.success) {
        console.log('✅ Data fetch successful!');
        console.log('\nAPI Metadata:');
        console.log('  Total Records:', response.metadata.total);
        console.log('  Last Updated:', response.metadata.updated);
        console.log('\nSample Records:');
        response.data.records.slice(0, 3).forEach((record, i) => {
          console.log(`\n  ${i + 1}. ${record.commodity} - ${record.market}`);
          console.log(`     State: ${record.state}, District: ${record.district}`);
          console.log(`     Price: ₹${record.min_price} - ₹${record.max_price} (Modal: ₹${record.modal_price})`);
          console.log(`     Date: ${record.arrival_date}`);
        });
        
        console.log('\n✅ All tests passed! You can now run the full system.\n');
        process.exit(0);
      } else {
        console.log('❌ Data fetch failed:', response.error);
        console.log('\n⚠️  Please check your API key in .env file');
        process.exit(1);
      }
    } else {
      console.log('❌ API connection failed');
      console.log('\n⚠️  Please check:');
      console.log('   1. Your internet connection');
      console.log('   2. API key in .env file');
      console.log('   3. API URL in .env file');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n⚠️  Error details:', error);
    process.exit(1);
  }
}

testConnection();
