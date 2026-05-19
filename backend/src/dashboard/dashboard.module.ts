import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { UsersModule } from "../users/users.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { AwsS3ConfigModule } from "../aws-config/aws-s3-config.module";

@Module({
  imports: [UsersModule, OrganizationsModule, AwsS3ConfigModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
