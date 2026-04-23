const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const {
  getClientConfig,
  runCtxhRegistrationMigrations,
} = require('./run-ctxh-registration-migrations');

const seedSqlPath = path.join(__dirname, 'insert-ctxh-activities.sql');

async function runCtxhSync() {
  if (!fs.existsSync(seedSqlPath)) {
    throw new Error(`Seed SQL file not found: ${seedSqlPath}`);
  }

  const sql = fs.readFileSync(seedSqlPath, 'utf8');
  const client = new Client(getClientConfig());

  try {
    await client.connect();
    console.log('Connected to database for CTXH sync.');

    console.log('\n=== Step 1/2: CTXH registration migrations ===');
    await runCtxhRegistrationMigrations(client);

    console.log('\n=== Step 2/2: Seed CTXH activities SQL ===');
    await client.query(sql);

    console.log('\nCTXH sync completed successfully.');
  } finally {
    await client.end();
  }
}

runCtxhSync().catch((error) => {
  console.error('CTXH sync failed.');
  console.error(error);
  process.exit(1);
});
