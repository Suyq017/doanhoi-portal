import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../../entities/user.entity";
import { CtxhImportController } from "./import.controller";
import { CtxhImportService } from "./import.service";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [CtxhImportController],
  providers: [CtxhImportService],
  exports: [CtxhImportService],
})
export class CtxhImportModule {}
