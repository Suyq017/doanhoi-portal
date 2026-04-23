const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 9000),
    user: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'doanhoi',
  });

  const steps = [
    {
      name: 'Add requires_approval to ctxh_activity',
      sql: `
        ALTER TABLE "ctxh_activity"
        ADD COLUMN IF NOT EXISTS "requires_approval" boolean NOT NULL DEFAULT false;
      `,
    },
    {
      name: 'Add max_participants to ctxh_activity',
      sql: `
        ALTER TABLE "ctxh_activity"
        ADD COLUMN IF NOT EXISTS "max_participants" integer;
      `,
    },
    {
      name: 'Add non-negative constraint for max_participants',
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'CHK_ctxh_activity_max_participants_non_negative'
          ) THEN
            ALTER TABLE "ctxh_activity"
            ADD CONSTRAINT "CHK_ctxh_activity_max_participants_non_negative"
            CHECK ("max_participants" IS NULL OR "max_participants" >= 0);
          END IF;
        END $$;
      `,
    },
    {
      name: 'Add PENDING status to participation enum',
      sql: `
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM pg_type
            WHERE typname = 'ctxh_participation_status_enum'
          ) THEN
            ALTER TYPE "ctxh_participation_status_enum" ADD VALUE IF NOT EXISTS 'PENDING';
          END IF;
        END $$;
      `,
    },
    {
      name: 'Add APPROVED status to participation enum',
      sql: `
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM pg_type
            WHERE typname = 'ctxh_participation_status_enum'
          ) THEN
            ALTER TYPE "ctxh_participation_status_enum" ADD VALUE IF NOT EXISTS 'APPROVED';
          END IF;
        END $$;
      `,
    },
    {
      name: 'Migrate REGISTERED records to APPROVED',
      sql: `
        UPDATE "ctxh_participation"
        SET "status" = 'APPROVED'
        WHERE "status" = 'REGISTERED';
      `,
    },
  ];

  try {
    await client.connect();
    console.log('Connected to database.');

    for (const step of steps) {
      console.log(`Running: ${step.name}`);
      await client.query(step.sql);
      console.log(`Done: ${step.name}`);
    }

    console.log('All CTXH registration migrations completed successfully.');
  } catch (error) {
    console.error('Migration script failed.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
