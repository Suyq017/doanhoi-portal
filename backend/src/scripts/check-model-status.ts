import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UniversalEmbeddingsService } from '../ctxh-chat/services/universal-embeddings.service';
import { UniversalLLMService } from '../ctxh-chat/services/universal-llm.service';

/**
 * Check Model Status Script
 * Verifies the current AI model configuration (Ollama or Gemini)
 * and performs health checks on both embeddings and LLM services.
 * 
 * Usage: npm run check:models
 */
async function checkModelStatus() {
  console.log('\n🔍 Initializing application...\n');

  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });

    const embeddingsService = app.get(UniversalEmbeddingsService);
    const llmService = app.get(UniversalLLMService);

    const isLocalModel = embeddingsService.isUsingLocalModel();

    console.log('================================');
    console.log('📊 Current Model Configuration:');
    console.log('================================');
    console.log(`Mode: ${isLocalModel ? '🏠 LOCAL (Ollama)' : '☁️  CLOUD (Gemini)'}`);
    console.log('');
    console.log('Embeddings:');
    console.log(`  Model: ${embeddingsService.getModelName()}`);
    console.log(`  Dimension: ${embeddingsService.getDimension()}`);
    console.log('');
    console.log('LLM:');
    console.log(`  Model: ${llmService.getModelName()}`);
    console.log('================================\n');

    console.log('🔄 Running health checks...\n');

    const embeddingsHealth = await embeddingsService.healthCheck();
    const llmHealth = await llmService.healthCheck();

    console.log('\n================================');
    console.log('🏥 Health Check Results:');
    console.log('================================');
    console.log(`Embeddings: ${embeddingsHealth ? '✅ OK' : '❌ FAILED'}`);
    console.log(`LLM: ${llmHealth ? '✅ OK' : '❌ FAILED'}`);
    console.log('================================\n');

    if (!embeddingsHealth || !llmHealth) {
      console.log('⚠️  Some health checks failed!');
      
      if (isLocalModel) {
        console.log('\n📋 Troubleshooting for Ollama:');
        console.log('1. Check if Ollama is running: curl http://localhost:11434/api/tags');
        console.log('2. Verify models are installed: ollama list');
        console.log('3. Pull missing models:');
        console.log('   ollama pull bge-m3');
        console.log('   ollama pull qwen2.5:7b');
      } else {
        console.log('\n📋 Troubleshooting for Gemini:');
        console.log('1. Verify GEMINI_API_KEY is set in .env');
        console.log('2. Check API key validity at https://aistudio.google.com/');
        console.log('3. Ensure you have quota remaining');
      }
    }

    await app.close();
    process.exit(embeddingsHealth && llmHealth ? 0 : 1);
  } catch (error) {
    console.error('❌ Error checking model status:', error.message);
    process.exit(1);
  }
}

checkModelStatus();
