import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCtxhParticipationTable1706002000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop table if exists (in case it was created manually)
    await queryRunner.query(`DROP TABLE IF EXISTS "ctxh_participation" CASCADE;`);

    // Create ctxh_participation table with audit fields
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
            isNullable: false,
          },
          {
            name: 'actual_days',
            type: 'int',
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
            onDelete: 'RESTRICT',
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

    // Create indexes for performance
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
      CREATE INDEX "idx_ctxh_participation_created_by" ON "ctxh_participation" ("created_by");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_ctxh_participation_deleted_at" ON "ctxh_participation" ("deleted_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ctxh_participation');
  }
}