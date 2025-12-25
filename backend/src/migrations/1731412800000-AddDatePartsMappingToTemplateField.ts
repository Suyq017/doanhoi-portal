import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDatePartsMappingToTemplateField1731412800000
  implements MigrationInterface
{
  name = "AddDatePartsMappingToTemplateField1731412800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "template_fields" 
      ADD COLUMN "date_parts_mapping" jsonb NULL
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "template_fields"."date_parts_mapping" IS 
      'Mapping for DATE fields created from 3 separate fields: {dayField, monthField, yearField}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "template_fields" 
      DROP COLUMN "date_parts_mapping"
    `);
  }
}
