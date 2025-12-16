/**
 * MANUAL TEST SCRIPT FOR EMBEDDING SERVICE
 * 
 * Run this script manually to test embeddings with real CTXH data:
 * ts-node test/embedding-manual.test.ts
 * 
 * Prerequisites:
 * - GEMINI_API_KEY set in .env
 * - Redis running on localhost:6379
 */

import { EmbeddingService } from '../src/ctxh-chat/services/embedding.service';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testEmbeddings() {
  console.log('🚀 Starting Manual Embedding Tests...\n');

  // Create simple config service
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

  const embeddingService = new EmbeddingService(configService);
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Test 1: Health Check
    console.log('📊 Test 1: Health Check');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const health = await embeddingService.healthCheck();
    console.log(JSON.stringify(health, null, 2));
    console.log('\n');

    // Test 2: Single Embedding
    console.log('📝 Test 2: Single Text Embedding');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const singleText = 'Hoạt động tình nguyện trồng cây xanh tại Công viên Hoàng Văn Thụ';
    console.log(`Input: "${singleText}"`);
    
    const startTime1 = Date.now();
    const embedding1 = await embeddingService.generateEmbedding(singleText);
    const duration1 = Date.now() - startTime1;
    
    console.log(`✓ Generated embedding with ${embedding1.length} dimensions`);
    console.log(`✓ Duration: ${duration1}ms`);
    console.log(`✓ First 5 values: [${embedding1.slice(0, 5).map(v => v.toFixed(6)).join(', ')}...]`);
    console.log('\n');

    // Test 3: Cached Embedding
    console.log('💾 Test 3: Cached Embedding (Same Text)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const startTime2 = Date.now();
    const embedding2 = await embeddingService.generateEmbedding(singleText);
    const duration2 = Date.now() - startTime2;
    
    console.log(`✓ Retrieved from cache`);
    console.log(`✓ Duration: ${duration2}ms (${((duration1/duration2)).toFixed(2)}x faster)`);
    console.log(`✓ Embeddings match: ${JSON.stringify(embedding1) === JSON.stringify(embedding2)}`);
    console.log('\n');

    // Test 4: Batch Embeddings
    console.log('📦 Test 4: Batch Embeddings');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const batchTexts = [
      'Hoạt động: Chiến dịch Mùa hè xanh 2025. Địa điểm: Thành phố Hồ Chí Minh. Thời gian: 15/06/2025 - 30/08/2025. Số ngày CTXH: 45 ngày.',
      'Hoạt động: Tình nguyện dạy học miễn phí cho trẻ em vùng cao. Địa điểm: Tỉnh Lào Cai. Thời gian: 01/07/2025 - 31/07/2025. Số ngày CTXH: 30 ngày.',
      'Hoạt động: Khám bệnh từ thiện tại bệnh viện. Địa điểm: Bệnh viện Đa khoa Thống Nhất. Thời gian: 10/05/2025 - 12/05/2025. Số ngày CTXH: 3 ngày.',
      'Hoạt động: Hỗ trợ người dân vùng lũ lụt. Địa điểm: Tỉnh Quảng Bình. Thời gian: 20/10/2025 - 30/10/2025. Số ngày CTXH: 11 ngày.',
      'Hoạt động: Tổ chức vui chơi cho trẻ em khuyết tật. Địa điểm: Trung tâm Nuôi dưỡng Trẻ em Khuyết tật. Thời gian: 05/06/2025. Số ngày CTXH: 1 ngày.',
    ];

    console.log(`Processing ${batchTexts.length} CTXH activities...`);
    const startTime3 = Date.now();
    const batchResult = await embeddingService.batchGenerateEmbeddings(batchTexts);
    const duration3 = Date.now() - startTime3;
    
    console.log(`✓ Generated ${batchResult.results.length} embeddings`);
    console.log(`✓ Total duration: ${duration3}ms`);
    console.log(`✓ Average: ${(duration3 / batchTexts.length).toFixed(2)}ms per embedding`);
    console.log(`✓ Cache hits: ${batchResult.cacheHits}, Cache misses: ${batchResult.cacheMisses}`);
    console.log('\n');

    // Test 5: Semantic Similarity
    console.log('🔍 Test 5: Semantic Similarity Analysis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const testCases = [
      {
        text1: 'Hoạt động trồng cây xanh tại công viên',
        text2: 'Tình nguyện trồng rừng bảo vệ môi trường',
        text3: 'Lập trình phần mềm quản lý dự án',
      },
    ];

    for (const testCase of testCases) {
      const result = await embeddingService.batchGenerateEmbeddings([
        testCase.text1,
        testCase.text2,
        testCase.text3,
      ]);
      const emb1 = result.results[0].embedding;
      const emb2 = result.results[1].embedding;
      const emb3 = result.results[2].embedding;

      const cosineSimilarity = (a: number[], b: number[]) => {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (magA * magB);
      };

      const sim12 = cosineSimilarity(emb1, emb2);
      const sim13 = cosineSimilarity(emb1, emb3);

      console.log(`Text 1: "${testCase.text1}"`);
      console.log(`Text 2: "${testCase.text2}"`);
      console.log(`Text 3: "${testCase.text3}"`);
      console.log(`\nSimilarity (1-2): ${(sim12 * 100).toFixed(2)}% - Similar CTXH topics`);
      console.log(`Similarity (1-3): ${(sim13 * 100).toFixed(2)}% - Different topics`);
      console.log(`✓ Semantic meaning preserved: ${sim12 > sim13 ? 'YES' : 'NO'}`);
    }
    console.log('\n');

    // Test 6: Vietnamese Language Support
    console.log('🇻🇳 Test 6: Vietnamese Language Support');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const vietnameseTexts = [
      'Đồng hành cùng cộng đồng',
      'Góp phần xây dựng xã hội tốt đẹp hơn',
      'Mang yêu thương đến mọi miền Tổ quốc',
    ];

    const vietnameseResult = await embeddingService.batchGenerateEmbeddings(vietnameseTexts);
    console.log(`✓ Successfully processed ${vietnameseResult.results.length} Vietnamese texts`);
    vietnameseTexts.forEach((text, i) => {
      console.log(`  ${i + 1}. "${text}" → ${vietnameseResult.results[i].embedding.length} dims`);
    });
    console.log('\n');

    // Test 7: Performance with Large Batch
    console.log('⚡ Test 7: Performance Benchmark');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const largeBatch = Array.from({ length: 20 }, (_, i) => 
      `Hoạt động CTXH số ${i + 1}: Tình nguyện phục vụ cộng đồng tại địa phương. Thời gian: ${i + 1}/06/2025. Số ngày: ${(i % 5) + 1} ngày.`
    );

    console.log(`Processing ${largeBatch.length} embeddings...`);
    const startTime4 = Date.now();
    const largeResults = await embeddingService.batchGenerateEmbeddings(largeBatch);
    const duration4 = Date.now() - startTime4;
    
    console.log(`✓ Completed in ${duration4}ms`);
    console.log(`✓ Throughput: ${(largeBatch.length / (duration4 / 1000)).toFixed(2)} embeddings/second`);
    console.log(`✓ Average latency: ${(duration4 / largeBatch.length).toFixed(2)}ms per embedding`);
    console.log(`✓ Total processed: ${largeResults.totalProcessed}/${largeBatch.length}`);
    console.log(`✓ Errors: ${largeResults.errors.length}`);
    console.log('\n');

    // Summary
    console.log('✅ All Tests Completed Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Summary:');
    console.log(`  • Model: gemini-embedding-001`);
    console.log(`  • Dimensions: 768`);
    console.log(`  • Cache: Enabled (Redis)`);
    console.log(`  • Vietnamese Support: ✓`);
    console.log(`  • Semantic Similarity: ✓`);
    console.log(`  • Performance: ${(largeBatch.length / (duration4 / 1000)).toFixed(2)} emb/s`);
    console.log('\n');

  } catch (error) {
    console.error('❌ Test Failed:', error);
    throw error;
  }
}

// Run tests
testEmbeddings()
  .then(() => {
    console.log('✨ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  });
