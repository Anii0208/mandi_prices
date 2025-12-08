const fs = require('fs');
const path = require('path');
const ingestionService = require('./src/services/data-ingestion');
const logger = require('./src/utils/logger');

async function importFromFile() {
  console.log('\n📥 Importing data from hello.json...\n');
  
  try {
    // Read the JSON file
    const filePath = path.join(__dirname, 'hello.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);
    
    if (!data.records || !Array.isArray(data.records)) {
      throw new Error('Invalid JSON format: records array not found');
    }
    
    console.log(`Found ${data.records.length} records in file`);
    console.log(`API Last Updated: ${data.updated_date}\n`);
    
    // Ingest the records
    const metadata = {
      total: data.total,
      count: data.count,
      updated: data.updated_date,
    };
    
    const summary = await ingestionService.ingestRecords(data.records, metadata);
    
    console.log('\n✅ Import completed successfully!\n');
    console.log('Summary:');
    console.log(`  Total records: ${summary.total}`);
    console.log(`  Inserted: ${summary.inserted}`);
    console.log(`  Skipped (duplicates): ${summary.skipped}`);
    console.log(`  Errors: ${summary.errors}`);
    console.log(`  Duration: ${(summary.duration / 1000).toFixed(2)}s\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    logger.error('Import failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

importFromFile();
