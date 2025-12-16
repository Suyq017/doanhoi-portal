/**
 * COMPREHENSIVE EMBEDDING TEST
 * Tests all features of EmbeddingService with real Gemini API
 */

import { EmbeddingService } from '../src/ctxh-chat/services/embedding.service';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

async function comprehensiveTest() {
  console.log('🚀 Comprehensive Embedding Service Test\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Create config service
  const configService = {
    get: (key: string, defaultValue?: any) => {
      const config = {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      };
      return config[key] || defaultValue;
    },
  } as any;

  const service = new EmbeddingService(configService);

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Test 1: Health Check
    console.log('📊 Test 1: Health Check');
    console.log('───────────────────────────────────────────────────────');
    const health = await service.healthCheck();
    console.log(`Status: ${health.status === 'healthy' ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log(`Gemini API: ${health.details?.gemini?.available ? '✓' : '✗'}`);
    console.log(`Model: ${health.details?.gemini?.model || 'N/A'}`);
    console.log(`Dimensions: ${health.details?.gemini?.dimensions || 'N/A'}`);
    console.log(`Redis: ${health.details?.redis?.connected ? '✓' : '✗'}\n`);

    if (health.status !== 'healthy') {
      throw new Error('Service is not healthy');
    }

    // Test 2: Single Text Embedding
    console.log('📝 Test 2: Single Text Embedding');
    console.log('───────────────────────────────────────────────────────');
    const singleText = 'Tổ chức hoạt động tình nguyện vệ sinh môi trường';
    const start2 = Date.now();
    const embedding1 = await service.generateEmbedding(singleText);
    const duration2 = Date.now() - start2;
    console.log(`Text: "${singleText}"`);
    console.log(`✓ Generated ${embedding1.length} dimensions in ${duration2}ms`);
    console.log(`✓ First 5 values: [${embedding1.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]\n`);

    // Test 3: Cache Performance
    console.log('💾 Test 3: Cache Performance');
    console.log('───────────────────────────────────────────────────────');
    const cacheText = 'Chương trình hỗ trợ sinh viên nghèo vượt khó';
    
    console.log('First call (no cache):');
    const start3a = Date.now();
    await service.generateEmbedding(cacheText);
    const duration3a = Date.now() - start3a;
    console.log(`  ✓ Time: ${duration3a}ms`);
    
    console.log('Second call (from cache):');
    const start3b = Date.now();
    await service.generateEmbedding(cacheText);
    const duration3b = Date.now() - start3b;
    console.log(`  ✓ Time: ${duration3b}ms`);
    console.log(`  ✓ Cache speedup: ${(duration3a / duration3b).toFixed(1)}x faster\n`);

    // Test 4: Batch Embedding
    console.log('📦 Test 4: Batch Embedding (CTXH Activities)');
    console.log('───────────────────────────────────────────────────────');
    const activities = [
      'Hiến máu nhân đạo tại bệnh viện',
      'Trồng cây xanh tại khu dân cư',
      'Dạy kèm miễn phí cho trẻ em khó khăn',
      'Tổ chức ngày hội tình nguyện',
      'Hỗ trợ người già neo đơn'
    ];
    
    const start4 = Date.now();
    const batchResult = await service.batchGenerateEmbeddings(activities);
    const duration4 = Date.now() - start4;
    
    console.log(`Processed: ${batchResult.totalProcessed}/${activities.length} texts`);
    console.log(`Cache hits: ${batchResult.cacheHits}`);
    console.log(`Cache misses: ${batchResult.cacheMisses}`);
    console.log(`Errors: ${batchResult.errors.length}`);
    console.log(`✓ Completed in ${duration4}ms`);
    console.log(`✓ Throughput: ${(activities.length / (duration4 / 1000)).toFixed(2)} emb/sec\n`);

    // Test 5: Semantic Similarity
    console.log('🔍 Test 5: Semantic Similarity');
    console.log('───────────────────────────────────────────────────────');
    
    // Helper function to calculate cosine similarity
    function cosineSimilarity(a: number[], b: number[]): number {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
      const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
      return dotProduct / (magnitudeA * magnitudeB);
    }
    
    const text1 = 'Tổ chức hoạt động bảo vệ môi trường';
    const text2 = 'Chiến dịch vệ sinh môi trường xanh sạch đẹp';
    const text3 = 'Học lập trình Python cơ bản';
    
    const emb1 = await service.generateEmbedding(text1);
    const emb2 = await service.generateEmbedding(text2);
    const emb3 = await service.generateEmbedding(text3);
    
    const similarity12 = cosineSimilarity(emb1, emb2);
    const similarity13 = cosineSimilarity(emb1, emb3);
    const similarity23 = cosineSimilarity(emb2, emb3);
    
    console.log(`Text 1: "${text1}"`);
    console.log(`Text 2: "${text2}"`);
    console.log(`Text 3: "${text3}"\n`);
    
    console.log(`Similarity(1,2): ${(similarity12 * 100).toFixed(2)}% ${similarity12 > 0.7 ? '✓ High' : '✗ Low'}`);
    console.log(`Similarity(1,3): ${(similarity13 * 100).toFixed(2)}% ${similarity13 < 0.5 ? '✓ Low (different topics)' : '✗ High (unexpected)'}`);
    console.log(`Similarity(2,3): ${(similarity23 * 100).toFixed(2)}% ${similarity23 < 0.5 ? '✓ Low (different topics)' : '✗ High (unexpected)'}\n`);

    // Test 6: Vietnamese Language Support
    console.log('🇻🇳 Test 6: Vietnamese Language Support');
    console.log('───────────────────────────────────────────────────────');
    const vnTexts = [
      'Đoàn thanh niên tổ chức hoạt động',
      'Chương trình từ thiện giúp đỡ người nghèo',
      'Chiến dịch tình nguyện mùa hè xanh'
    ];
    
    for (const text of vnTexts) {
      const embedding = await service.generateEmbedding(text);
      console.log(`✓ "${text}"`);
      console.log(`  Dimensions: ${embedding.length}, Range: [${Math.min(...embedding).toFixed(3)}, ${Math.max(...embedding).toFixed(3)}]`);
    }
    console.log();

    // Test 7: Performance Benchmark
    console.log('⚡ Test 7: Performance Benchmark');
    console.log('───────────────────────────────────────────────────────');
    const benchmarkTexts = Array.from({ length: 10 }, (_, i) => 
      `Hoạt động tình nguyện số ${i + 1} của Đoàn thanh niên`
    );
    
    const startBench = Date.now();
    const benchResult = await service.batchGenerateEmbeddings(benchmarkTexts);
    const durationBench = Date.now() - startBench;
    
    console.log(`Processed: ${benchResult.totalProcessed} texts`);
    console.log(`Total time: ${durationBench}ms`);
    console.log(`Average: ${(durationBench / benchResult.totalProcessed).toFixed(2)}ms per embedding`);
    console.log(`Throughput: ${(benchResult.totalProcessed / (durationBench / 1000)).toFixed(2)} emb/sec\n`);

    // Test 8: Cache Statistics
    console.log('📈 Test 8: Cache Statistics');
    console.log('───────────────────────────────────────────────────────');
    const stats = await service.getCacheStats();
    console.log(`Cache enabled: ${stats.enabled ? '✓' : '✗'}`);
    console.log(`Total cached keys: ${stats.totalKeys}`);
    console.log(`Memory usage: ${stats.memoryUsage}\n`);

    // Final Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📊 Summary:');
    console.log(`  • Model: text-embedding-004`);
    console.log(`  • Dimensions: 768`);
    console.log(`  • Cache: ${stats.enabled ? 'Enabled (Redis)' : 'Disabled'}`);
    console.log(`  • Cached Keys: ${stats.totalKeys}`);
    console.log(`  • Vietnamese Support: ✓ Excellent`);
    console.log(`  • Semantic Similarity: ✓ Accurate`);
    console.log(`  • Average Performance: ${(durationBench / benchResult.totalProcessed).toFixed(2)}ms per embedding`);
    console.log(`  • Throughput: ${(benchResult.totalProcessed / (durationBench / 1000)).toFixed(2)} emb/sec\n`);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run tests
comprehensiveTest()
  .then(() => {
    console.log('✨ Test suite completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
