import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 9000,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'doanhoi',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
    logging: false,
});

async function createSchema() {
    try {
        console.log('🔄 Connecting to database...');
        await AppDataSource.initialize();

        console.log('✅ Database schema synchronized successfully!');
        console.log('📋 Tables created:');

        // List all tables
        const queryRunner = AppDataSource.createQueryRunner();
        const tables = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

        tables.forEach((table: any) => {
            console.log(`  - ${table.table_name}`);
        });

        await queryRunner.release();
        await AppDataSource.destroy();

        console.log('✅ Schema creation completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating schema:', error);
        process.exit(1);
    }
}

createSchema();
