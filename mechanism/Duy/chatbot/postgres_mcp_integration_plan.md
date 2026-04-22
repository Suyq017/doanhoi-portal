# Kế hoạch Tích hợp `crystaldba/postgres-mcp` vào Hệ thống CTXH

> **Tác giả**: Senior Backend Engineer & AI Solutions Architect  
> **Ngày**: 2026-04-22  
> **Repository tham chiếu**: https://github.com/crystaldba/postgres-mcp  
> **Image Docker**: `crystaldba/postgres-mcp` (port 8000, SSE transport)  
> **Nhánh hiện tại**: `feature/rag`

---

## Tổng quan Kiến trúc

```
┌────────────────────────────────────────────────────────────────────┐
│                        doanhoi-network (Docker bridge)             │
│                                                                    │
│  ┌──────────────┐   SSE/HTTP    ┌──────────────────────────────┐   │
│  │  NestJS App  │ ─────────────►│  postgres-mcp (port 8000)    │   │
│  │  (port 3000) │               │  crystaldba/postgres-mcp     │   │
│  │              │               │  --transport=sse             │   │
│  │  LangChain   │               │  --access-mode=unrestricted  │   │
│  │  StaffAgent  │               └──────────────┬───────────────┘   │
│  └──────────────┘                              │ psql              │
│                                                ▼                   │
│                                   ┌────────────────────────┐       │
│                                   │  PostgreSQL + pgvector │       │
│                                   │  doanhoi-postgres:5432 │       │
│                                   │  user: mcp_agent (*)   │       │
│                                   └────────────────────────┘       │
└────────────────────────────────────────────────────────────────────┘

(*) mcp_agent = role riêng, quyền CRUD + pgvector, KHÔNG phải superuser
```

Postgres MCP Pro hoạt động như một **MCP Server độc lập** lắng nghe SSE trên port 8000. NestJS kết nối tới nó qua `SSEClientTransport` (giao thức MCP over HTTP), lấy danh sách tool động, rồi wrap thành `DynamicTool` để bind vào Gemini thông qua LangChain.

---

## Phase 1 — Docker Architecture

### 1.1 Thêm service vào `docker-compose.yml`

```yaml
# Thêm vào phần services:

  postgres-mcp:
    image: crystaldba/postgres-mcp:latest
    container_name: doanhoi-postgres-mcp
    command:
      - "--transport=sse"
      - "--access-mode=unrestricted"   # Đổi thành restricted cho prod
    environment:
      DATABASE_URI: "postgresql://mcp_agent:mcp_secret_pw@doanhoi-postgres:5432/doanhoi"
    ports:
      - "8000:8000"           # Expose ra host để debug; bỏ đi ở production
    networks:
      - doanhoi-network
    depends_on:
      - postgres
    restart: unless-stopped
    # Không cần volume — image chỉ là một Python process nhỏ (~50 MB)
    # Không cần build context — dùng image sẵn từ Docker Hub
```

**Lý do chọn SSE thay vì Stdio:**

| Tiêu chí | Stdio | SSE (HTTP) |
|---|---|---|
| Image size | Phải nhúng server vào cùng container NestJS | Image riêng, tái sử dụng được |
| Multi-client | 1 process = 1 client | Nhiều service NestJS kết nối cùng lúc |
| Debug | Khó quan sát | Dùng `curl http://localhost:8000/sse` |
| Restart độc lập | Restart cả NestJS | Restart riêng mà không ảnh hưởng app |
| Docker networking | Pipe → không qua network | HTTP → hoạt động tự nhiên với Docker bridge |

### 1.2 Health-check (tuỳ chọn nhưng nên có)

```yaml
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

> **Lưu ý**: `crystaldba/postgres-mcp` chưa expose `/health` endpoint chính thức. Thay thế bằng `curl -f http://localhost:8000/` nếu image trả về 200 OK ở root.

---

## Phase 2 — Setup Database (Role an toàn cho MCP Agent)

Tạo role `mcp_agent` chuyên biệt — **không phải superuser**, chỉ có quyền vừa đủ.

### 2.1 SQL Script khởi tạo role

```sql
-- ════════════════════════════════════════════════════════════
-- File: docker/init-mcp-role.sql
-- Chạy một lần khi khởi tạo database hoặc qua psql/pgAdmin
-- ════════════════════════════════════════════════════════════

-- 1. Tạo user / role riêng cho MCP agent
CREATE USER mcp_agent WITH
  PASSWORD 'mcp_secret_pw'   -- Đổi thành secret mạnh hơn / lấy từ Vault
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  LOGIN;

-- 2. Kết nối vào database doanhoi
GRANT CONNECT ON DATABASE doanhoi TO mcp_agent;

-- 3. Quyền schema usage
GRANT USAGE ON SCHEMA public TO mcp_agent;

-- 4. Quyền SELECT, INSERT, UPDATE, DELETE trên toàn bộ bảng hiện tại
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO mcp_agent;

-- 5. Áp dụng cho các bảng tạo mới trong tương lai (quan trọng với TypeORM migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mcp_agent;

-- 6. Quyền dùng sequence (cần cho auto-increment / UUID default gen)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mcp_agent;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO mcp_agent;

-- 7. Quyền gọi các hàm/toán tử của pgvector
-- pgvector tạo các operator (<->, <=>, <#>) dưới schema public
-- không cần grant riêng, nhưng cần EXECUTE trên function
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mcp_agent;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO mcp_agent;

-- 8. (Tuỳ chọn) Deny DROP/TRUNCATE hoàn toàn bằng cách KHÔNG grant ALTER/DROP
-- Mặc định PostgreSQL không grant ALTER TABLE / DROP TABLE, nên đây là an toàn by default.

-- 9. Kiểm tra
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'mcp_agent'
LIMIT 20;
```

### 2.2 Mount script vào postgres container

```yaml
# Trong docker-compose.yml, thêm volume cho postgres:
  postgres:
    image: pgvector/pgvector:pg15-trixie
    # ... existing config ...
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init-mcp-role.sql:/docker-entrypoint-initdb.d/02-init-mcp-role.sql:ro
```

> PostgreSQL tự động chạy mọi file `.sql` trong `/docker-entrypoint-initdb.d/` theo thứ tự tên file khi tạo database lần đầu.

### 2.3 Quyền pgvector

pgvector thêm các toán tử vector `<->` (L2), `<=>` (cosine), `<#>` (inner product) vào schema public. Role `mcp_agent` cần EXECUTE permission trên các function operator này, nhưng vì đã grant `EXECUTE ON ALL FUNCTIONS IN SCHEMA public`, điều này được bao gồm tự động.

SQL ví dụ mà MCP agent sẽ thực thi khi làm vector search:

```sql
-- MCP Agent sẽ chạy câu này qua tool execute_sql:
SELECT
  ce.id,
  ce.activity_id,
  ce.embedding <=> '[0.1, 0.2, ...]'::vector AS distance
FROM ctxh_embedding ce
ORDER BY distance
LIMIT 10;
```

---

## Phase 3 — Triển khai NestJS & LangChain

### 3.1 Cài đặt dependencies

```bash
# Trong thư mục backend/
npm install @modelcontextprotocol/sdk
```

> Kiểm tra `backend/package.json` — nếu đã có `@modelcontextprotocol/sdk` (project có `ctxh-mcp` module), bỏ qua bước này.

### 3.2 Service kết nối MCP Server — `postgres-mcp-client.service.ts`

```typescript
// backend/src/ctxh-mcp/services/postgres-mcp-client.service.ts
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { DynamicTool } from '@langchain/core/tools';

@Injectable()
export class PostgresMcpClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgresMcpClientService.name);
  private client: Client | null = null;
  private tools: DynamicTool[] = [];

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.client?.close();
  }

  // ────────────────────────────────────────────────────────
  // Connect & discover tools
  // ────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    const sseUrl = this.configService.get<string>(
      'POSTGRES_MCP_SSE_URL',
      'http://doanhoi-postgres-mcp:8000/sse',   // Docker service name
    );

    try {
      this.logger.log(`Connecting to Postgres MCP at ${sseUrl}`);

      const transport = new SSEClientTransport(new URL(sseUrl));

      this.client = new Client(
        { name: 'doanhoi-nestjs-client', version: '1.0.0' },
        { capabilities: {} },
      );

      await this.client.connect(transport);
      this.logger.log('Connected to Postgres MCP Server');

      // Discover available tools
      await this.discoverTools();
    } catch (error) {
      // Graceful degradation: MCP server may not be ready at startup
      this.logger.error(`Failed to connect to Postgres MCP: ${error?.message}`);
      this.logger.warn('Postgres MCP tools will be unavailable');
    }
  }

  // ────────────────────────────────────────────────────────
  // Wrap MCP tools → LangChain DynamicTool[]
  // ────────────────────────────────────────────────────────

  private async discoverTools(): Promise<void> {
    if (!this.client) return;

    const { tools: mcpTools } = await this.client.listTools();

    this.tools = mcpTools.map((mcpTool) =>
      new DynamicTool({
        name: `mcp_${mcpTool.name}`,          // Prefix để phân biệt với custom tools
        description: this.sanitizeDescription(mcpTool.description ?? mcpTool.name),
        func: async (input: string) => {
          try {
            // LangChain DynamicTool truyền input là string — parse về object
            const args = this.parseToolInput(input, mcpTool.name);

            const result = await this.client!.callTool({
              name: mcpTool.name,
              arguments: args,
            });

            // MCP trả về content array — lấy text content đầu tiên
            const textContent = result.content
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join('\n');

            return textContent || JSON.stringify(result.content);
          } catch (err: any) {
            this.logger.error(`MCP tool ${mcpTool.name} failed: ${err.message}`);
            return `Lỗi khi gọi tool ${mcpTool.name}: ${err.message}`;
          }
        },
      }),
    );

    this.logger.log(`Discovered ${this.tools.length} MCP tools: ${mcpTools.map(t => t.name).join(', ')}`);
  }

  // ────────────────────────────────────────────────────────
  // Input parsing: DynamicTool gửi string → MCP cần object
  // ────────────────────────────────────────────────────────

  private parseToolInput(input: string, toolName: string): Record<string, any> {
    // Nếu LLM đã truyền JSON string, parse thẳng
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    } catch {}

    // Nếu là plain string (SQL query, schema name, ...), heuristic map theo tool
    switch (toolName) {
      case 'execute_sql':
        return { query: input };
      case 'explain_query':
        return { query: input };
      case 'list_objects':
        return { schema: input || 'public' };
      case 'get_object_details':
        return { object_name: input };
      default:
        return { input };
    }
  }

  private sanitizeDescription(description: string): string {
    // Giới hạn độ dài để không waste token khi bind vào Gemini
    return description.length > 300 ? description.slice(0, 297) + '...' : description;
  }

  // ────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────

  getLangChainTools(): DynamicTool[] {
    return this.tools;
  }

  isConnected(): boolean {
    return this.client !== null && this.tools.length > 0;
  }

  /**
   * Gọi thẳng execute_sql — dùng cho vector search thủ công
   * trong RAG pipeline mà không cần đi qua LLM tool-calling
   */
  async executeSql(query: string): Promise<string> {
    if (!this.client) throw new Error('Postgres MCP client not connected');

    const result = await this.client.callTool({
      name: 'execute_sql',
      arguments: { query },
    });

    return result.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');
  }
}
```

### 3.3 Bind MCP tools vào `StaffAgentService`

Sửa `staff-agent.service.ts` để inject và sử dụng MCP tools:

```typescript
// Thêm vào constructor của StaffAgentService:
constructor(
  // ... existing deps ...
  private readonly postgresMcpClient: PostgresMcpClientService,   // ← Thêm
) {}

// Sửa buildTools():
private buildTools(userId: string): (DynamicStructuredTool | DynamicTool)[] {
  const customTools = [
    this.buildSearchActivitiesTool(userId),
    this.buildApproveAndNotifyTool(userId),
    this.buildCreateActivityTool(userId),
    this.buildLookupCategoryTool(),
    this.buildLookupOrganizationTool(),
  ];

  // Merge với MCP tools — chỉ lấy các tool an toàn (execute_sql, list_objects, ...)
  const mcpTools = this.postgresMcpClient
    .getLangChainTools()
    .filter(t => ALLOWED_MCP_TOOLS.has(t.name));   // Allowlist

  return [...customTools, ...mcpTools];
}

// Allowlist: chỉ expose các tool cần thiết cho Staff Agent
const ALLOWED_MCP_TOOLS = new Set([
  'mcp_execute_sql',      // Truy vấn dữ liệu theo yêu cầu tự do
  'mcp_list_schemas',     // Hiểu schema DB
  'mcp_list_objects',     // Liệt kê bảng
  'mcp_get_object_details', // Xem cột/index
  // Bỏ: analyze_workload_indexes, get_top_queries (không cần cho chatbot CRUD)
]);
```

### 3.4 Module registration

```typescript
// backend/src/ctxh-mcp/ctxh-mcp.module.ts (thêm provider)
import { PostgresMcpClientService } from './services/postgres-mcp-client.service';

@Module({
  // ...
  providers: [
    // existing providers...
    PostgresMcpClientService,
  ],
  exports: [PostgresMcpClientService],
})
export class CtxhMcpModule {}
```

```typescript
// Trong CtxhChatModule (hoặc AppModule) thêm import:
imports: [CtxhMcpModule, ...]
```

---

## Phase 4 — Vector Search với pgvector qua MCP

Đây là phần phức tạp nhất. Vấn đề cốt lõi: pgvector cần **embedding vector** từ câu hỏi người dùng để tìm kiếm, nhưng MCP Server chỉ nhận SQL string — nó không tự sinh embedding.

### 4.1 Luồng kết hợp (Hybrid Approach)

```
Câu hỏi người dùng
        │
        ▼
 [NestJS: Embed query]          ← Dùng Gemini embedding API (như hiện tại)
 embedding = float[]
        │
        ▼
 [NestJS: Build SQL]            ← Tự build câu SQL với vector literal
 query = "SELECT ... WHERE embedding <=> '[...]'::vector ORDER BY ..."
        │
        ▼
 [Gọi MCP execute_sql(query)]   ← MCP Server chạy SQL trên Postgres, trả về kết quả
        │
        ▼
 [NestJS: Format & return]      ← Parse kết quả, đưa vào context cho LLM
```

### 4.2 Service thực thi vector search qua MCP

```typescript
// backend/src/ctxh-chat/services/mcp-vector-search.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { PostgresMcpClientService } from '../../ctxh-mcp/services/postgres-mcp-client.service';
import { LangChainVectorStoreService } from './langchain-vector-store.service';

@Injectable()
export class McpVectorSearchService {
  private readonly logger = new Logger(McpVectorSearchService.name);

  constructor(
    private readonly mcpClient: PostgresMcpClientService,
    private readonly vectorStoreService: LangChainVectorStoreService,
  ) {}

  /**
   * Tìm kiếm vector qua MCP execute_sql thay vì gọi trực tiếp TypeORM.
   *
   * Ưu điểm so với gọi TypeORM trực tiếp:
   * - Audit trail: mọi SQL đều đi qua MCP → có thể log, rate-limit
   * - Role separation: NestJS app dùng postgres superuser, MCP agent dùng mcp_agent role
   * - Giải pháp fallback khi LangChain VectorStore không hỗ trợ một số filter phức tạp
   */
  async similaritySearch(
    question: string,
    k: number = 5,
    filter?: Record<string, any>,
  ): Promise<Document[]> {
    // 1. Lấy embedding vector từ vectorStoreService (reuse logic hiện tại)
    const embeddings = this.vectorStoreService.getEmbeddings();
    const queryVector = await embeddings.embedQuery(question);

    // 2. Build SQL với pgvector cosine distance
    const vectorLiteral = `[${queryVector.join(',')}]`;
    const whereClause = this.buildWhereClause(filter);

    const sql = `
      SELECT
        ce.id,
        ce.activity_id,
        ce.chunk_text   AS page_content,
        ca.name         AS activity_name,
        ca.status,
        ca.start_date,
        ca.end_date,
        ca.location,
        ca.total_days,
        org.name        AS organization_name,
        (ce.embedding <=> '${vectorLiteral}'::vector) AS cosine_distance
      FROM ctxh_embedding ce
      JOIN ctxh_activity ca ON ca.id = ce.activity_id
      LEFT JOIN organizations org ON org.id = ca.organization_id
      WHERE ca.deleted_at IS NULL
        ${whereClause}
      ORDER BY cosine_distance ASC
      LIMIT ${k};
    `;

    // 3. Thực thi qua MCP
    const rawResult = await this.mcpClient.executeSql(sql);

    // 4. Parse kết quả (MCP trả về JSON string hoặc table format)
    return this.parseToDocuments(rawResult);
  }

  private buildWhereClause(filter?: Record<string, any>): string {
    if (!filter || Object.keys(filter).length === 0) return '';

    const clauses: string[] = [];

    if (filter.status) {
      // Escape để chống SQL injection (mcp_agent không có DROP privilege, nhưng vẫn nên sanitize)
      const status = filter.status.replace(/[^A-Z_]/g, '');
      clauses.push(`AND ca.status = '${status}'`);
    }

    if (filter.organizationKeywords?.length) {
      const kws = filter.organizationKeywords
        .map((k: string) => `org.name ILIKE '%${k.replace(/'/g, "''")}%'`)
        .join(' OR ');
      clauses.push(`AND (${kws})`);
    }

    if (filter.startDate) {
      clauses.push(`AND ca.end_date >= '${filter.startDate}'`);
    }

    if (filter.endDate) {
      clauses.push(`AND ca.start_date <= '${filter.endDate}'`);
    }

    return clauses.join('\n        ');
  }

  private parseToDocuments(rawResult: string): Document[] {
    try {
      // postgres-mcp trả về JSON array khi query thành công
      const rows = JSON.parse(rawResult);
      if (!Array.isArray(rows)) return [];

      return rows.map((row: any) => new Document({
        pageContent: row.page_content ?? '',
        metadata: {
          activityId: row.activity_id,
          activityName: row.activity_name,
          status: row.status,
          startDate: row.start_date,
          endDate: row.end_date,
          location: row.location,
          totalDays: row.total_days,
          organizationName: row.organization_name,
          score: 1 - parseFloat(row.cosine_distance ?? '1'),
        },
      }));
    } catch (err) {
      this.logger.warn(`Failed to parse MCP result: ${err?.message}`);
      return [];
    }
  }
}
```

### 4.3 Token Optimization — Tránh truyền vector vào LLM

**Vấn đề**: Nếu LLM tự sinh câu SQL có vector literal `[0.123, 0.456, ...]` (1536 chiều), sẽ tốn hàng nghìn token.

**Giải pháp**: Dùng 2-layer approach:

```
Layer 1 (NestJS, không qua LLM):
  → Tự embed query → tự build SQL vector → gọi MCP.executeSql() trực tiếp
  → Trả về danh sách activity đã format (text ngắn, không có vector)

Layer 2 (LLM tool call):
  → LLM chỉ thấy tool "search_by_text" với input là string câu hỏi
  → Tool handler ở NestJS mới embed + call MCP
  → LLM KHÔNG BAO GIỜ thấy vector literal
```

```typescript
// Tool "search_by_text" expose cho LLM — ẩn hoàn toàn vector logic:
private buildMcpSemanticSearchTool(): DynamicStructuredTool {
  const mcpVectorSearch = this.mcpVectorSearchService;

  return new DynamicStructuredTool({
    name: 'mcp_semantic_search',
    description:
      'Tìm kiếm ngữ nghĩa tài liệu CTXH qua MCP. Truyền câu hỏi plain text, ' +
      'hệ thống tự chuyển thành vector embedding và tìm trong pgvector. ' +
      'Dùng khi cần tìm hoạt động theo mô tả tự nhiên.',
    schema: z.object({
      query: z.string().describe('Câu hỏi hoặc từ khoá tìm kiếm'),
      k: z.number().int().min(1).max(20).default(5).describe('Số kết quả trả về'),
      status_filter: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'DRAFT']).optional(),
    }),
    func: async ({ query, k, status_filter }) => {
      const filter = status_filter ? { status: status_filter } : undefined;
      const docs = await mcpVectorSearch.similaritySearch(query, k, filter);
      // Trả về text format nhỏ gọn, không bao giờ trả về raw vector
      return JSON.stringify(
        docs.map((d, i) => ({
          rank: i + 1,
          activity_id: d.metadata.activityId,
          name: d.metadata.activityName,
          status: d.metadata.status,
          organization: d.metadata.organizationName,
          location: d.metadata.location,
          start_date: d.metadata.startDate,
          end_date: d.metadata.endDate,
          excerpt: d.pageContent.slice(0, 200),
          relevance_score: d.metadata.score?.toFixed(3),
        }))
      );
    },
  });
}
```

---

## Phase 5 — Bảo mật & Giới hạn

### 5.1 Ma trận rủi ro khi LLM thực thi SQL

| Rủi ro | Mức độ | Biện pháp |
|---|---|---|
| **SQL Injection qua LLM** (LLM bị prompt injection, tạo `DROP TABLE`) | Cao | `mcp_agent` role không có DROP/ALTER privilege |
| **Data exfiltration** (LLM dump toàn bộ bảng users) | Trung bình | Restricted mode + execution time limit |
| **Token flooding** (query trả về 10MB JSON) | Trung bình | `LIMIT` trong SQL, timeout MCP |
| **SSRF via MCP** (kẻ tấn công inject URL vào tool params) | Thấp | MCP chỉ accept PostgreSQL connection, không có network call |
| **Permission escalation** (LLM tìm cách GRANT quyền) | Thấp | mcp_agent không có GRANT privilege |

### 5.2 Cấu hình Restricted Mode cho Production

```yaml
# docker-compose.yml — production config
  postgres-mcp:
    command:
      - "--transport=sse"
      - "--access-mode=restricted"    # ← Read-only + execution time limit
    # Với restricted mode, execute_sql CHỈ chạy SELECT, EXPLAIN
    # INSERT/UPDATE/DELETE bị từ chối ở tầng MCP
```

**Trade-off**: Với `--access-mode=restricted`, bạn mất khả năng LLM tự INSERT/UPDATE qua MCP. Đây là **chấp nhận được** vì:
- Toàn bộ write operations (tạo hoạt động, duyệt đăng ký) đã được xử lý qua custom tools TypeScript an toàn của `StaffAgentService`.
- MCP chỉ cần để **đọc và phân tích dữ liệu**.

### 5.3 Allowlist tool tầng NestJS

```typescript
// staff-agent.service.ts
// Chỉ cho phép một subset các MCP tool (không expose analyze_workload_indexes cho chatbot)
const ALLOWED_MCP_TOOLS = new Set([
  'mcp_execute_sql',
  'mcp_list_schemas',
  'mcp_list_objects',
  'mcp_get_object_details',
  // Không include: mcp_get_top_queries, mcp_analyze_workload_indexes, mcp_analyze_db_health
  // → Các tool này phức tạp, risk cao với LLM, chỉ dùng cho admin dashboard
]);
```

### 5.4 Query rewrite guard (tuỳ chọn nâng cao)

Nếu muốn thêm lớp bảo vệ trước khi truyền SQL vào MCP:

```typescript
// Trong PostgresMcpClientService.executeSql():
async executeSql(query: string): Promise<string> {
  // Guard: từ chối các từ khoá nguy hiểm
  const DANGEROUS_KEYWORDS = /\b(DROP|TRUNCATE|ALTER|GRANT|REVOKE|CREATE\s+ROLE|pg_read_file)\b/i;
  if (DANGEROUS_KEYWORDS.test(query)) {
    throw new Error(`Query bị từ chối: chứa từ khoá không được phép.`);
  }

  // ... rest of executeSql
}
```

### 5.5 Secrets management

```bash
# backend/.env
POSTGRES_MCP_SSE_URL=http://doanhoi-postgres-mcp:8000/sse

# docker-compose.yml — dùng env file thay vì hardcode
  postgres-mcp:
    env_file:
      - ./backend/.env.mcp       # File riêng, không commit lên git
    environment:
      DATABASE_URI: "postgresql://mcp_agent:${MCP_DB_PASSWORD}@doanhoi-postgres:5432/doanhoi"
```

```bash
# backend/.env.mcp (add to .gitignore)
MCP_DB_PASSWORD=<strong-random-password>
```

---

## Phase 6 — Biến môi trường tổng hợp

```bash
# backend/.env (bổ sung)

# ── Postgres MCP ──────────────────────────────────────────
POSTGRES_MCP_SSE_URL=http://doanhoi-postgres-mcp:8000/sse

# ── MCP Access Mode: "unrestricted" (dev) | "restricted" (prod) ──
POSTGRES_MCP_ACCESS_MODE=unrestricted

# ── MCP Agent DB credentials (tách khỏi app user) ─────────
MCP_DB_USER=mcp_agent
MCP_DB_PASSWORD=<strong-random-password>
MCP_DB_NAME=doanhoi
```

---

## Tóm tắt Thứ tự Triển khai

```
[1] Chạy SQL script tạo mcp_agent role → verify với \du trong psql
[2] Thêm postgres-mcp service vào docker-compose.yml
[3] docker-compose up postgres-mcp → verify: curl http://localhost:8000/sse
[4] Implement PostgresMcpClientService.ts
[5] Register service trong CtxhMcpModule
[6] Inject vào StaffAgentService, thêm ALLOWED_MCP_TOOLS filter
[7] (Tuỳ chọn) Implement McpVectorSearchService nếu muốn route vector search qua MCP
[8] Test: gửi message tới StaffAgent, kiểm tra mcp_execute_sql được gọi đúng
[9] Production: đổi --access-mode=restricted, ẩn port 8000 ra ngoài
```

---

## Lưu ý về Codebase Hiện tại

Dựa trên code đã đọc:

1. **`staff-agent.service.ts`** — buildTools() hiện tại trả về `DynamicStructuredTool[]`. Sau khi thêm MCP tools (DynamicTool), cần đổi return type thành `(DynamicStructuredTool | DynamicTool)[]` và cập nhật `toolMap`.

2. **`langchain-rag-chain.service.ts`** — RAG pipeline hiện chạy qua `LangChainVectorStoreService` (TypeORM trực tiếp). `McpVectorSearchService` là một **alternative** route, không phải thay thế bắt buộc. Hai service cùng tồn tại được.

3. **`ctxh-mcp` module** — Đã có cấu trúc MCP server và tools riêng. Service `PostgresMcpClientService` đặt vào đây là phù hợp về mặt tổ chức code.

4. **pgvector image** — `pgvector/pgvector:pg15-trixie` đã sẵn có extension pgvector. Không cần thêm bước `CREATE EXTENSION vector`.

---

## Phase 7 — Giải quyết các Vấn đề Chatbot đã Phân tích (`improve_chatboi.md`)

> **Nguồn tham chiếu**: `improve_chatboi.md` — phân tích 5 vấn đề hiện tại của chatbot CTXH.

MCP `execute_sql` là **vũ khí chiến lược** để giải quyết các lỗi retrieval mà prompt-tuning không thể fix triệt để. Phần này map từng vấn đề sang giải pháp MCP cụ thể.

---

### 7.1 Ma trận Vấn đề ↔ Giải pháp MCP

| Vấn đề (`improve_chatboi.md`) | Độ ưu tiên | Giải pháp MCP |
|---|---|---|
| Bảng ánh xạ thiếu "sẽ diễn ra", "trong tương lai" | P0 | `execute_sql WHERE start_date > NOW()` — bypass filter extraction hoàn toàn |
| RAG prompt cứng nhắc khi context rỗng | P0 | MCP làm fallback authoritative — nếu vector search = 0 → chạy SQL thẳng |
| Retrieval Verifier fallback không giữ status filter | P1 | `execute_sql` với explicit `WHERE status = 'ACTIVE'` — không phụ thuộc embedding |
| Tool Selector xử lý kém câu hỏi "liệt kê tất cả" | P2 | Tool mới `mcp_list_activities` dùng SQL `ORDER BY start_date LIMIT 20` |
| Metadata embedding thiếu `requiresApproval`, `maxParticipants`, `categoryName` | P2 (long-term) | JOIN live qua `execute_sql` — không cần re-embed |

---

### 7.2 MCP SQL Fallback khi Vector Search thất bại

**Vấn đề gốc (P0)**: Câu hỏi "hoạt động nào sẽ diễn ra trong tương lai?" → filter extraction không nhận ra "sẽ diễn ra" → trả về `status: undefined` → similarity search trả về 0 hoặc sai kết quả → prompt ép trả lời "chưa có thông tin".

**Giải pháp**: Thêm `McpSqlFallbackService` — khi vector search trả 0 kết quả, thay vì chỉ dùng Verifier LLM để rewrite query, **song song** gọi MCP `execute_sql` với query SQL xác định:

```typescript
// backend/src/ctxh-chat/services/mcp-sql-fallback.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { PostgresMcpClientService } from '../../ctxh-mcp/services/postgres-mcp-client.service';

export type StatusHint = 'upcoming' | 'ongoing' | 'all';

@Injectable()
export class McpSqlFallbackService {
  private readonly logger = new Logger(McpSqlFallbackService.name);

  constructor(private readonly mcpClient: PostgresMcpClientService) {}

  /**
   * Fallback khi vector search trả 0 kết quả.
   * Chạy SQL trực tiếp — không phụ thuộc embedding similarity.
   *
   * Ưu tiên dùng khi:
   * - isListingQuery = true ("liệt kê tất cả", "có gì")
   * - inferredStatus != null ("sẽ diễn ra", "đang mở")
   * - Verifier đã thử mà vẫn 0 kết quả
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
      const raw = await this.mcpClient.executeSql(sql);
      const rows = JSON.parse(raw);

      if (!Array.isArray(rows) || rows.length === 0) {
        this.logger.debug('[MCP Fallback] SQL returned 0 rows');
        return [];
      }

      this.logger.debug(`[MCP Fallback] SQL returned ${rows.length} activities (statusHint=${statusHint})`);

      // Convert rows → LangChain Documents để tương thích với RAG pipeline hiện tại
      return rows.map((row: any) => new Document({
        pageContent: [
          row.activity_name,
          row.description ?? '',
          row.organization_name ?? '',
          row.category_name ?? '',
          row.location ?? '',
        ].filter(Boolean).join(' — '),
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
          requiresApproval: row.requires_approval,   // ← metadata mới (fix P2)
          maxParticipants: row.max_participants,       // ← metadata mới (fix P2)
          source: 'mcp_sql_fallback',                 // Tag để debug/log
        },
      }));
    } catch (err: any) {
      this.logger.error(`[MCP Fallback] executeSql failed: ${err.message}`);
      return [];
    }
  }

  private buildStatusWhereClause(statusHint: StatusHint, currentDate: string): string {
    switch (statusHint) {
      case 'upcoming':
        // Hoạt động chưa bắt đầu — "sẽ diễn ra", "trong tương lai", "tuần tới"
        return `AND ca.start_date > '${currentDate}'`;
      case 'ongoing':
        // Hoạt động đang diễn ra hôm nay — "đang mở", "hiện tại", "bây giờ"
        return `AND ca.start_date <= '${currentDate}' AND ca.end_date >= '${currentDate}'`;
      case 'all':
      default:
        // Tất cả hoạt động chưa kết thúc — "liệt kê tất cả", "có gì"
        return `AND ca.end_date >= '${currentDate}'`;
    }
  }
}
```

---

### 7.3 Tích hợp MCP Fallback vào `LangChainRagChainService`

Sửa hàm `retrieveDocumentsWithVerification()` để tích hợp MCP fallback song song với Verifier:

```typescript
// Trong langchain-rag-chain.service.ts
// Inject thêm McpSqlFallbackService vào constructor

private async retrieveDocumentsWithVerification(
  question: string,
  currentDate: string,
  topK: number,
  useMMR: boolean,
  userOrg?: string,
): Promise<Document[]> {
  const docs = await this.selectAndExecuteTool(question, currentDate, topK, useMMR, userOrg);

  // Fast-path: kết quả tốt → không cần fallback
  if (docs.length > 0) {
    return docs;
  }

  // ── Zero-result: chạy song song Verifier LLM + MCP SQL fallback ───────────
  this.logger.warn(`[Verifier+MCP] Primary retrieval 0 docs — running parallel fallback`);

  // 1. Infer status hint từ câu hỏi (không cần LLM, chỉ regex nhanh)
  const statusHint = this.inferStatusFromQuestion(question);

  // 2. Chạy song song: Verifier LLM rewrite + MCP SQL query
  const [verifierDocs, mcpDocs] = await Promise.allSettled([
    this.runVerifierFallback(question, currentDate, topK),
    this.mcpFallbackService.fallbackSearch(statusHint ?? 'all', topK, currentDate),
  ]);

  const verifierResults = verifierDocs.status === 'fulfilled' ? verifierDocs.value : [];
  const mcpResults     = mcpDocs.status === 'fulfilled'     ? mcpDocs.value     : [];

  // 3. Merge: MCP SQL (deterministic) ưu tiên hơn Verifier LLM (probabilistic)
  const seenIds = new Set<string>();
  const merged: Document[] = [];

  // MCP SQL trước — kết quả chính xác, không bị ảnh hưởng bởi embedding quality
  for (const doc of mcpResults) {
    const id = doc.metadata?.activityId;
    if (id && !seenIds.has(String(id))) {
      seenIds.add(String(id));
      merged.push(doc);
    }
  }

  // Verifier docs bổ sung (những gì MCP không có)
  for (const doc of verifierResults) {
    const id = doc.metadata?.activityId;
    if (!id || !seenIds.has(String(id))) {
      if (id) seenIds.add(String(id));
      merged.push(doc);
    }
  }

  this.logger.debug(
    `[Verifier+MCP] Merged: ${mcpResults.length} MCP + ${verifierResults.length} verifier → ${merged.length} total`,
  );

  return merged.slice(0, topK);
}

// ── Tách Verifier logic ra helper để code gọn ──────────────────────────────
private async runVerifierFallback(
  question: string,
  currentDate: string,
  topK: number,
): Promise<Document[]> {
  try {
    const structuredLlm = this.llm.withStructuredOutput(VerifierOutputSchema, {
      name: 'verify_retrieval',
    });
    const verifierResult = await RETRIEVAL_VERIFIER_PROMPT.pipe(structuredLlm).invoke({ question });

    if (verifierResult.verdict === 'NEEDS_SUPPLEMENT' && verifierResult.supplementQuery) {
      return this.vectorStoreService.similaritySearchWithDateFilter(
        verifierResult.supplementQuery,
        topK,
        currentDate,
        'all',
      );
    }
  } catch (err: any) {
    this.logger.warn(`[Verifier] LLM failed: ${err.message}`);
  }
  return [];
}

// ── Infer status không cần LLM (fix P0: "sẽ diễn ra", "tương lai") ────────
private inferStatusFromQuestion(q: string): StatusHint | null {
  // Mở rộng từ improve_chatboi.md §4.2
  const upcomingPatterns = /sẽ\s*(diễn ra|tổ chức|có|mở)|trong tương lai|tương lai|sắp\s*(tới|diễn ra|có)|chuẩn bị|chưa bắt đầu|tuần tới|tháng tới|năm tới/i;
  const ongoingPatterns  = /đang\s*(diễn ra|mở|tổ chức|có)|hiện tại|hiện nay|bây giờ|hôm nay|còn (mở|tuyển|nhận)|đang tuyển/i;

  if (upcomingPatterns.test(q)) return 'upcoming';
  if (ongoingPatterns.test(q))  return 'ongoing';
  return null;
}
```

---

### 7.4 Tool `mcp_list_activities` — Xử lý câu hỏi liệt kê (fix P2)

**Vấn đề gốc (P2)**: "liệt kê tất cả hoạt động" → ToolSelector chọn `search_diverse` (MMR) → kết quả phụ thuộc embedding similarity → miss hoạt động quan trọng vì không giống câu query ngắn.

**Giải pháp**: Tool riêng dùng SQL `ORDER BY start_date` — không cần embedding.

```typescript
// Thêm vào PostgresMcpClientService hoặc McpSqlFallbackService:

/**
 * Tool cho LLM gọi khi muốn liệt kê hoạt động theo SQL thuần
 * Không dùng embedding — đảm bảo không miss kết quả
 */
buildListActivitiesTool(): DynamicStructuredTool {
  const mcpClient = this.mcpClient;

  return new DynamicStructuredTool({
    name: 'list_activities_sql',
    description:
      'Liệt kê hoạt động CTXH trực tiếp từ database qua SQL. ' +
      'Dùng khi user muốn XEM TẤT CẢ / DANH SÁCH hoạt động (sắp tới, đang diễn ra, hoặc toàn bộ). ' +
      'Chính xác hơn search_semantic vì không phụ thuộc embedding. ' +
      'Ví dụ: "liệt kê", "có gì", "tất cả hoạt động", "hoạt động nào còn mở".',
    schema: z.object({
      status_hint: z
        .enum(['upcoming', 'ongoing', 'all'])
        .default('all')
        .describe(
          'upcoming = chưa bắt đầu (sẽ diễn ra / tương lai), ' +
          'ongoing = đang diễn ra hôm nay, ' +
          'all = tất cả hoạt động chưa kết thúc',
        ),
      organization_keyword: z
        .string()
        .optional()
        .describe('Tên tổ chức/khoa (ILIKE search), ví dụ: "Khoa Máy tính", "Đoàn Trường"'),
      limit: z.number().int().min(1).max(30).default(10),
    }),
    func: async ({ status_hint, organization_keyword, limit }) => {
      const today = new Date().toISOString().split('T')[0];
      let whereExtra = '';

      if (status_hint === 'upcoming') {
        whereExtra = `AND ca.start_date > '${today}'`;
      } else if (status_hint === 'ongoing') {
        whereExtra = `AND ca.start_date <= '${today}' AND ca.end_date >= '${today}'`;
      } else {
        whereExtra = `AND ca.end_date >= '${today}'`;
      }

      if (organization_keyword) {
        const safe = organization_keyword.replace(/'/g, "''");
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
        const raw = await mcpClient.executeSql(sql);
        const rows = JSON.parse(raw);
        if (!Array.isArray(rows) || rows.length === 0) {
          return JSON.stringify({ found: 0, activities: [], message: 'Không tìm thấy hoạt động nào phù hợp.' });
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
    },
  });
}
```

Thêm tool này vào `buildTools()` của `LangChainRagChainService` (dành cho Student chatbot) — **không** vào StaffAgent (đã có search_activities riêng).

---

### 7.5 Live Metadata qua MCP — Không cần re-embed (fix P2 long-term)

**Vấn đề gốc (P2)**: Metadata trong embeddings thiếu `requiresApproval`, `maxParticipants`, `categoryName` → AI không thể nói "còn X chỗ".

**Giải pháp MCP**: Sau khi vector search lấy được danh sách `activityId`, JOIN live với SQL để enrich metadata — **không cần re-embed toàn bộ**.

```typescript
// backend/src/ctxh-chat/services/mcp-metadata-enricher.service.ts
@Injectable()
export class McpMetadataEnricherService {
  constructor(private readonly mcpClient: PostgresMcpClientService) {}

  /**
   * Enrich một batch Document[] với metadata live từ database qua MCP.
   * Gọi sau vector search, trước khi format context cho LLM.
   */
  async enrichDocuments(docs: Document[]): Promise<Document[]> {
    if (!this.mcpClient.isConnected() || docs.length === 0) return docs;

    const activityIds = [...new Set(
      docs.map(d => d.metadata?.activityId).filter(Boolean)
    )];

    if (activityIds.length === 0) return docs;

    // Một SQL query duy nhất lấy toàn bộ metadata cần thiết
    const idList = activityIds.map(id => `'${id}'`).join(',');
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
      const raw = await this.mcpClient.executeSql(sql);
      const rows: any[] = JSON.parse(raw);
      const enrichMap = new Map(rows.map(r => [String(r.id), r]));

      return docs.map(doc => {
        const extra = enrichMap.get(String(doc.metadata?.activityId));
        if (!extra) return doc;

        const remaining = extra.max_participants != null
          ? extra.max_participants - (extra.approved_count ?? 0)
          : null;

        return new Document({
          pageContent: doc.pageContent,
          metadata: {
            ...doc.metadata,
            requiresApproval: extra.requires_approval,   // fix: AI biết cần duyệt hay không
            maxParticipants:  extra.max_participants,
            remainingSlots:   remaining,                  // fix: AI nói "còn X chỗ"
            categoryName:     extra.category_name,        // fix: filter theo danh mục
          },
        });
      });
    } catch {
      return docs; // Graceful degradation
    }
  }
}
```

**Điểm tích hợp**: Gọi `enrichDocuments()` ở bước 6 (sau retrieval, trước `formatDocumentsAsContext`) trong `LangChainRagChainService.invoke()`:

```typescript
// Trong invoke(), thay dòng:
const formattedContext = this.formatDocumentsAsContext(sources, currentDate);

// Thành:
const enrichedSources = await this.mcpEnricher.enrichDocuments(sources);
const formattedContext = this.formatDocumentsAsContext(enrichedSources, currentDate);
```

---

### 7.6 Checklist Tổng hợp — Thứ tự Triển khai Kết hợp

| Thứ tự | Task | Vấn đề giải quyết | File liên quan |
|---|---|---|---|
| **1** | Triển khai `PostgresMcpClientService` + Docker | Nền tảng cho tất cả | `ctxh-mcp/services/` |
| **2** | Triển khai `McpSqlFallbackService` | P0 — context rỗng, "sẽ diễn ra" | `ctxh-chat/services/` |
| **3** | Tích hợp MCP fallback vào `retrieveDocumentsWithVerification()` | P0+P1 — vector search thất bại | `langchain-rag-chain.service.ts` |
| **4** | Sửa bảng ánh xạ status trong prompt | P0 — từ đồng nghĩa thiếu | `filter-extraction.prompt.ts` |
| **5** | Sửa RAG prompt (bớt cứng nhắc) | P0 — "chưa có thông tin" cứng | `ctxh-chat.prompts.ts` |
| **6** | Thêm `list_activities_sql` tool | P2 — listing queries | `langchain-rag-chain.service.ts` |
| **7** | Triển khai `McpMetadataEnricherService` | P2 — metadata thiếu | `ctxh-chat/services/` |
| **8** | Cải thiện `inferStatusFromQuestion()` | P1 — fallback không giữ status | `langchain-rag-chain.service.ts` |
| **9** | UX: Sửa tone/persona, GREETING, CHITCHAT response | P1 — trải nghiệm | `ctxh-chat.prompts.ts`, controller |
| **10** | Follow-up suggestions dựa trên intent | P1 — suggestions cứng nhắc | `ctxh-chat.controller.ts` |

---

### 7.7 Kiến trúc Luồng Xử lý Sau Khi Tích hợp

```
Câu hỏi user
      │
      ▼
  RouterAgent (classify intent)
      │
      ├─ GREETING / CHITCHAT → trả lời ngay (không retrieval)
      │
      ├─ REGISTER_ACTIVITY → handleRegistrationIntent()
      │
      └─ RAG_QUERY ──────────────────────────────────────────┐
                                                             │
                   ┌─────────────────────────────────────────▼──────────┐
                   │          selectAndExecuteTool()                     │
                   │                                                     │
                   │   ToolSelector LLM chọn:                           │
                   │   ├─ search_with_filters → extractFilters + SQL    │
                   │   ├─ search_semantic     → pure embedding          │
                   │   ├─ search_diverse      → MMR                     │
                   │   └─ list_activities_sql → MCP SQL trực tiếp ←NEW  │
                   └─────────────────────────────────────────────────────┘
                                    │
                              docs.length > 0?
                             /              \
                           YES               NO
                            │                │
                            │    ┌───────────▼────────────────────────┐
                            │    │  Parallel Fallback (NEW)            │
                            │    │  ├─ Verifier LLM rewrite            │
                            │    │  └─ McpSqlFallbackService.search()  │
                            │    │     (inferStatusFromQuestion)        │
                            │    │  → Merge, MCP results ưu tiên       │
                            │    └───────────┬────────────────────────┘
                            │                │
                            └────────────────┘
                                    │
                   McpMetadataEnricherService.enrichDocuments() ←NEW
                   (JOIN live: requiresApproval, maxParticipants, slots còn lại)
                                    │
                   formatDocumentsAsContext() → ragChain → response
```
