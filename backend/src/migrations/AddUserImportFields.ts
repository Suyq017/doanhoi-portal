import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserImportFields1728234567890 implements MigrationInterface {
  name = 'AddUserImportFields1728234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to users table
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      ADD COLUMN \`student_code\` VARCHAR(50) NULL UNIQUE,
      ADD COLUMN \`identity_card\` VARCHAR(20) NULL,
      ADD COLUMN \`birth_date\` DATE NULL,
      ADD COLUMN \`gender\` ENUM('NAM', 'NU') NULL,
      ADD COLUMN \`admission_year\` VARCHAR(10) NULL,
      ADD COLUMN \`curriculum_year\` VARCHAR(10) NULL,
      ADD COLUMN \`faculty_code\` VARCHAR(20) NULL,
      ADD COLUMN \`training_system\` ENUM('VLVH', 'CQ', 'QT', 'DTTX') NULL,
      ADD COLUMN \`training_level\` ENUM('DH') NULL
    `);

    // Update existing user_type enum to include new values
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      MODIFY COLUMN \`userType\` ENUM('student', 'staff', 'SINH_VIEN', 'CAN_BO') DEFAULT 'student'
    `);

    // Update existing membership_status enum to include new values
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      MODIFY COLUMN \`membershipStatus\` ENUM('doan_vien', 'hoi_vien', 'both', 'none', 'ACTIVE', 'INACTIVE', 'GRADUATED') DEFAULT 'none'
    `);

    // Add index for student_code for better performance
    await queryRunner.query(`
      CREATE INDEX \`IDX_users_student_code\` ON \`users\` (\`student_code\`)
    `);

    // Add index for faculty_code for better performance
    await queryRunner.query(`
      CREATE INDEX \`IDX_users_faculty_code\` ON \`users\` (\`faculty_code\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes
    await queryRunner.query(`DROP INDEX \`IDX_users_faculty_code\` ON \`users\``);
    await queryRunner.query(`DROP INDEX \`IDX_users_student_code\` ON \`users\``);

    // Revert enum changes
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      MODIFY COLUMN \`membershipStatus\` ENUM('doan_vien', 'hoi_vien', 'both', 'none') DEFAULT 'none'
    `);

    await queryRunner.query(`
      ALTER TABLE \`users\` 
      MODIFY COLUMN \`userType\` ENUM('student', 'staff') DEFAULT 'student'
    `);

    // Remove new columns
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      DROP COLUMN \`training_level\`,
      DROP COLUMN \`training_system\`,
      DROP COLUMN \`faculty_code\`,
      DROP COLUMN \`curriculum_year\`,
      DROP COLUMN \`admission_year\`,
      DROP COLUMN \`gender\`,
      DROP COLUMN \`birth_date\`,
      DROP COLUMN \`identity_card\`,
      DROP COLUMN \`student_code\`
    `);
  }
}