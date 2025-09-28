import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentCodeToParticipation1704732000000 implements MigrationInterface {
  name = 'AddStudentCodeToParticipation1704732000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add student_code column to ctxh_participation table
    await queryRunner.query(`
      ALTER TABLE "ctxh_participation" 
      ADD COLUMN "student_code" VARCHAR(20)
    `);

    // Make student_id nullable (in case it wasn't already)
    await queryRunner.query(`
      ALTER TABLE "ctxh_participation" 
      ALTER COLUMN "student_id" DROP NOT NULL
    `);

    // Add index on student_code for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_ctxh_participation_student_code" 
      ON "ctxh_participation" ("student_code")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove index
    await queryRunner.query(`
      DROP INDEX "IDX_ctxh_participation_student_code"
    `);

    // Remove student_code column
    await queryRunner.query(`
      ALTER TABLE "ctxh_participation" 
      DROP COLUMN "student_code"
    `);

    // Make student_id NOT NULL again (if desired)
    await queryRunner.query(`
      ALTER TABLE "ctxh_participation" 
      ALTER COLUMN "student_id" SET NOT NULL
    `);
  }
}