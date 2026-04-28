import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Document } from '@langchain/core/documents';
import { PostgresMcpClientService } from './postgres-mcp-client.service';
import { MetadataFilters } from '../dto/filter-extraction.dto';
import { getSearchTermsForLocation } from '../constants/location.constants';

export type StatusHint = 'upcoming' | 'ongoing' | 'all';

@Injectable()
export class McpSqlFallbackService {
  private readonly logger = new Logger(McpSqlFallbackService.name);

  constructor(
    private readonly mcpClient: PostgresMcpClientService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Fallback khi vector search trả 0 kết quả.
   * Chạy SQL trực tiếp — không phụ thuộc embedding similarity.
   */
  async fallbackSearch(
    statusHint: StatusHint = 'all',
    limit: number = 10,
    currentDate: string = new Date().toISOString().split('T')[0],
  ): Promise<Document[]> {
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
      const rows = await this.dataSource.query(sql);

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
    const today = new Date().toISOString().split('T')[0];
    let whereExtra = this.buildStatusWhereClause(statusHint, today);

    if (organizationKeyword) {
      const safe = organizationKeyword.replace(/'/g, "''");
      whereExtra += ` AND org.name ILIKE '%${safe}%'`;
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
        COUNT(cp.id) FILTER (WHERE cp.status = 'APPROVED')  AS approved_count,
        COUNT(cp.id) FILTER (WHERE cp.status = 'PENDING')   AS pending_count,
        COUNT(cp.id) FILTER (WHERE cp.status IN ('APPROVED','PENDING','REGISTERED')) AS total_registered
      FROM ctxh_activity ca
      LEFT JOIN organizations org ON org.id = ca.organization_id
      LEFT JOIN ctxh_category cat ON cat.id = ca.category_id
      LEFT JOIN ctxh_participation cp ON cp.activity_id = ca.id
      WHERE ca.deleted_at IS NULL
        AND ca.status IN ('ACTIVE', 'DRAFT')
        ${whereExtra}
      GROUP BY ca.id, org.name, cat.name
      ORDER BY ca.start_date ASC
      LIMIT ${limit};
    `;

    try {
      const rows = await this.dataSource.query(sql);
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
          id: r.activity_id,
          name: r.activity_name,
          status: r.status,
          start_date: r.start_date,
          end_date: r.end_date,
          location: r.location ?? null,
          total_days: r.total_days,
          requires_approval: r.requires_approval,
          max_participants: r.max_participants ?? null,
          approved_count: Number(r.approved_count ?? 0),
          pending_count: Number(r.pending_count ?? 0),
          total_registered: Number(r.total_registered ?? 0),
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
      const rows = await this.dataSource.query(sql);

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

  /**
   * Query DISTINCT activity_ids from ctxh_embeddings.metadata JSONB using structured filters.
   *
   * Used as the first stage of the new MCP-filter → semantic-search pipeline:
   *   1. This method resolves which activity IDs match the filters (via MCP SQL).
   *   2. The vector store then does semantic ranking constrained to those IDs.
   *
   * Returns:
   *   - `string[]`  — matched activity IDs (may be empty if no matches)
   *   - `null`      — filters were all empty; caller should skip the filter step
   */
  async queryEmbeddingActivityIds(
    filters: MetadataFilters,
    currentDate: string = new Date().toISOString().split('T')[0],
  ): Promise<string[] | null> {
    const whereClause = this.buildEmbeddingMetadataWhereClause(filters, currentDate);
    if (whereClause === null) {
      // All filters empty — signal to caller to skip constrained search
      return null;
    }

    const sql = `
      SELECT DISTINCT activity_id
      FROM ctxh_embeddings
      WHERE ${whereClause}
      LIMIT 50;
    `;

    try {
      const rows = await this.dataSource.query(sql);

      if (!Array.isArray(rows) || rows.length === 0) {
        this.logger.debug('[MCP EmbeddingFilter] SQL returned 0 activity_ids');
        return [];
      }

      const ids = rows.map((r: any) => String(r.activity_id)).filter(Boolean);
      this.logger.debug(
        `[MCP EmbeddingFilter] Found ${ids.length} activity_ids matching filters`,
      );
      return ids;
    } catch (err: any) {
      this.logger.error(`[MCP EmbeddingFilter] executeSql failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Build WHERE clause operating on ctxh_embeddings.metadata JSONB.
   * Returns null when all filters are empty (caller should use un-filtered search).
   */
  private buildEmbeddingMetadataWhereClause(
    filters: MetadataFilters,
    currentDate: string,
  ): string | null {
    const clauses: string[] = [];

    // Always exclude DRAFT embeddings
    clauses.push(`metadata->>'status' != 'DRAFT'`);

    // --- Status (ongoing / upcoming / ended) ---
    if (filters.status && filters.status.length > 0) {
      const statusParts = filters.status.map((s) => {
        if (s === 'ongoing') {
          return `(metadata->>'status' = 'ACTIVE' AND (metadata->>'startDate')::date <= '${currentDate}'::date AND (metadata->>'endDate')::date >= '${currentDate}'::date)`;
        } else if (s === 'upcoming') {
          return `(metadata->>'status' = 'ACTIVE' AND (metadata->>'startDate')::date > '${currentDate}'::date)`;
        } else {
          // ended
          return `(metadata->>'status' IN ('COMPLETED','CANCELLED') OR (metadata->>'status' = 'ACTIVE' AND (metadata->>'endDate')::date < '${currentDate}'::date))`;
        }
      });
      clauses.push(`(${statusParts.join(' OR ')})`);
    }

    // --- Date range ---
    const dr = filters.dateRange;
    if (dr) {
      if (dr.startDate && dr.endDate) {
        clauses.push(
          `(metadata->>'endDate')::date >= '${dr.startDate}'::date AND (metadata->>'startDate')::date <= '${dr.endDate}'::date`,
        );
      } else if (dr.startDate) {
        clauses.push(`(metadata->>'endDate')::date >= '${dr.startDate}'::date`);
      } else if (dr.endDate) {
        clauses.push(`(metadata->>'startDate')::date <= '${dr.endDate}'::date`);
      }
    }

    // --- Organization keywords (ILIKE on metadata.organizationName) ---
    if (filters.organizationKeywords && filters.organizationKeywords.length > 0) {
      const orgParts = filters.organizationKeywords.map((kw) => {
        const safe = kw.replace(/'/g, "''");
        return `metadata->>'organizationName' ILIKE '%${safe}%'`;
      });
      clauses.push(`(${orgParts.join(' OR ')})`);
    }

    // --- Location (ILIKE on metadata.location) ---
    if (filters.locationRaw && filters.locationRaw.length > 0) {
      const locationTerms: string[] = [];
      for (const raw of filters.locationRaw) {
        const expanded = getSearchTermsForLocation(raw);
        for (const term of expanded) {
          const safe = term.replace(/'/g, "''");
          locationTerms.push(`metadata->>'location' ILIKE '%${safe}%'`);
        }
      }
      if (locationTerms.length > 0) {
        clauses.push(`(${locationTerms.join(' OR ')})`);
      }
    }

    // Only the DRAFT guard is always present — if that's the only clause,
    // no meaningful filter was extracted → return null to signal "no filter"
    if (clauses.length === 1) {
      return null;
    }

    return clauses.join(' AND ');
  }

  /**
   * Return the set of activity IDs the given user is already enrolled in
   * (status PENDING, APPROVED, or REGISTERED — i.e. active participation).
   * Returns an empty Set when MCP is offline or userId is falsy.
   */
  async queryEnrolledActivityIds(userId: string): Promise<Set<string>> {
    if (!userId) return new Set();

    const sql = `
      SELECT DISTINCT activity_id
      FROM ctxh_participation
      WHERE student_id = $1
        AND status IN ('PENDING', 'APPROVED', 'REGISTERED');
    `;

    try {
      const rows = await this.dataSource.query(sql, [userId]);
      const ids = (rows ?? []).map((r: any) => String(r.activity_id)).filter(Boolean);
      this.logger.debug(
        `[EnrolledFilter] userId=${userId} already enrolled in ${ids.length} activities`,
      );
      return new Set(ids);
    } catch (err: any) {
      this.logger.warn(`[EnrolledFilter] Failed to query enrolled activities: ${err.message}`);
      return new Set();
    }
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
