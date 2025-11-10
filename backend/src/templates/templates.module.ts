import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Template } from '../entities/template.entity';
import { TemplateField } from '../entities/template-field.entity';
import { TemplateSubmission } from '../entities/template-submission.entity';
import { AwsS3ConfigModule } from '../aws-config/aws-s3-config.module';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { SubmissionsController } from '../submissions/submissions.controller';
import { SubmissionsService } from '../submissions/submissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Template, TemplateField, TemplateSubmission]),
    AwsS3ConfigModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
      },
    }),
  ],
  controllers: [TemplatesController, SubmissionsController],
  providers: [TemplatesService, SubmissionsService],
  exports: [TemplatesService, SubmissionsService],
})
export class TemplatesModule {}
