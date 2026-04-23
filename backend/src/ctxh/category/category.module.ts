import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CategoryService } from "./category.service";
import { CategoryController } from "./category.controller";
import { CtxhCategory } from "../../entities/ctxh-category.entity";
import { RolesModule } from "../../roles/roles.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([CtxhCategory]),
    RolesModule, // Cần thiết cho PermissionGuard
  ],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
