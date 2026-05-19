import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCtxhDaysToUsers1730707200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column for total CTXH days from current system
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "ctxh_days",
        type: "decimal",
        precision: 5,
        scale: 1,
        isNullable: true,
        default: null,
        comment: "Tổng số ngày CTXH hiện tại",
      }),
    );

    // Add column for CTXH days from old system
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "ctxh_days_old_system",
        type: "decimal",
        precision: 5,
        scale: 1,
        isNullable: true,
        default: null,
        comment: "Số ngày CTXH từ hệ thống cũ",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "ctxh_days_old_system");
    await queryRunner.dropColumn("users", "ctxh_days");
  }
}
