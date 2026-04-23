import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DataSource } from 'typeorm';
import { ActivitiesService } from '../../ctxh/activity/activities.service';
import { ParticipationService } from '../../ctxh/activity/services/participation.service';
import { NodemailerService } from '../notifications/nodemailer.service';
import { registerQueryManagedActivitiesTool } from '../tools/staff/query-managed-activities.tool';
import { registerCreateActivityTool } from '../tools/staff/create-activity.tool';
import { registerAutoApproveNotifyTool } from '../tools/staff/auto-approve-notify.tool';

export interface StaffServerDeps {
  activitiesService: ActivitiesService;
  participationService: ParticipationService;
  mailerService: NodemailerService;
  dataSource: DataSource;
}

/**
 * Builds a fully-configured McpServer for the Staff role.
 * A new instance is created per HTTP request so that `userId`
 * is safely bound to each tool handler via closure.
 */
export function buildStaffServer(userId: string, deps: StaffServerDeps): McpServer {
  const server = new McpServer({
    name: 'ctxh-staff-agent',
    version: '1.0.0',
  });

  registerQueryManagedActivitiesTool(server, deps.dataSource, userId);
  registerCreateActivityTool(server, deps.activitiesService, deps.dataSource, userId);
  registerAutoApproveNotifyTool(server, deps.participationService, deps.mailerService, deps.dataSource, userId);

  return server;
}
