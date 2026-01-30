#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config();

async function clearCtxhEmbeddings() {
  // Check database configuration
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'doanhoi',
  };

  // Check if we have DATABASE_URL or individual DB configs
  let clientConfig;
  if (process.env.DATABASE_URL) {
    clientConfig = { connectionString: process.env.DATABASE_URL };
    console.log('🔗 Using DATABASE_URL');
  } else if (dbConfig.password) {
    clientConfig = dbConfig;
    console.log(`🔗 Using individual DB config: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  } else {
    console.error('❌ No database configuration found!');
    console.log('💡 Either set DATABASE_URL or DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME in .env file');
    process.exit(1);
  }
  
  const client = new Client(clientConfig);

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');
    
    // Check if table exists
    const tableCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ctxh_embeddings')"
    );
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table ctxh_embeddings does not exist');
      console.log('💡 You may need to run the RAG setup first: npm run rag:setup');
      process.exit(1);
    }
    
    // Get current count
    const countResult = await client.query('SELECT COUNT(*) as count FROM ctxh_embeddings');
    const currentCount = parseInt(countResult.rows[0].count);
    
    console.log(`📊 Current records in ctxh_embeddings: ${currentCount}`);
    
    if (currentCount === 0) {
      console.log('✅ Table is already empty');
      return;
    }
    
    // Delete all records
    console.log('🗑️  Deleting all records...');
    await client.query('DELETE FROM ctxh_embeddings');
    
    // Reset sequence if it exists
    try {
      console.log('🔄 Resetting sequence...');
      await client.query('ALTER SEQUENCE ctxh_embeddings_id_seq RESTART WITH 1');
    } catch (seqError) {
      console.log('⚠️  Could not reset sequence (may not exist)');
    }
    
    console.log(`✅ Successfully deleted ${currentCount} records from ctxh_embeddings`);
    console.log('✅ Table cleared successfully');
    
  } catch (error) {
    console.error('❌ Error clearing ctxh_embeddings:');
    console.error('   Message:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    console.error('💡 Make sure your database is running and accessible');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
clearCtxhEmbeddings();