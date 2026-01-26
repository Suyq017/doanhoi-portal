import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import "reflect-metadata";

// Load environment variables
dotenv.config();

// Helper functions to get database configuration
const getDatabaseHost = (): string => {
  return process.env.NODE_ENV === "production"
    ? process.env.DB_HOST_PROD || "localhost"
    : process.env.DB_HOST || "localhost";
};

const getDatabasePort = (): number => {
  const port =
    process.env.NODE_ENV === "production"
      ? process.env.DB_PORT_PROD
      : process.env.DB_PORT;
  return port ? parseInt(port, 10) : 5432;
};

const getDatabasePassword = (): string => {
  return process.env.NODE_ENV === "production"
    ? process.env.DB_PASSWORD_PROD || ""
    : process.env.DB_PASSWORD || "";
};

// Create DataSource
const AppDataSource = new DataSource({
  type: "postgres",
  host: getDatabaseHost(),
  port: getDatabasePort(),
  username: process.env.DB_USERNAME || "postgres",
  password: getDatabasePassword(),
  database: process.env.DB_NAME || "doanhoi_db",
  synchronize: false,
  logging: true,
});

async function addCtxhColumnsAndUpdateActivityDates() {
  console.log("🔄 Connecting to database...");
  console.log(`Host: ${getDatabaseHost()}`);
  console.log(`Port: ${getDatabasePort()}`);
  console.log(`Database: ${process.env.DB_NAME || "doanhoi_db"}`);

  await AppDataSource.initialize();
  console.log("✅ Connected to database");

  const queryRunner = AppDataSource.createQueryRunner();

  try {
    // 1. Add ctxh_days and ctxh_days_old_system columns to users table
    console.log(
      "🔄 Adding ctxh_days and ctxh_days_old_system columns to users table...",
    );

    await queryRunner.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS ctxh_days DECIMAL(5,1) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS ctxh_days_old_system DECIMAL(5,1) DEFAULT 0;
        `);
    console.log(
      "✅ Added ctxh_days and ctxh_days_old_system columns to users table",
    );

    // 2. Add comments to the new columns
    await queryRunner.query(`
            COMMENT ON COLUMN users.ctxh_days IS 'Tổng số ngày CTXH hiện tại';
        `);

    await queryRunner.query(`
            COMMENT ON COLUMN users.ctxh_days_old_system IS 'Số ngày CTXH từ hệ thống cũ';
        `);
    console.log("✅ Added column comments");

    // 3. Change start_date and end_date in ctxh_activities table from DATE to TIMESTAMP
    console.log(
      "🔄 Updating ctxh_activities start_date and end_date to TIMESTAMP...",
    );

    // Check if table exists
    const tableExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'ctxh_activities'
            );
        `);

    if (tableExists[0].exists) {
      // Alter column types
      await queryRunner.query(`
                ALTER TABLE ctxh_activities 
                ALTER COLUMN start_date TYPE TIMESTAMP WITH TIME ZONE USING start_date::TIMESTAMP WITH TIME ZONE,
                ALTER COLUMN end_date TYPE TIMESTAMP WITH TIME ZONE USING end_date::TIMESTAMP WITH TIME ZONE;
            `);
      console.log(
        "✅ Updated ctxh_activities date columns to TIMESTAMP WITH TIME ZONE",
      );
    } else {
      console.log(
        "⚠️  Table ctxh_activities does not exist yet, will be created with correct types",
      );
    }

    // 4. Create indexes for better query performance
    console.log("🔄 Creating indexes...");

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_users_ctxh_days ON users(ctxh_days);
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_users_ctxh_days_old_system ON users(ctxh_days_old_system);
        `);
    console.log("✅ Indexes created");

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error during migration:", error);
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
    console.log("✅ Database connection closed");
  }
}

// Run migration
addCtxhColumnsAndUpdateActivityDates()
  .then(() => {
    console.log("✅ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
