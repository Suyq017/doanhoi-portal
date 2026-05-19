import { All, Controller, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CtxhFilterExtractionService } from '../../ctxh-chat/services/ctxh-filter-extraction.service';
import { LangChainVectorStoreService } from '../../ctxh-chat/services/langchain-vector-store.service';
import { ParticipationService } from '../../ctxh/activity/services/participation.service';
import { buildStudentServer } from '../servers/student.server';

@ApiTags('mcp-student')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mcp/student')
export class StudentMcpController {
  private readonly logger = new Logger(StudentMcpController.name);

  constructor(
    private readonly filterExtractionService: CtxhFilterExtractionService,
    private readonly vectorStoreService: LangChainVectorStoreService,
    private readonly participationService: ParticipationService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Single endpoint that handles all MCP protocol messages
   * (initialize, tools/list, tools/call) over StreamableHTTP.
   *
   * A fresh McpServer is built per request so the authenticated
   * userId is safely bound to tool handlers via closure.
   */
  @All()
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    const userId: string = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    this.logger.debug(`MCP student request | userId=${userId} | method=${req.method}`);

    const server = buildStudentServer(userId, {
      filterExtractionService: this.filterExtractionService,
      vectorStoreService: this.vectorStoreService,
      participationService: this.participationService,
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      this.logger.error(`MCP student handler error: ${error.message}`, error.stack);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal MCP server error' });
      }
    }
  }
}
