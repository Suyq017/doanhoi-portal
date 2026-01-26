import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from "typeorm";

export class CreatePaymentCampaignPayosConfigTable1704722400000
  implements MigrationInterface
{
  name = "CreatePaymentCampaignPayosConfigTable1704722400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payment_campaign_payos_configs table
    await queryRunner.createTable(
      new Table({
        name: "payment_campaign_payos_configs",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "campaign_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "organization_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "user_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "client_id",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "api_key",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "checksum_key",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "is_active",
            type: "boolean",
            default: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    // Create unique index on campaign_id
    await queryRunner.createIndex(
      "payment_campaign_payos_configs",
      new TableIndex({
        name: "IDX_PAYMENT_CAMPAIGN_PAYOS_CONFIG_CAMPAIGN_ID",
        columnNames: ["campaign_id"],
        isUnique: true,
      }),
    );

    // Create index on organization_id
    await queryRunner.createIndex(
      "payment_campaign_payos_configs",
      new TableIndex({
        name: "IDX_PAYMENT_CAMPAIGN_PAYOS_CONFIG_ORG_ID",
        columnNames: ["organization_id"],
      }),
    );

    // Create index on user_id
    await queryRunner.createIndex(
      "payment_campaign_payos_configs",
      new TableIndex({
        name: "IDX_PAYMENT_CAMPAIGN_PAYOS_CONFIG_USER_ID",
        columnNames: ["user_id"],
      }),
    );

    // Add foreign key constraints
    await queryRunner.createForeignKey(
      "payment_campaign_payos_configs",
      new TableForeignKey({
        columnNames: ["campaign_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "payment_campaigns",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "payment_campaign_payos_configs",
      new TableForeignKey({
        columnNames: ["organization_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "organizations",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "payment_campaign_payos_configs",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable("payment_campaign_payos_configs");
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey(
          "payment_campaign_payos_configs",
          foreignKey,
        );
      }

      // Drop indexes
      await queryRunner.dropIndex(
        "payment_campaign_payos_configs",
        "IDX_PAYMENT_CAMPAIGN_PAYOS_CONFIG_CAMPAIGN_ID",
      );
      await queryRunner.dropIndex(
        "payment_campaign_payos_configs",
        "IDX_PAYMENT_CAMPAIGN_PAYOS_CONFIG_ORG_ID",
      );
      await queryRunner.dropIndex(
        "payment_campaign_payos_configs",
        "IDX_PAYMENT_CAMPAIGN_PAYOS_CONFIG_USER_ID",
      );
    }

    // Drop table
    await queryRunner.dropTable("payment_campaign_payos_configs", true);
  }
}
