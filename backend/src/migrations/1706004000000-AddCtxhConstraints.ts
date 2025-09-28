import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCtxhConstraints1706004000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add CHECK constraints for enum values
    await queryRunner.query(`
      ALTER TABLE "ctxh_activity" 
      ADD CONSTRAINT "CHK_ctxh_activity_status" 
      CHECK ("status" IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'));
    `);

    await queryRunner.query(`
      ALTER TABLE "ctxh_limit_config" 
      ADD CONSTRAINT "CHK_ctxh_limit_config_status" 
      CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'DRAFT'));
    `);

    // Add CHECK constraint for participation status
    await queryRunner.query(`
      ALTER TABLE "ctxh_participation" 
      ADD CONSTRAINT "CHK_ctxh_participation_status" 
      CHECK ("status" IN ('REGISTERED', 'COMPLETED', 'CANCELLED'));
    `);

    // Add CHECK constraint for positive values
    await queryRunner.query(`
      ALTER TABLE "ctxh_activity" 
      ADD CONSTRAINT "CHK_ctxh_activity_total_days_positive" 
      CHECK ("total_days" > 0);
    `);

    await queryRunner.query(`
      ALTER TABLE "ctxh_participation" 
      ADD CONSTRAINT "CHK_ctxh_participation_actual_days_positive" 
      CHECK ("actual_days" >= 0);
    `);

    await queryRunner.query(`
      ALTER TABLE "ctxh_limit_config" 
      ADD CONSTRAINT "CHK_ctxh_limit_config_max_days_positive" 
      CHECK ("max_days_per_semester" > 0);
    `);

    // Add CHECK constraint for date logic
    await queryRunner.query(`
      ALTER TABLE "ctxh_activity" 
      ADD CONSTRAINT "CHK_ctxh_activity_dates" 
      CHECK ("start_date" IS NULL OR "end_date" IS NULL OR "start_date" <= "end_date");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ctxh_activity" DROP CONSTRAINT "CHK_ctxh_activity_status";`);
    await queryRunner.query(`ALTER TABLE "ctxh_limit_config" DROP CONSTRAINT "CHK_ctxh_limit_config_status";`);
    await queryRunner.query(`ALTER TABLE "ctxh_participation" DROP CONSTRAINT "CHK_ctxh_participation_status";`);
    await queryRunner.query(`ALTER TABLE "ctxh_activity" DROP CONSTRAINT "CHK_ctxh_activity_total_days_positive";`);
    await queryRunner.query(`ALTER TABLE "ctxh_participation" DROP CONSTRAINT "CHK_ctxh_participation_actual_days_positive";`);
    await queryRunner.query(`ALTER TABLE "ctxh_limit_config" DROP CONSTRAINT "CHK_ctxh_limit_config_max_days_positive";`);
    await queryRunner.query(`ALTER TABLE "ctxh_activity" DROP CONSTRAINT "CHK_ctxh_activity_dates";`);
  }
}