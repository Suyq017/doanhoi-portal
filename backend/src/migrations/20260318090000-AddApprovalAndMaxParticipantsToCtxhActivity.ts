import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApprovalAndMaxParticipantsToCtxhActivity20260318090000
  implements MigrationInterface
{
  name = "AddApprovalAndMaxParticipantsToCtxhActivity20260318090000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ctxh_activity"
      ADD COLUMN IF NOT EXISTS "requires_approval" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "ctxh_activity"
      ADD COLUMN IF NOT EXISTS "max_participants" integer
    `);

    await queryRunner.query(`
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
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ctxh_activity"
      DROP CONSTRAINT IF EXISTS "CHK_ctxh_activity_max_participants_non_negative"
    `);

    await queryRunner.query(`
      ALTER TABLE "ctxh_activity"
      DROP COLUMN IF EXISTS "max_participants"
    `);

    await queryRunner.query(`
      ALTER TABLE "ctxh_activity"
      DROP COLUMN IF EXISTS "requires_approval"
    `);
  }
}
