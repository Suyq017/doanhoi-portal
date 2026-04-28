import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Document } from '@langchain/core/documents';
import { PostgresMcpClientService } from './postgres-mcp-client.service';

@Injectable()
export class McpMetadataEnricherService {
  private readonly logger = new Logger(McpMetadataEnricherService.name);

  constructor(
    private readonly mcpClient: PostgresMcpClientService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Enrich một batch Document[] với metadata live từ database qua DataSource.
   * Gọi sau vector search, trước khi format context cho LLM.
   * Thêm: requiresApproval, maxParticipants, remainingSlots, categoryName.
   */
  async enrichDocuments(docs: Document[]): Promise<Document[]> {
    if (docs.length === 0) return docs;

    const activityIds = [
      ...new Set(docs.map((d) => d.metadata?.activityId).filter(Boolean)),
    ];

    if (activityIds.length === 0) return docs;

    const placeholders = activityIds.map((_, i) => `$${i + 1}`).join(',');
    const sql = `
      SELECT
        ca.id,
        ca.requires_approval,
        ca.max_participants,
        cat.name AS category_name,
        COUNT(cp.id) FILTER (WHERE cp.status = 'APPROVED') AS approved_count,
        COUNT(cp.id) FILTER (WHERE cp.status = 'PENDING')  AS pending_count,
        COUNT(cp.id) FILTER (WHERE cp.status IN ('APPROVED','PENDING','REGISTERED')) AS total_registered
      FROM ctxh_activity ca
      LEFT JOIN ctxh_category cat ON cat.id = ca.category_id
      LEFT JOIN ctxh_participation cp ON cp.activity_id = ca.id
      WHERE ca.id IN (${placeholders})
      GROUP BY ca.id, cat.name;
    `;

    try {
      const rows = await this.dataSource.query(sql, activityIds);
      const enrichMap = new Map(rows.map((r: any) => [String(r.id), r]));

      return docs.map((doc) => {
        const extra = enrichMap.get(String(doc.metadata?.activityId)) as any;
        if (!extra) return doc;

        const remaining =
          extra.max_participants != null
            ? extra.max_participants - (extra.approved_count ?? 0)
            : null;

        return new Document({
          pageContent: doc.pageContent,
          metadata: {
            ...doc.metadata,
            requiresApproval: extra.requires_approval,
            maxParticipants: extra.max_participants,
            approvedCount: Number(extra.approved_count ?? 0),
            pendingCount: Number(extra.pending_count ?? 0),
            totalRegistered: Number(extra.total_registered ?? 0),
            remainingSlots: remaining,
            categoryName: extra.category_name,
          },
        });
      });
    } catch (err: any) {
      this.logger.warn(`[MetadataEnricher] Enrichment failed, returning unenriched docs: ${err?.message}`);
      // Graceful degradation — enrichment failure must not crash RAG pipeline
      return docs;
    }
  }
}
