import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCtxhCategoryTable1706000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop table if exists (in case it was created manually)
    await queryRunner.query(`DROP TABLE IF EXISTS "ctxh_category" CASCADE;`);

    // Create ctxh_category table with audit fields
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
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
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
      CREATE INDEX "idx_ctxh_category_org_active" ON "ctxh_category" ("organization_id") 
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_category_created_by" ON "ctxh_category" ("created_by");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_category_deleted_at" ON "ctxh_category" ("deleted_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ctxh_category');
  }
}
