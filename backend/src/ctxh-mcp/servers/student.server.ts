import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CtxhFilterExtractionService } from '../../ctxh-chat/services/ctxh-filter-extraction.service';
import { LangChainVectorStoreService } from '../../ctxh-chat/services/langchain-vector-store.service';
import { ParticipationService } from '../../ctxh/activity/services/participation.service';
import { registerExtractFiltersTool } from '../tools/student/extract-filters.tool';
import { registerSearchActivitiesTool } from '../tools/student/search-activities.tool';
import { registerRegisterActivityTool } from '../tools/student/register-activity.tool';

export interface StudentServerDeps {
  filterExtractionService: CtxhFilterExtractionService;
  vectorStoreService: LangChainVectorStoreService;
  participationService: ParticipationService;
}

/**
 * Builds a fully-configured McpServer for the Student role.
 * A new instance is created per HTTP request so that `userId`
 * is safely bound to each tool handler via closure.
 */
export function buildStudentServer(userId: string, deps: StudentServerDeps): McpServer {
  const server = new McpServer({
    name: 'ctxh-student-agent',
    version: '1.0.0',
  });

  registerExtractFiltersTool(server, deps.filterExtractionService);
  registerSearchActivitiesTool(server, deps.vectorStoreService, deps.filterExtractionService);
  registerRegisterActivityTool(server, deps.participationService, userId);

  return server;
}
