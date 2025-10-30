import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsS3Config } from '../entities/aws-s3-config.entity';
import { AwsS3ConfigService } from './aws-s3-config.service';
import { AwsS3ConfigController } from './aws-s3-config.controller';

@Module({
    imports: [TypeOrmModule.forFeature([AwsS3Config])],
    controllers: [AwsS3ConfigController],
    providers: [AwsS3ConfigService],
    exports: [AwsS3ConfigService],
})
export class AwsS3ConfigModule { }
