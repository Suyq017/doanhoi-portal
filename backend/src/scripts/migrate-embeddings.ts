import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { LangChainIngestionService } from '../ctxh-chat/services/langchain-ingestion.service';
import { UniversalEmbeddingsService } from '../ctxh-chat/services/universal-embeddings.service';

/**
 * Migrate Embeddings Script
 * Re-generates all embeddings using the currently configured model.
 * Use this when switching between Ollama and Gemini as they have different dimensions.
 * 
 * ⚠️  WARNING: This will clear and regenerate ALL embeddings!
 * 
 * Usage: npm run migrate:embeddings
 */
async function migrateEmbeddings() {
  console.log('\n🚀 Starting embedding migration...\n');

  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    const embeddingsService = app.get(UniversalEmbeddingsService);
    const ingestionService = app.get(LangChainIngestionService);

    const isLocalModel = embeddingsService.isUsingLocalModel();
    const modelType = isLocalModel
      ? `Ollama ${embeddingsService.getModelName()} (${embeddingsService.getDimension()}d)`
      : `Gemini ${embeddingsService.getModelName()} (${embeddingsService.getDimension()}d)`;

    console.log('================================');
    console.log('📊 Migration Configuration:');
    console.log('================================');
    console.log(`Target Model: ${modelType}`);
    console.log(`Dimension: ${embeddingsService.getDimension()}`);
    console.log('================================\n');

    console.log('⚠️  WARNING: This will re-generate ALL embeddings!');
    console.log('⚠️  Make sure to backup your database before proceeding.\n');

    // Verify embeddings service is healthy
    console.log('🔄 Verifying embeddings service...');
    const isHealthy = await embeddingsService.healthCheck();
    
    if (!isHealthy) {
      console.error('❌ Embeddings service health check failed!');
      console.log('\nPlease ensure:');
      
      if (isLocalModel) {
        console.log('1. Ollama is running at the configured URL');
        console.log('2. The embedding model is pulled: ollama pull bge-m3');
      } else {
        console.log('1. GEMINI_API_KEY is correctly set');
        console.log('2. You have API quota remaining');
      }
      
      await app.close();
      process.exit(1);
    }

    console.log('✅ Embeddings service is healthy\n');

    // Run full ingestion
    console.log('🔄 Starting full re-ingestion...\n');
    
    const result = await ingestionService.runFullIngestion();

    console.log('\n================================');
    console.log('📊 Migration Results:');
    console.log('================================');
    console.log(`Total Activities: ${result.totalActivities}`);
    console.log(`Processed: ${result.processedActivities}`);
    console.log(`Embeddings Created: ${result.totalEmbeddings}`);
    console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors encountered:');
      result.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }
    
    console.log('================================\n');

    if (result.errors.length === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('⚠️  Migration completed with some errors.');
    }

    await app.close();
    process.exit(result.errors.length === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateEmbeddings();
