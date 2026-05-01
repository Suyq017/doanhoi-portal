#!/usr/bin/env node
/**
 * RAG Connection Test Script
 * Tests all connections required for the CTXH RAG chatbot system
 */

const { Client } = require('pg');
const Redis = require('redis');
require('dotenv').config();

async function testConnections() {
  console.log('🚀 Testing RAG System Connections...\n');
  
  let allTestsPassed = true;

  // Test PostgreSQL Connection
  console.log('📊 Testing PostgreSQL connection...');
  try {
    const pgClient = new Client({
      host: 'localhost',
      port: 9000, // Updated to match docker-compose port mapping
      database: 'doanhoi',
      user: 'postgres',
      password: 'password'
    });
    
    await pgClient.connect();
    
    // Test pgvector extension
    const vectorResult = await pgClient.query("SELECT version();");
    console.log('✅ PostgreSQL connected successfully');
    
    // Test ctxh_embeddings table
    const tableResult = await pgClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'ctxh_embeddings'
    `);
    
    if (tableResult.rows.length > 0) {
      console.log('✅ ctxh_embeddings table exists');
      
      // Test vector extension
      const extensionResult = await pgClient.query(`
        SELECT * FROM pg_extension WHERE extname = 'vector'
      `);
      
      if (extensionResult.rows.length > 0) {
        console.log('✅ pgvector extension is installed');
      } else {
        console.log('❌ pgvector extension not found');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ ctxh_embeddings table not found');
      allTestsPassed = false;
    }
    
    await pgClient.end();
  } catch (error) {
    console.log('❌ PostgreSQL connection failed:', error.message);
    allTestsPassed = false;
  }

  console.log(''); // Empty line

  // Test Redis Connection
  console.log('🔥 Testing Redis connection...');
  try {
    const redisClient = Redis.createClient({
      host: 'localhost',
      port: 6379
    });
    
    redisClient.on('error', (err) => {
      console.log('Redis Client Error', err);
      allTestsPassed = false;
    });
    
    // For redis v3.x, we use callback-based ping
    const pong = await new Promise((resolve, reject) => {
      redisClient.ping((err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    if (pong === 'PONG') {
      console.log('✅ Redis connected successfully');
    } else {
      console.log('❌ Redis ping failed');
      allTestsPassed = false;
    }
    
    redisClient.quit();
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
    allTestsPassed = false;
  }

  console.log(''); // Empty line

  // Test Environment Variables
  console.log('🔧 Testing environment variables...');
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'RAG_ENABLED',
    'RAG_EMBEDDING_MODEL',
    'RAG_CHAT_MODEL',
    'RAG_CHUNK_SIZE',
    'RAG_CHUNK_OVERLAP',
    'RAG_TOP_K',
    'RAG_SIMILARITY_THRESHOLD'
  ];

  const missingVars = [];
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length === 0) {
    console.log('✅ All required environment variables are set');
  } else {
    console.log('❌ Missing environment variables:', missingVars.join(', '));
    allTestsPassed = false;
  }

  console.log(''); // Empty line

  // Summary
  if (allTestsPassed) {
    console.log('🎉 All RAG system connections are working properly!');
    console.log('🚀 System is ready for Phase 1: Data Preparation and Embedding Generation');
    process.exit(0);
  } else {
    console.log('⚠️  Some connections failed. Please check the configuration.');
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  testConnections().catch(error => {
    console.error('💥 Connection test failed:', error);
    process.exit(1);
  });
}

module.exports = { testConnections };