import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CtxhChatModule } from '../ctxh-chat/ctxh-chat.module';
import { ActivitiesModule } from '../ctxh/activity/activities.module';
import { StudentMcpController } from './controllers/student-mcp.controller';
import { StaffMcpController } from './controllers/staff-mcp.controller';
import { NodemailerService } from './notifications/nodemailer.service';

@Module({
  imports: [
    // Provides CtxhFilterExtractionService, LangChainVectorStoreService, etc.
    forwardRef(() => CtxhChatModule),
    // Provides ActivitiesService, ParticipationService
    forwardRef(() => ActivitiesModule),
    // DataSource is globally available via TypeOrmModule.forRootAsync in AppModule;
    // no additional entity registration needed here.
    TypeOrmModule.forFeature([]),
  ],
  controllers: [StudentMcpController, StaffMcpController],
  providers: [NodemailerService],
})
export class CtxhMcpModule {}
