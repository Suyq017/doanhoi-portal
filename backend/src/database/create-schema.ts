import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Function to get proper database host
function getDatabaseHost(): string {
  const envHost = process.env.DB_HOST;
  if (envHost) return envHost;
  
  // Check if we're trying to connect to production port 2679
  const envPort = process.env.DB_PORT;
  if (envPort === '2679') {
    // Production: Connect via Docker network
    return 'doanhoi-postgres-prod';
  }
  
  // Development: Use localhost
  return '127.0.0.1';
}

// Function to get proper database port
function getDatabasePort(): number {
  const envPort = process.env.DB_PORT;
  if (envPort) {
    // If connecting to production via Docker network, use internal port
    if (envPort === '2679') {
      return 5432; // Internal PostgreSQL port
    }
    return parseInt(envPort);
  }
  
  return 9000; // Default development port
}

// Function to get database password
function getDatabasePassword(): string {
  const envPassword = process.env.DB_PASSWORD;
  if (envPassword) return envPassword;
  
  // Check if this is production environment
  if (process.env.NODE_ENV === 'production') {
    return 'your_secure_password'; // Production default
  }
  
  return 'password'; // Development default
}

const AppDataSource = new DataSource({
  type: 'postgres',
  host: getDatabaseHost(),
  port: getDatabasePort(),
  username: process.env.DB_USERNAME || 'postgres',
  password: getDatabasePassword(),
  database: process.env.DB_NAME || 'doanhoi',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
  logging: false,
});

async function createSchema() {
  try {
    console.log('🔄 Connecting to database...');
    console.log(`📡 Host: ${getDatabaseHost()}:${parseInt(process.env.DB_PORT) || 9000}`);
    
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
    console.log('💡 Troubleshooting tips:');
    console.log('  1. Check if PostgreSQL container is running: docker-compose ps');
    console.log('  2. Check container logs: docker-compose logs postgres');
    console.log('  3. Try connecting to postgres container: docker-compose exec postgres psql -U postgres');
    console.log('  4. Check .env file for correct database settings');
    process.exit(1);
  }
}

createSchema();
