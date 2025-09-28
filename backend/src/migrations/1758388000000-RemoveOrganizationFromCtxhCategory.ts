import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveOrganizationFromCtxhCategory1758388000000 implements MigrationInterface {
    name = 'RemoveOrganizationFromCtxhCategory1758388000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove foreign key constraint first if exists
        try {
            await queryRunner.query(`ALTER TABLE "ctxh_category" DROP CONSTRAINT IF EXISTS "FK_ctxh_category_organization_id"`);
        } catch (error) {
            // Constraint might not exist, continue
            console.log('Foreign key constraint not found, continuing...');
        }

        // Remove the organization_id column
        try {
            await queryRunner.query(`ALTER TABLE "ctxh_category" DROP COLUMN "organization_id"`);
        } catch (error) {
            // Column might not exist, continue
            console.log('organization_id column not found, continuing...');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add back organization_id column
        await queryRunner.query(`ALTER TABLE "ctxh_category" ADD "organization_id" uuid`);
        
        // Add back foreign key constraint
        await queryRunner.query(`ALTER TABLE "ctxh_category" ADD CONSTRAINT "FK_ctxh_category_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
}