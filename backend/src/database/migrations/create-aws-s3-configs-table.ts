import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import 'reflect-metadata';

// Load environment variables
dotenv.config();

// Helper functions to get database configuration
const getDatabaseHost = (): string => {
    return process.env.NODE_ENV === 'production'
        ? process.env.DB_HOST_PROD || 'localhost'
        : process.env.DB_HOST || 'localhost';
};

const getDatabasePort = (): number => {
    const port = process.env.NODE_ENV === 'production'
        ? process.env.DB_PORT_PROD
        : process.env.DB_PORT;
    return port ? parseInt(port, 10) : 5432;
};

const getDatabasePassword = (): string => {
    return process.env.NODE_ENV === 'production'
        ? process.env.DB_PASSWORD_PROD || ''
        : process.env.DB_PASSWORD || '';
};

// Create DataSource
const AppDataSource = new DataSource({
    type: 'postgres',
    host: getDatabaseHost(),
    port: getDatabasePort(),
    username: process.env.DB_USERNAME || 'postgres',
    password: getDatabasePassword(),
    database: process.env.DB_NAME || 'doanhoi_db',
    synchronize: false,
    logging: true,
});

async function createAwsS3ConfigsTable() {
    console.log('🔄 Connecting to database...');
    console.log(`Host: ${getDatabaseHost()}`);
    console.log(`Port: ${getDatabasePort()}`);
    console.log(`Database: ${process.env.DB_NAME || 'doanhoi_db'}`);

    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    const queryRunner = AppDataSource.createQueryRunner();

    try {
        console.log('🔄 Creating aws_s3_configs table...');

        // Create table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS aws_s3_configs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        access_key_id VARCHAR(255) NOT NULL,
        secret_access_key VARCHAR(255) NOT NULL,
        region VARCHAR(100) NOT NULL,
        s3_bucket VARCHAR(255) NOT NULL,
        s3_endpoint VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Table aws_s3_configs created');

        // Create index on is_active
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_aws_s3_configs_is_active 
      ON aws_s3_configs(is_active);
    `);
        console.log('✅ Index on is_active created');

        // Create function for auto-updating updated_at
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_aws_s3_configs_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
        console.log('✅ Function update_aws_s3_configs_updated_at created');

        // Create trigger
        await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_aws_s3_configs_updated_at ON aws_s3_configs;
      
      CREATE TRIGGER trigger_update_aws_s3_configs_updated_at
        BEFORE UPDATE ON aws_s3_configs
        FOR EACH ROW
        EXECUTE FUNCTION update_aws_s3_configs_updated_at();
    `);
        console.log('✅ Trigger trigger_update_aws_s3_configs_updated_at created');

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Error during migration:', error);
        throw error;
    } finally {
        await queryRunner.release();
        await AppDataSource.destroy();
        console.log('✅ Database connection closed');
    }
}

// Run migration
createAwsS3ConfigsTable()
    .then(() => {
        console.log('✅ All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
