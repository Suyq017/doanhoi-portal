/**
 * QUICK TEST SCRIPT - Kiểm tra nhanh EmbeddingService
 * 
 * Chạy: cd backend && npm run test:embedding:quick
 */

import { EmbeddingService } from '../src/ctxh-chat/services/embedding.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

async function quickTest() {
  console.log('🚀 Quick Embedding Test\n');

  // Create mock config
  const configService = {
    get: (key: string, defaultValue?: any) => {
      const config = {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      };
      return config[key];
    },
  } as any;

  const service = new EmbeddingService(configService);

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Test 1: Health Check
    console.log('📊 Test 1: Health Check');
    const health = await service.healthCheck();
    console.log(`Status: ${health.status}`);
    console.log(`Gemini: ${health.details?.gemini?.available ? '✓' : '✗'}`);
    console.log(`Redis: ${health.details?.redis?.connected ? '✓' : '✗'}`);
    console.log();

    if (health.status !== 'healthy') {
      console.log('⚠️  Service not healthy. Check:');
      console.log('   - GEMINI_API_KEY is set in .env');
      console.log('   - Redis is running on localhost:6379');
      process.exit(1);
    }

    // Test 2: Single Embedding
    console.log('📝 Test 2: Single Embedding');
    const testText = 'Hoạt động CTXH tình nguyện';
    const embedding = await service.generateEmbedding(testText);
    console.log(`✓ Generated ${embedding.length} dimensions`);
    console.log(`✓ First 3 values: [${embedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}]`);
    console.log();

    // Test 3: Cache Check
    console.log('💾 Test 3: Cache Performance');
    const start1 = Date.now();
    await service.generateEmbedding(testText);
    const duration1 = Date.now() - start1;
    console.log(`✓ Cached retrieval: ${duration1}ms`);
    console.log();

    // Test 4: Batch Embedding
    console.log('📦 Test 4: Batch Embedding');
    const batchTexts = [
      'Hoạt động 1',
      'Hoạt động 2',
      'Hoạt động 3',
    ];
    const result = await service.batchGenerateEmbeddings(batchTexts);
    console.log(`✓ Generated ${result.results.length} embeddings`);
    console.log(`✓ Cache hits: ${result.cacheHits}`);
    console.log(`✓ Cache misses: ${result.cacheMisses}`);
    console.log();

    // Test 5: Config
    console.log('⚙️  Test 5: Configuration');
    const config = service.getConfig();
    console.log(`Model: ${config.model}`);
    console.log(`Dimensions: ${config.dimensions}`);
    console.log(`Batch size: ${config.batchSize}`);
    console.log(`Cache enabled: ${config.cacheEnabled}`);
    console.log();

    console.log('✅ All tests passed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

quickTest();
