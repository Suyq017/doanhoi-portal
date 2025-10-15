import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Function to get proper database host
function getDatabaseHost(): string {
    const envHost = process.env.DB_HOST;
    if (envHost) return envHost;

    const envPort = process.env.DB_PORT;
    if (envPort === '2679') {
        return 'doanhoi-postgres-prod';
    }

    return '127.0.0.1';
}

// Function to get proper database port
function getDatabasePort(): number {
    const envPort = process.env.DB_PORT;
    if (envPort) {
        if (envPort === '2679') {
            return 5432;
        }
        return parseInt(envPort);
    }

    return 9000;
}

// Function to get database password
function getDatabasePassword(): string {
    const envPassword = process.env.DB_PASSWORD;
    if (envPassword) return envPassword;

    if (process.env.NODE_ENV === 'production') {
        return 'your_secure_password';
    }

    return 'password';
}

const AppDataSource = new DataSource({
    type: 'postgres',
    host: getDatabaseHost(),
    port: getDatabasePort(),
    username: process.env.DB_USERNAME || 'postgres',
    password: getDatabasePassword(),
    database: process.env.DB_NAME || 'doanhoi',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false, // Don't auto-sync, we'll do it manually
    logging: false,
});

async function resetDatabase() {
    try {
        console.log('🔄 Connecting to database...');
        console.log(`📡 Host: ${getDatabaseHost()}:${getDatabasePort()}`);
        console.log(`🗄️  Database: ${process.env.DB_NAME || 'doanhoi'}`);

        await AppDataSource.initialize();
        console.log('✅ Connected to database');

        const queryRunner = AppDataSource.createQueryRunner();

        // Step 1: Drop all tables
        console.log('\n🗑️  Dropping all existing tables...');

        // Get all table names
        const tables = await queryRunner.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);

        if (tables.length > 0) {
            console.log(`   Found ${tables.length} tables to drop:`);
            tables.forEach((table: any) => {
                console.log(`   - ${table.table_name}`);
            });

            // Drop all tables with CASCADE
            for (const table of tables) {
                await queryRunner.query(`DROP TABLE IF EXISTS "${table.table_name}" CASCADE;`);
                console.log(`   ✓ Dropped: ${table.table_name}`);
            }
            console.log('✅ All tables dropped successfully');
        } else {
            console.log('   No tables found to drop');
        }

        // Step 2: Drop all sequences
        console.log('\n🗑️  Dropping all sequences...');
        const sequences = await queryRunner.query(`
            SELECT sequence_name 
            FROM information_schema.sequences 
            WHERE sequence_schema = 'public'
            ORDER BY sequence_name;
        `);

        if (sequences.length > 0) {
            console.log(`   Found ${sequences.length} sequences to drop`);
            for (const seq of sequences) {
                await queryRunner.query(`DROP SEQUENCE IF EXISTS "${seq.sequence_name}" CASCADE;`);
                console.log(`   ✓ Dropped: ${seq.sequence_name}`);
            }
            console.log('✅ All sequences dropped successfully');
        } else {
            console.log('   No sequences found to drop');
        }

        // Step 3: Synchronize schema (create all tables fresh)
        console.log('\n🔨 Creating fresh database schema...');
        await AppDataSource.synchronize(true); // force = true will drop and recreate
        console.log('✅ Fresh schema created successfully');

        // Step 4: List new tables
        console.log('\n📋 New tables created:');
        const newTables = await queryRunner.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);

        newTables.forEach((table: any) => {
            console.log(`  ✓ ${table.table_name}`);
        });

        await queryRunner.release();
        await AppDataSource.destroy();

        console.log('\n✅ Database reset completed successfully!');
        console.log('📝 Next step: Run "npm run seed" to populate initial data');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting database:', error);
        console.log('\n💡 Troubleshooting tips:');
        console.log('  1. Check if PostgreSQL container is running: docker-compose ps');
        console.log('  2. Check container logs: docker-compose logs postgres');
        console.log('  3. Verify database connection in .env file');
        console.log('  4. Ensure you have proper permissions to drop tables');
        process.exit(1);
    }
}

resetDatabase();
