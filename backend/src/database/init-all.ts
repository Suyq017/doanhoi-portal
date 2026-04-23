import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { Client } from "pg";
import { seedPermissions } from "./seeds/permissions.seed";
import { seedRoles } from "./seeds/roles.seed";
import { seedDefaultUsers } from "./seeds/default-users.seed";
import { addCtxhImportPermissions } from "./scripts/add-ctxh-import-permissions";
import { addTemplatePermissions } from "./scripts/add-template-permissions";

// Load environment variables
dotenv.config();

function getDatabaseHost(): string {
  const envHost = process.env.DB_HOST;
  if (envHost) return envHost;
  return "127.0.0.1";
}

function getDatabasePort(): number {
  const envPort = process.env.DB_PORT;
  if (envPort) return parseInt(envPort);
  return 9000;
}

function getDatabasePassword(): string {
  return process.env.DB_PASSWORD || "password";
}

const dbConfig = {
  host: getDatabaseHost(),
  port: getDatabasePort(),
  username: process.env.DB_USERNAME || "postgres",
  password: getDatabasePassword(),
  database: process.env.DB_NAME || "doanhoi",
};

async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (error) {
    console.error(`  ❌ ${name}:`, error.message);
    throw error;
  }
}

async function runPgVectorSetup() {
  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
  });

  await client.connect();

  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");

    await client.query(`
      CREATE TABLE IF NOT EXISTS ctxh_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_id UUID NOT NULL REFERENCES ctxh_activity(id) ON DELETE CASCADE,
        content_text TEXT NOT NULL,
        embedding vector(1024),
        chunk_index INTEGER DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_activity_id ON ctxh_embeddings(activity_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_vector ON ctxh_embeddings USING hnsw (embedding vector_cosine_ops)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_metadata ON ctxh_embeddings USING gin (metadata)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_chunk_index ON ctxh_embeddings(activity_id, chunk_index)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_created_at ON ctxh_embeddings(created_at)`);

    // Trigger for updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'update_ctxh_embeddings_updated_at'
        ) THEN
          CREATE TRIGGER update_ctxh_embeddings_updated_at
          BEFORE UPDATE ON ctxh_embeddings
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$
    `);
  } finally {
    await client.end();
  }
}

async function runCtxhRegistrationMigrations() {
  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
  });

  await client.connect();

  const migrations = [
    `ALTER TABLE "ctxh_activity" ADD COLUMN IF NOT EXISTS "requires_approval" boolean NOT NULL DEFAULT false`,
    `ALTER TABLE "ctxh_activity" ADD COLUMN IF NOT EXISTS "max_participants" integer`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_ctxh_activity_max_participants_non_negative') THEN
        ALTER TABLE "ctxh_activity" ADD CONSTRAINT "CHK_ctxh_activity_max_participants_non_negative" CHECK ("max_participants" IS NULL OR "max_participants" >= 0);
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ctxh_participation_status_enum') THEN
        ALTER TYPE "ctxh_participation_status_enum" ADD VALUE IF NOT EXISTS 'PENDING';
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ctxh_participation_status_enum') THEN
        ALTER TYPE "ctxh_participation_status_enum" ADD VALUE IF NOT EXISTS 'APPROVED';
      END IF;
    END $$`,
    `UPDATE "ctxh_participation" SET "status" = 'APPROVED' WHERE "status" = 'REGISTERED'`,
  ];

  try {
    for (const sql of migrations) {
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║      Đoàn Hội Portal - Database Init All       ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`\n📡 ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}\n`);

  // Phase 1: Create schema via TypeORM synchronize
  console.log("── Phase 1: Schema ──────────────────────────────");
  const dataSource = new DataSource({
    type: "postgres",
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    entities: [__dirname + "/../**/*.entity{.ts,.js}"],
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();
  await step("Schema synced (TypeORM synchronize)", async () => {});

  // Phase 2: Seeds (permissions → roles → users)
  console.log("\n── Phase 2: Seed Data ───────────────────────────");
  await step("Permissions seeded", () => seedPermissions(dataSource));
  await step("Roles seeded (Super Admin)", () => seedRoles(dataSource));
  await step("Default users & orgs seeded", () => seedDefaultUsers(dataSource));

  // Phase 3: Update permissions (add-ons)
  console.log("\n── Phase 3: Permission Updates ──────────────────");
  await step("CTXH import permissions added", () => addCtxhImportPermissions(dataSource));
  await step("Template permissions added", () => addTemplatePermissions(dataSource));

  // Phase 4: CTXH registration migrations
  console.log("\n── Phase 4: CTXH Migrations ─────────────────────");
  await step("CTXH registration columns migrated", runCtxhRegistrationMigrations);

  // Phase 5: pgVector setup
  console.log("\n── Phase 5: pgVector Setup ──────────────────────");
  await step("pgVector extension & ctxh_embeddings table", runPgVectorSetup);

  await dataSource.destroy();

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║         🎉 Init hoàn tất!                       ║");
  console.log("║                                                  ║");
  console.log("║  Login: admin@doanhoi.com / admin1               ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
}

main().catch((err) => {
  console.error("\n💥 Init failed:", err.message);
  process.exit(1);
});
