import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCtxhLimitConfigTable1706003000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop table if exists (in case it was created manually)
    await queryRunner.query(`DROP TABLE IF EXISTS "ctxh_limit_config" CASCADE;`);

    // Create ctxh_limit_config table with audit fields
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
            name: 'max_days_per_semester',
            type: 'int',
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

    // Create indexes for performance
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ctxh_limit_config');
  }
}