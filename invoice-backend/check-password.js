const db = require('./db');

(async () => {
  try {
    const result = await db.query('SELECT id, email, password_hash FROM msme_users WHERE email = $1', ['msme1@gmail.com']);
    console.log('User info:', result.rows[0]);
    await db.end();
  } catch (error) {
    console.error('Error:', error.message);
    await db.end();
  }
})();