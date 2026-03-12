const db = require('./db');
const fs = require('fs');

async function runMigration() {
  try {
    console.log('Running financing_requests table migration...');
    
    const sql = fs.readFileSync('./migrations/create-financing-requests.sql', 'utf8');
    await db.query(sql);
    
    console.log('✅ Migration completed successfully');
    
    // Test the table
    const result = await db.query('SELECT COUNT(*) FROM financing_requests');
    console.log('✅ Table verified, current count:', result.rows[0].count);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();