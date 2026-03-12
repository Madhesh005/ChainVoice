const db = require('./db');

async function checkLenders() {
  try {
    console.log('📋 Checking lender users...\n');

    const lenders = await db.query('SELECT id, email, institution_name FROM lender_users LIMIT 10');
    
    console.log('Lender users in database:');
    lenders.rows.forEach(lender => {
      console.log(`  - ${lender.email} → ${lender.institution_name}`);
    });

    console.log(`\nTotal lenders: ${lenders.rows.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkLenders();