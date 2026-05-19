import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveStudentCodeField1728234567891 implements MigrationInterface {
  name = "RemoveStudentCodeField1728234567891";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, copy student_code data to code field if needed
    // This query will update code field with student_code where code is null/empty
    await queryRunner.query(`
      UPDATE \`users\` 
      SET \`code\` = \`student_code\` 
      WHERE (\`code\` IS NULL OR \`code\` = '') AND \`student_code\` IS NOT NULL AND \`student_code\` != ''
    `);

    // Remove the index for student_code
    await queryRunner.query(`
      DROP INDEX \`IDX_users_student_code\` ON \`users\`
    `);

    // Remove the student_code column
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      DROP COLUMN \`student_code\`
    `);

    // Update code column to allow nullable and keep unique constraint
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      MODIFY COLUMN \`code\` VARCHAR(255) NULL UNIQUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the student_code column
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      ADD COLUMN \`student_code\` VARCHAR(50) NULL UNIQUE
    `);

    // Copy code data back to student_code if needed
    await queryRunner.query(`
      UPDATE \`users\` 
      SET \`student_code\` = \`code\` 
      WHERE \`code\` IS NOT NULL AND \`code\` != ''
    `);

    // Recreate the index for student_code
    await queryRunner.query(`
      CREATE INDEX \`IDX_users_student_code\` ON \`users\` (\`student_code\`)
    `);

    // Revert code column to non-nullable
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      MODIFY COLUMN \`code\` VARCHAR(255) NOT NULL UNIQUE
    `);
  }
}
