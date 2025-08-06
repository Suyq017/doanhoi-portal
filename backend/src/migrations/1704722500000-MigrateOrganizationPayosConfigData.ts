import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateOrganizationPayosConfigData1704722500000 implements MigrationInterface {
  name = 'MigrateOrganizationPayosConfigData1704722500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if old table exists
    const oldTableExists = await queryRunner.hasTable('organization_payos_configs');
    
    if (oldTableExists) {
      // Migration logic - if you have data to migrate, uncomment and modify the following:
      
      /*
      // Example migration from organization-based to campaign-based config
      // This is a placeholder - you'll need to adapt based on your actual data structure
      
      const organizationConfigs = await queryRunner.query(`
        SELECT * FROM organization_payos_configs WHERE is_active = true
      `);

      for (const orgConfig of organizationConfigs) {
        // Find campaigns belonging to this organization
        const campaigns = await queryRunner.query(`
          SELECT id FROM payment_campaigns WHERE organization_id = ?
        `, [orgConfig.organization_id]);

        // Create config entries for each campaign
        for (const campaign of campaigns) {
          await queryRunner.query(`
            INSERT INTO payment_campaign_payos_configs 
            (campaign_id, organization_id, user_id, client_id, api_key, checksum_key, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            campaign.id,
            orgConfig.organization_id,
            'default-user-id', // You'll need to provide appropriate user ID
            orgConfig.client_id,
            orgConfig.api_key,
            orgConfig.checksum_key,
            orgConfig.is_active,
            orgConfig.created_at,
            orgConfig.updated_at
          ]);
        }
      }
      */

      console.log('Migration note: Please review and uncomment migration logic if you have existing data to migrate');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse migration logic would go here
    // This is complex and depends on your specific migration strategy
    console.log('Rollback: This migration cannot be automatically rolled back due to data structure changes');
  }
}
