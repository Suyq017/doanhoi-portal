import { DataSource } from "typeorm";
import { seedPermissions } from "./permissions.seed";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "doanhoi",
  entities: ["src/entities/**/*.entity.ts"],
  migrations: ["src/database/migrations/**/*.ts"],
  synchronize: false,
  logging: false,
});

async function runSeed() {
  try {
    console.log("🔄 Initializing database connection...");
    await AppDataSource.initialize();
    console.log("✅ Database connected successfully!");

    console.log("🌱 Starting permissions seed...");
    await seedPermissions(AppDataSource);
    console.log("✅ Permissions seed completed successfully!");

    await AppDataSource.destroy();
    console.log("👋 Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during seed:", error);
    process.exit(1);
  }
}

runSeed();
