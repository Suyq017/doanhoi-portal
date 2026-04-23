import { Injectable, Logger } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { PostgresMcpClientService } from './postgres-mcp-client.service';

@Injectable()
export class McpMetadataEnricherService {
  private readonly logger = new Logger(McpMetadataEnricherService.name);

  constructor(private readonly mcpClient: PostgresMcpClientService) {}

  /**
   * Enrich một batch Document[] với metadata live từ database qua MCP.
   * Gọi sau vector search, trước khi format context cho LLM.
   * Thêm: requiresApproval, maxParticipants, remainingSlots, categoryName.
   */
  async enrichDocuments(docs: Document[]): Promise<Document[]> {
    if (!this.mcpClient.isConnected() || docs.length === 0) return docs;

    const activityIds = [
      ...new Set(docs.map((d) => d.metadata?.activityId).filter(Boolean)),
    ];

    if (activityIds.length === 0) return docs;

    const idList = activityIds.map((id) => `'${id}'`).join(',');
    const sql = `
      SELECT
        ca.id,
        ca.requires_approval,
        ca.max_participants,
        cat.name AS category_name,
        COUNT(cp.id) FILTER (WHERE cp.status = 'APPROVED') AS approved_count
      FROM ctxh_activity ca
      LEFT JOIN ctxh_category cat ON cat.id = ca.category_id
      LEFT JOIN ctxh_participation cp ON cp.activity_id = ca.id
      WHERE ca.id IN (${idList})
      GROUP BY ca.id, cat.name;
    `;

    try {
      const rows = await this.mcpClient.executeSqlRows(sql);
      const enrichMap = new Map(rows.map((r) => [String(r.id), r]));

      return docs.map((doc) => {
        const extra = enrichMap.get(String(doc.metadata?.activityId));
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
            remainingSlots: remaining,
            categoryName: extra.category_name,
          },
        });
      });
    } catch {
      // Graceful degradation — enrichment failure must not crash RAG pipeline
      return docs;
    }
  }
}
