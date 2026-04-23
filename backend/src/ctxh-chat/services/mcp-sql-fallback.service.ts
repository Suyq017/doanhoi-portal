import { Injectable, Logger } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { PostgresMcpClientService } from './postgres-mcp-client.service';
import { MetadataFilters } from '../dto/filter-extraction.dto';
import { getSearchTermsForLocation } from '../constants/location.constants';

export type StatusHint = 'upcoming' | 'ongoing' | 'all';

@Injectable()
export class McpSqlFallbackService {
  private readonly logger = new Logger(McpSqlFallbackService.name);

  constructor(private readonly mcpClient: PostgresMcpClientService) {}

  /**
   * Fallback khi vector search trả 0 kết quả.
   * Chạy SQL trực tiếp — không phụ thuộc embedding similarity.
   */
  async fallbackSearch(
    statusHint: StatusHint = 'all',
    limit: number = 10,
    currentDate: string = new Date().toISOString().split('T')[0],
  ): Promise<Document[]> {
    if (!this.mcpClient.isConnected()) {
      this.logger.warn('[MCP Fallback] MCP client not connected, skipping SQL fallback');
      return [];
    }

    const whereClause = this.buildStatusWhereClause(statusHint, currentDate);

    const sql = `
      SELECT
        ca.id              AS activity_id,
        ca.name            AS activity_name,
        ca.status,
        ca.start_date,
        ca.end_date,
        ca.location,
        ca.total_days,
        ca.requires_approval,
        ca.max_participants,
        org.name           AS organization_name,
        cat.name           AS category_name,
        ca.description
      FROM ctxh_activity ca
      LEFT JOIN organizations org ON org.id = ca.organization_id
      LEFT JOIN ctxh_category cat ON cat.id = ca.category_id
      WHERE ca.deleted_at IS NULL
        AND ca.status IN ('ACTIVE', 'DRAFT')
        ${whereClause}
      ORDER BY ca.start_date ASC
      LIMIT ${limit};
    `;

    try {
      const rows = await this.mcpClient.executeSqlRows(sql);

      if (!Array.isArray(rows) || rows.length === 0) {
        this.logger.debug('[MCP Fallback] SQL returned 0 rows');
        return [];
      }

      this.logger.debug(
        `[MCP Fallback] SQL returned ${rows.length} activities (statusHint=${statusHint})`,
      );

      return rows.map(
        (row: any) =>
          new Document({
            pageContent: [
              row.activity_name,
              row.description ?? '',
              row.organization_name ?? '',
              row.category_name ?? '',
              row.location ?? '',
            ]
              .filter(Boolean)
              .join(' — '),
            metadata: {
              activityId: row.activity_id,
              activityName: row.activity_name,
              status: row.status,
              startDate: row.start_date,
              endDate: row.end_date,
              location: row.location,
              totalDays: row.total_days,
              organizationName: row.organization_name,
              categoryName: row.category_name,
              requiresApproval: row.requires_approval,
              maxParticipants: row.max_participants,
              source: 'mcp_sql_fallback',
            },
          }),
      );
    } catch (err: any) {
      this.logger.error(`[MCP Fallback] executeSql failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Liệt kê hoạt động qua SQL — dùng cho LLM tool list_activities_sql.
   */
  async listActivities(
    statusHint: StatusHint = 'all',
    organizationKeyword?: string,
    limit: number = 10,
  ): Promise<string> {
    if (!this.mcpClient.isConnected()) {
      return JSON.stringify({ error: 'MCP client not connected.' });
    }

    const today = new Date().toISOString().split('T')[0];
    let whereExtra = this.buildStatusWhereClause(statusHint, today);

    if (organizationKeyword) {
      const safe = organizationKeyword.replace(/'/g, "''");
      whereExtra += ` AND org.name ILIKE '%${safe}%'`;
    }

    const sql = `
      SELECT
        ca.name            AS activity_name,
        ca.status,
        ca.start_date,
        ca.end_date,
        ca.location,
        ca.total_days,
        ca.requires_approval,
        ca.max_participants,
        org.name           AS organization_name,
        cat.name           AS category_name
      FROM ctxh_activity ca
      LEFT JOIN organizations org ON org.id = ca.organization_id
      LEFT JOIN ctxh_category cat ON cat.id = ca.category_id
      WHERE ca.deleted_at IS NULL
        AND ca.status IN ('ACTIVE', 'DRAFT')
        ${whereExtra}
      ORDER BY ca.start_date ASC
      LIMIT ${limit};
    `;

    try {
      const rows = await this.mcpClient.executeSqlRows(sql);
      if (!Array.isArray(rows) || rows.length === 0) {
        return JSON.stringify({
          found: 0,
          activities: [],
          message: 'Không tìm thấy hoạt động nào phù hợp.',
        });
      }
      return JSON.stringify({
        found: rows.length,
        activities: rows.map((r: any) => ({
          name: r.activity_name,
          status: r.status,
          start_date: r.start_date,
          end_date: r.end_date,
          location: r.location ?? null,
          total_days: r.total_days,
          requires_approval: r.requires_approval,
          max_participants: r.max_participants ?? null,
          organization: r.organization_name,
          category: r.category_name,
        })),
      });
    } catch (err: any) {
      return JSON.stringify({ error: err.message });
    }
  }

  /**
   * Filter-based search trực tiếp trên ctxh_activity qua MCP SQL.
   * Dùng thay thế cho JSONB metadata filtering trên ctxh_embeddings.
   * Trả [] nếu MCP không connect hoặc filters rỗng hoàn toàn.
   */
  async filteredSearch(
    filters: MetadataFilters,
    limit: number = 10,
    currentDate: string = new Date().toISOString().split('T')[0],
  ): Promise<Document[]> {
    if (!this.mcpClient.isConnected()) {
      this.logger.warn('[MCP FilteredSearch] MCP client not connected, skipping');
      return [];
    }

    const whereClause = this.buildFilteredWhereClause(filters, currentDate);
    if (whereClause === null) {
      // Tất cả filters rỗng — caller nên dùng vector search
      return [];
    }

    const sql = `
      SELECT
        ca.id              AS activity_id,
        ca.name            AS activity_name,
        ca.status,
        ca.start_date,
        ca.end_date,
        ca.location,
        ca.total_days,
        ca.requires_approval,
        ca.max_participants,
        org.name           AS organization_name,
        cat.name           AS category_name,
        ca.description
      FROM ctxh_activity ca
      LEFT JOIN organizations org ON org.id = ca.organization_id
      LEFT JOIN ctxh_category cat ON cat.id = ca.category_id
      WHERE ca.deleted_at IS NULL
        AND ca.status IN ('ACTIVE', 'DRAFT')
        ${whereClause}
      ORDER BY ca.start_date ASC
      LIMIT ${limit};
    `;

    try {
      const rows = await this.mcpClient.executeSqlRows(sql);

      if (!Array.isArray(rows) || rows.length === 0) {
        this.logger.debug('[MCP FilteredSearch] SQL returned 0 rows');
        return [];
      }

      this.logger.debug(`[MCP FilteredSearch] SQL returned ${rows.length} activities`);

      return rows.map(
        (row: any) =>
          new Document({
            pageContent: [
              row.activity_name,
              row.description ?? '',
              row.organization_name ?? '',
              row.category_name ?? '',
              row.location ?? '',
            ]
              .filter(Boolean)
              .join(' — '),
            metadata: {
              activityId: row.activity_id,
              activityName: row.activity_name,
              status: row.status,
              startDate: row.start_date,
              endDate: row.end_date,
              location: row.location,
              totalDays: row.total_days,
              organizationName: row.organization_name,
              categoryName: row.category_name,
              requiresApproval: row.requires_approval,
              maxParticipants: row.max_participants,
              source: 'mcp_filtered_search',
            },
          }),
      );
    } catch (err: any) {
      this.logger.error(`[MCP FilteredSearch] executeSql failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Build WHERE clauses từ MetadataFilters.
   * Trả null nếu tất cả filters rỗng (signal để caller fallback về vector store).
   */
  private buildFilteredWhereClause(filters: MetadataFilters, currentDate: string): string | null {
    const clauses: string[] = [];

    // --- Status ---
    if (filters.status && filters.status.length > 0) {
      const statusParts = filters.status.map((s) => {
        if (s === 'ongoing') {
          return `(ca.start_date <= '${currentDate}' AND ca.end_date >= '${currentDate}')`;
        } else if (s === 'upcoming') {
          return `(ca.start_date > '${currentDate}')`;
        } else {
          // ended
          return `(ca.status IN ('COMPLETED','CANCELLED') OR ca.end_date < '${currentDate}')`;
        }
      });
      clauses.push(`AND (${statusParts.join(' OR ')})`);
    }

    // --- Date range ---
    const dr = filters.dateRange;
    if (dr) {
      if (dr.startDate && dr.endDate) {
        clauses.push(
          `AND ca.end_date >= '${dr.startDate}' AND ca.start_date <= '${dr.endDate}'`,
        );
      } else if (dr.startDate) {
        clauses.push(`AND ca.end_date >= '${dr.startDate}'`);
      } else if (dr.endDate) {
        clauses.push(`AND ca.start_date <= '${dr.endDate}'`);
      }
    }

    // --- Organization keywords ---
    if (filters.organizationKeywords && filters.organizationKeywords.length > 0) {
      const orgParts = filters.organizationKeywords.map((kw) => {
        const safe = kw.replace(/'/g, "''");
        return `org.name ILIKE '%${safe}%'`;
      });
      clauses.push(`AND (${orgParts.join(' OR ')})`);
    }

    // --- Location ---
    if (filters.locationRaw && filters.locationRaw.length > 0) {
      const locationTerms: string[] = [];
      for (const raw of filters.locationRaw) {
        const expanded = getSearchTermsForLocation(raw);
        for (const term of expanded) {
          const safe = term.replace(/'/g, "''");
          locationTerms.push(`ca.location ILIKE '%${safe}%'`);
        }
      }
      if (locationTerms.length > 0) {
        clauses.push(`AND (${locationTerms.join(' OR ')})`);
      }
    }

    return clauses.length > 0 ? clauses.join('\n        ') : null;
  }

  private buildStatusWhereClause(statusHint: StatusHint, currentDate: string): string {
    switch (statusHint) {
      case 'upcoming':
        return `AND ca.start_date > '${currentDate}'`;
      case 'ongoing':
        return `AND ca.start_date <= '${currentDate}' AND ca.end_date >= '${currentDate}'`;
      case 'all':
      default:
        return `AND ca.end_date >= '${currentDate}'`;
    }
  }
}
