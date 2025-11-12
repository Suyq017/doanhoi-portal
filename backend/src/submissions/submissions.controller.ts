import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Request,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto, UpdateSubmissionDto } from './dto';

@ApiTags('Submissions')
@ApiBearerAuth()
@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new submission (draft)' })
  async create(
    @Body() dto: CreateSubmissionDto,
    @Request() req: any,
  ) {
    return this.submissionsService.create(dto, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update submission (save draft)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionDto,
    @Request() req: any,
  ) {
    return this.submissionsService.update(id, dto, req.user.id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit and generate document' })
  async submit(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.submissionsService.submit(id, req.user.id);
  }

  @Get('my-submissions')
  @ApiOperation({ summary: 'Get current user submissions' })
  async getMySubmissions(
    @Request() req: any,
    @Query('templateId') templateId?: string,
  ) {
    return this.submissionsService.getUserSubmissions(req.user.id, templateId);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all submissions (admin)' })
  async getAllSubmissions(
    @Query('templateId') templateId?: string,
  ) {
    return this.submissionsService.getAllSubmissions(templateId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get submission by ID' })
  async findOne(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.submissionsService.findOne(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete submission' })
  async delete(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    await this.submissionsService.delete(id, req.user.id);
    return { message: 'Submission deleted successfully' };
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download generated document' })
  async downloadFile(
    @Param('id') id: string,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileData = await this.submissionsService.downloadSubmissionFile(id, req.user.id);
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileData.fileName)}"`,
    });

    return new StreamableFile(fileData.buffer);
  }
}
