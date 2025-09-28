import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCtxhActivityTable1706001000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop table if exists (in case it was created manually)
    await queryRunner.query(`DROP TABLE IF EXISTS "ctxh_activity" CASCADE;`);

    // Create ctxh_activity table with audit fields
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
            type: 'int',
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

    // Create indexes for performance
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ctxh_activity');
  }
}