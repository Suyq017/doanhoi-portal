import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeActivityDateToTimestamp1730707300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Change start_date from date to timestamp
    await queryRunner.query(`
      ALTER TABLE "ctxh_activity" 
      ALTER COLUMN "start_date" TYPE timestamp WITHOUT TIME ZONE USING "start_date"::timestamp
    `);

    // Change end_date from date to timestamp
    await queryRunner.query(`
      ALTER TABLE "ctxh_activity" 
      ALTER COLUMN "end_date" TYPE timestamp WITHOUT TIME ZONE USING "end_date"::timestamp
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert end_date back to date
    await queryRunner.query(`
      ALTER TABLE "ctxh_activity" 
      ALTER COLUMN "end_date" TYPE date USING "end_date"::date
    `);

    // Revert start_date back to date
    await queryRunner.query(`
      ALTER TABLE "ctxh_activity" 
      ALTER COLUMN "start_date" TYPE date USING "start_date"::date
    `);
  }
}
