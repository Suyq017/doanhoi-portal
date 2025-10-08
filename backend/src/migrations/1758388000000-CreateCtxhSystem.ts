import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCtxhSystem1758388000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create ctxh_category table (global for all organizations)
    await queryRunner.createTable(
      new Table({
        name: 'ctxh_category',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          // Audit fields
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'updated_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'deleted_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['created_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['updated_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['deleted_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
    );

    // 2. Create ctxh_activity table
    await queryRunner.createTable(
      new Table({
        name: 'ctxh_activity',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'end_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'total_days',
            type: 'decimal',
            precision: 5,
            scale: 1,
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'DRAFT'",
          },
          // Audit fields
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'updated_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'deleted_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['category_id'],
            referencedTableName: 'ctxh_category',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['created_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['updated_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['deleted_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
    );

    // 3. Create ctxh_participation table
    await queryRunner.createTable(
      new Table({
        name: 'ctxh_participation',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'activity_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'student_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'student_code',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'actual_days',
            type: 'decimal',
            precision: 5,
            scale: 1,
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'REGISTERED'",
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'graded_by',
            type: 'uuid',
            isNullable: true,
          },
          // Audit fields
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'updated_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'deleted_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['activity_id'],
            referencedTableName: 'ctxh_activity',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['student_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['graded_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['created_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['updated_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['deleted_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
    );

    // 4. Create ctxh_limit_config table
    await queryRunner.createTable(
      new Table({
        name: 'ctxh_limit_config',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'max_days',
            type: 'decimal',
            precision: 5,
            scale: 1,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'ACTIVE'",
          },
          // Audit fields
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'updated_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'deleted_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['created_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['updated_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['deleted_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
    );

    // 5. Create indexes for performance
    // Category indexes
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_category_created_by" ON "ctxh_category" ("created_by");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_category_deleted_at" ON "ctxh_category" ("deleted_at");
    `);

    // Activity indexes
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_activity_org_active" ON "ctxh_activity" ("organization_id") 
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_activity_category_active" ON "ctxh_activity" ("category_id") 
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_activity_status_active" ON "ctxh_activity" ("status") 
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_activity_dates_active" ON "ctxh_activity" ("start_date", "end_date") 
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_activity_created_by" ON "ctxh_activity" ("created_by");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_activity_deleted_at" ON "ctxh_activity" ("deleted_at");
    `);

    // Participation indexes
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_participation_student_active" ON "ctxh_participation" ("student_id") 
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_participation_activity_active" ON "ctxh_participation" ("activity_id") 
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_participation_student_status_active" ON "ctxh_participation" ("student_id", "status") 
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_participation_graded_active" ON "ctxh_participation" ("graded_by", "created_at") 
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_participation_student_code" ON "ctxh_participation" ("student_code");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_participation_created_by" ON "ctxh_participation" ("created_by");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_participation_deleted_at" ON "ctxh_participation" ("deleted_at");
    `);

    // Limit config indexes
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_limit_config_org_active" ON "ctxh_limit_config" ("organization_id") 
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_limit_config_created_by" ON "ctxh_limit_config" ("created_by");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_limit_config_deleted_at" ON "ctxh_limit_config" ("deleted_at");
    `);

    // 6. Add CHECK constraints
    // Enum constraints
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

    await queryRunner.query(`
      ALTER TABLE "ctxh_participation" 
      ADD CONSTRAINT "CHK_ctxh_participation_status" 
      CHECK ("status" IN ('REGISTERED', 'COMPLETED', 'CANCELLED'));
    `);

    // Value constraints
    await queryRunner.query(`
      ALTER TABLE "ctxh_activity" 
      ADD CONSTRAINT "CHK_ctxh_activity_total_days_positive" 
      CHECK ("total_days" >= 0.1);
    `);

    await queryRunner.query(`
      ALTER TABLE "ctxh_participation" 
      ADD CONSTRAINT "CHK_ctxh_participation_actual_days_positive" 
      CHECK ("actual_days" >= 0);
    `);

    await queryRunner.query(`
      ALTER TABLE "ctxh_limit_config" 
      ADD CONSTRAINT "CHK_ctxh_limit_config_max_days_positive" 
      CHECK ("max_days" >= 0.1);
    `);

    // Date logic constraint
    await queryRunner.query(`
      ALTER TABLE "ctxh_activity" 
      ADD CONSTRAINT "CHK_ctxh_activity_dates" 
      CHECK ("start_date" IS NULL OR "end_date" IS NULL OR "start_date" <= "end_date");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.dropTable('ctxh_limit_config');
    await queryRunner.dropTable('ctxh_participation');
    await queryRunner.dropTable('ctxh_activity');
    await queryRunner.dropTable('ctxh_category');
  }
}