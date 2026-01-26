import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLocationToActivity20251029135754 implements MigrationInterface {
  name = "AddLocationToActivity20251029135754";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add location field to ctxh_activity table
    await queryRunner.query(
      `ALTER TABLE "ctxh_activity" ADD "location" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove location field from ctxh_activity table
    await queryRunner.query(
      `ALTER TABLE "ctxh_activity" DROP COLUMN "location"`,
    );
  }
}
