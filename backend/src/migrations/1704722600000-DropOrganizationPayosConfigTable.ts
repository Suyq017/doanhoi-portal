import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropOrganizationPayosConfigTable1704722600000 implements MigrationInterface {
  name = 'DropOrganizationPayosConfigTable1704722600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old organization_payos_configs table
    const tableExists = await queryRunner.hasTable('organization_payos_configs');
    
    if (tableExists) {
      // First, drop all foreign keys
      const table = await queryRunner.getTable('organization_payos_configs');
      if (table && table.foreignKeys.length > 0) {
        for (const foreignKey of table.foreignKeys) {
          await queryRunner.dropForeignKey('organization_payos_configs', foreignKey);
        }
      }

      // Drop all indexes
      if (table && table.indices.length > 0) {
        for (const index of table.indices) {
          await queryRunner.dropIndex('organization_payos_configs', index);
        }
      }

      // Finally, drop the table
      await queryRunner.dropTable('organization_payos_configs', true);
      
      console.log('Successfully dropped organization_payos_configs table');
    } else {
      console.log('organization_payos_configs table does not exist, skipping drop');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the old table if needed (this is a simplified version)
    // In practice, you might want to restore from backup
    console.log('Rollback: Cannot automatically recreate organization_payos_configs table');
    console.log('Please restore from backup if needed');
  }
}
