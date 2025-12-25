import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveRoleDisplayName1762246865293 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Copy displayName values to name column (keep displayName for now)
    await queryRunner.query(`
            UPDATE roles 
            SET name = COALESCE(displayName, name)
            WHERE displayName IS NOT NULL AND displayName != ''
        `);

    // Step 2: Drop displayName column
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "displayName"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add displayName column
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "displayName" character varying`,
    );

    // Copy name back to displayName
    await queryRunner.query(`UPDATE roles SET "displayName" = name`);
  }
}
