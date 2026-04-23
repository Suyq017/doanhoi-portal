/**
 * Script to test RAG Phase 1 Data Ingestion Pipeline
 * 
 * Usage: node test-phase1-pipeline.js
 * 
 * This script tests:
 * 1. Data preparation service
 * 2. Chunking service
 * 3. Embedding service (with OpenAI)
 * 4. Vector store service
 * 5. Full pipeline orchestration
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/ctxh-chat`;

// You'll need a valid JWT token - get this from login
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Test functions

async function testHealthCheck() {
  log('\n========== Testing Health Check ==========', colors.blue);
  
  try {
    const response = await axios.get(`${API_URL}/health`, { headers });
    
    if (response.data.status === 'healthy') {
      logSuccess('All pipeline components are healthy');
      console.log(JSON.stringify(response.data.components, null, 2));
    } else {
      logWarning('Some components are unhealthy');
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
  }
}

async function testEmbeddingServiceHealth() {
  log('\n========== Testing Embedding Service Health ==========', colors.blue);
  
  try {
    const response = await axios.get(`${API_URL}/health/embeddings`, { headers });
    
    if (response.data.status === 'healthy') {
      logSuccess('Embedding service is healthy');
      console.log(JSON.stringify(response.data.details, null, 2));
    } else {
      logError('Embedding service is unhealthy');
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    logError(`Embedding health check failed: ${error.message}`);
  }
}

async function testVectorStoreHealth() {
  log('\n========== Testing Vector Store Health ==========', colors.blue);
  
  try {
    const response = await axios.get(`${API_URL}/health/vector-store`, { headers });
    
    if (response.data.status === 'healthy') {
      logSuccess('Vector store is healthy');
      console.log(JSON.stringify(response.data.details, null, 2));
    } else {
      logError('Vector store is unhealthy');
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    logError(`Vector store health check failed: ${error.message}`);
  }
}

async function testStorageStats() {
  log('\n========== Testing Storage Statistics ==========', colors.blue);
  
  try {
    const response = await axios.get(`${API_URL}/stats/storage`, { headers });
    
    logSuccess('Storage statistics retrieved');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    logError(`Failed to get storage stats: ${error.message}`);
  }
}

async function testCacheStats() {
  log('\n========== Testing Cache Statistics ==========', colors.blue);
  
  try {
    const response = await axios.get(`${API_URL}/stats/cache`, { headers });
    
    logSuccess('Cache statistics retrieved');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    logError(`Failed to get cache stats: ${error.message}`);
  }
}

async function testIngestionStats() {
  log('\n========== Testing Ingestion Statistics ==========', colors.blue);
  
  try {
    const response = await axios.get(`${API_URL}/ingestion/stats`, { headers });
    
    logSuccess('Ingestion statistics retrieved');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    logError(`Failed to get ingestion stats: ${error.message}`);
  }
}

async function testFullIngestion() {
  log('\n========== Testing Full Ingestion Pipeline ==========', colors.blue);
  logWarning('This may take several minutes depending on data volume...');
  
  try {
    const startTime = Date.now();
    const response = await axios.post(`${API_URL}/ingestion/full`, {}, { 
      headers,
      timeout: 600000 // 10 minute timeout
    });
    
    const duration = (Date.now() - startTime) / 1000;
    
    if (response.data.success) {
      logSuccess(`Full ingestion completed in ${duration.toFixed(2)}s`);
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      logWarning('Ingestion completed with errors');
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    logError(`Full ingestion failed: ${error.message}`);
    if (error.response) {
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testIncrementalUpdate() {
  log('\n========== Testing Incremental Update ==========', colors.blue);
  
  try {
    // Test with last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const response = await axios.post(`${API_URL}/ingestion/incremental?since=${since}`, {}, { 
      headers,
      timeout: 300000 // 5 minute timeout
    });
    
    if (response.data.success) {
      logSuccess('Incremental update completed');
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      logWarning('Incremental update completed with errors');
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    logError(`Incremental update failed: ${error.message}`);
    if (error.response) {
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Main test runner
async function runTests() {
  log('\n╔══════════════════════════════════════════════════╗', colors.blue);
  log('║   RAG PHASE 1 DATA INGESTION PIPELINE TEST     ║', colors.blue);
  log('╚══════════════════════════════════════════════════╝', colors.blue);
  
  logInfo('Starting tests...\n');
  
  // Run tests in sequence
  await testHealthCheck();
  await testEmbeddingServiceHealth();
  await testVectorStoreHealth();
  await testStorageStats();
  await testCacheStats();
  await testIngestionStats();
  
  // Ask user if they want to run full ingestion (destructive)
  log('\n========== Full Ingestion Test ==========', colors.blue);
  logWarning('Full ingestion will process ALL activities and may take a long time.');
  logInfo('Skipping automatic full ingestion. To test manually, run:');
  log('  POST /api/ctxh-chat/ingestion/full\n', colors.cyan);
  
  // Test incremental update (safer)
  await testIncrementalUpdate();
  
  log('\n╔══════════════════════════════════════════════════╗', colors.green);
  log('║              TESTS COMPLETED                    ║', colors.green);
  log('╚══════════════════════════════════════════════════╝', colors.green);
  
  logInfo('\nNext steps:');
  log('  1. Test full ingestion manually via API endpoint', colors.cyan);
  log('  2. Monitor logs for any errors', colors.cyan);
  log('  3. Check storage stats after ingestion', colors.cyan);
  log('  4. Verify embeddings in database', colors.cyan);
}

// Run tests
runTests().catch(error => {
  logError(`Test runner failed: ${error.message}`);
  process.exit(1);
});
