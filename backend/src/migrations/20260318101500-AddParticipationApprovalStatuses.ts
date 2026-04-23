import { MigrationInterface, QueryRunner } from "typeorm";

export class AddParticipationApprovalStatuses20260318101500
  implements MigrationInterface
{
  name = "AddParticipationApprovalStatuses20260318101500";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'ctxh_participation_status_enum'
        ) THEN
          ALTER TYPE "ctxh_participation_status_enum" ADD VALUE IF NOT EXISTS 'PENDING';
          ALTER TYPE "ctxh_participation_status_enum" ADD VALUE IF NOT EXISTS 'APPROVED';
        END IF;
      END $$;
    `);

    // Migrate legacy registered records to approved for backward compatibility
    await queryRunner.query(`
      UPDATE "ctxh_participation"
      SET "status" = 'APPROVED'
      WHERE "status" = 'REGISTERED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values safely in a simple rollback.
    // Revert data back to legacy status value only.
    await queryRunner.query(`
      UPDATE "ctxh_participation"
      SET "status" = 'REGISTERED'
      WHERE "status" = 'APPROVED'
    `);
  }
}
