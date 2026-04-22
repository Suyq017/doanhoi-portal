import { All, Controller, ForbiddenException, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActivitiesService } from '../../ctxh/activity/activities.service';
import { ParticipationService } from '../../ctxh/activity/services/participation.service';
import { NodemailerService } from '../notifications/nodemailer.service';
import { buildStaffServer } from '../servers/staff.server';
import { checkCtxhPermission } from '../guards/ctxh-permission.helper';
import { UserType } from '../../entities/user.entity';

@ApiTags('mcp-staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/mcp/staff')
export class StaffMcpController {
  private readonly logger = new Logger(StaffMcpController.name);

  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly participationService: ParticipationService,
    private readonly mailerService: NodemailerService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Single endpoint that handles all MCP protocol messages for the Staff role.
   * Requires the user to be of type STAFF and have ctxh.access permission.
   */
  @All()
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user = (req as any).user;
    const userId: string = user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Only staff accounts may use this endpoint
    if (user?.userType !== UserType.STAFF) {
      res.status(403).json({ error: 'Forbidden: staff only' });
      return;
    }

    // Require base CTXH access permission
    const hasAccess = await checkCtxhPermission(this.dataSource, userId, 'ctxh.access');
    if (!hasAccess) {
      res.status(403).json({ error: 'Forbidden: missing ctxh.access permission' });
      return;
    }

    this.logger.debug(`MCP staff request | userId=${userId} | method=${req.method}`);

    const server = buildStaffServer(userId, {
      activitiesService: this.activitiesService,
      participationService: this.participationService,
      mailerService: this.mailerService,
      dataSource: this.dataSource,
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      this.logger.error(`MCP staff handler error: ${error.message}`, error.stack);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal MCP server error' });
      }
    }
  }
}
