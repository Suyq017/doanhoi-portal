import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { CtxhCategory } from '../../entities/ctxh-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CtxhCategory]),
    // RolesModule, // Không cần thiết khi không dùng PermissionGuard
  ],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
