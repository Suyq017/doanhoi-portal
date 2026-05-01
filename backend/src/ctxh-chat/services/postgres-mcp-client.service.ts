import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { DynamicTool } from '@langchain/core/tools';

/** MCP tools exposed to the Staff Agent's LLM (allowlist). */
export const ALLOWED_MCP_TOOLS = new Set([
  'mcp_execute_sql',
  'mcp_list_schemas',
  'mcp_list_objects',
  'mcp_get_object_details',
]);

/** Guard: reject SQL containing DDL / privilege-escalation keywords. */
const DANGEROUS_SQL_PATTERN =
  /\b(DROP|TRUNCATE|ALTER|GRANT|REVOKE|CREATE\s+ROLE|pg_read_file)\b/i;

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

  // ──────────────────────────────────────────────────────────
  // Connect & discover tools
  // ──────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    const sseUrl = this.configService.get<string>('POSTGRES_MCP_SSE_URL');

    try {
      this.logger.log(`Connecting to Postgres MCP at ${sseUrl}`);

      const transport = new SSEClientTransport(new URL(sseUrl));

      this.client = new Client(
        { name: 'doanhoi-nestjs-client', version: '1.0.0' },
        { capabilities: {} },
      );

      await this.client.connect(transport);
      this.logger.log('Connected to Postgres MCP Server');

      await this.discoverTools();
    } catch (error) {
      // Graceful degradation — MCP server may not be ready at startup
      this.logger.error(`Failed to connect to Postgres MCP: ${error?.message}`);
      this.logger.warn('Postgres MCP tools will be unavailable');
    }
  }

  // ──────────────────────────────────────────────────────────
  // Wrap MCP tools → LangChain DynamicTool[]
  // ──────────────────────────────────────────────────────────

  private async discoverTools(): Promise<void> {
    if (!this.client) return;

    const { tools: mcpTools } = await this.client.listTools();

    this.tools = mcpTools.map(
      (mcpTool) =>
        new DynamicTool({
          name: `mcp_${mcpTool.name}`,
          description: this.sanitizeDescription(mcpTool.description ?? mcpTool.name),
          func: async (input: string) => {
            try {
              const args = this.parseToolInput(input, mcpTool.name);

              const result = await this.client!.callTool({
                name: mcpTool.name,
                arguments: args,
              });

              const textContent = (result.content as any[])
                .filter((c) => c.type === 'text')
                .map((c) => c.text)
                .join('\n');

              return textContent || JSON.stringify(result.content);
            } catch (err: any) {
              this.logger.error(`MCP tool ${mcpTool.name} failed: ${err.message}`);
              return `Lỗi khi gọi tool ${mcpTool.name}: ${err.message}`;
            }
          },
        }),
    );

    this.logger.log(
      `Discovered ${this.tools.length} MCP tools: ${mcpTools.map((t) => t.name).join(', ')}`,
    );
  }

  // ──────────────────────────────────────────────────────────
  // Input parsing: DynamicTool gửi string → MCP cần object
  // ──────────────────────────────────────────────────────────

  private parseToolInput(input: string, toolName: string): Record<string, any> {
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    } catch {}

    switch (toolName) {
      case 'execute_sql':
        return { sql: input };       // crystaldba/postgres-mcp uses 'sql', not 'query'
      case 'explain_query':
        return { sql: input };
      case 'list_objects':
        return { schema_name: input || 'public' };
      case 'get_object_details':
        return { object_name: input };
      default:
        return { input };
    }
  }

  private sanitizeDescription(description: string): string {
    return description.length > 300 ? description.slice(0, 297) + '...' : description;
  }

  // ──────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────

  getLangChainTools(): DynamicTool[] {
    return this.tools;
  }

  isConnected(): boolean {
    return this.client !== null && this.tools.length > 0;
  }

  /**
   * Execute raw SQL via MCP execute_sql tool.
   * Used by McpSqlFallbackService and McpMetadataEnricherService
   * (vector search stays in NestJS — MCP only executes the final SQL).
   */
  async executeSql(query: string): Promise<string> {
    if (!this.client) throw new Error('Postgres MCP client not connected');

    if (DANGEROUS_SQL_PATTERN.test(query)) {
      throw new Error('Query bị từ chối: chứa từ khoá không được phép.');
    }

    const result = await this.client.callTool({
      name: 'execute_sql',
      arguments: { sql: query },   // crystaldba/postgres-mcp expects 'sql' not 'query'
    });

    const text = (result.content as any[])
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    if (text.startsWith('Error:')) {
      throw new Error(text);
    }

    return text;
  }

  /**
   * Execute SQL and return parsed rows.
   * crystaldba/postgres-mcp returns Python repr format, e.g.:
   *   [{'id': UUID('abc'), 'name': 'foo', 'active': True, 'val': None}]
   * This method converts that to a plain JS array of objects.
   */
  async executeSqlRows(query: string): Promise<Record<string, any>[]> {
    const raw = await this.executeSql(query);
    return PostgresMcpClientService.parsePythonRepr(raw);
  }

  /**
   * Parse the Python-repr list that crystaldba/postgres-mcp returns.
   * Handles: UUID('...'), Decimal('...'), datetime.date(...), True/False/None,
   * and single-quoted string values.
   */
  static parsePythonRepr(text: string): Record<string, any>[] {
    if (!text || !text.trim().startsWith('[')) return [];

    let s = text.trim();

    // Replace Python wrapper types before touching quotes
    s = s.replace(/UUID\('([^']*)'\)/g, '"$1"');
    s = s.replace(/Decimal\('([^']*)'\)/g, '$1');
    s = s.replace(/datetime\.datetime\(([^)]+)\)/g, (_, args) => {
      const parts = args.split(',').map((p: string) => p.trim().padStart(2, '0'));
      return `"${parts[0]}-${parts[1]}-${parts[2]}T${parts[3] || '00'}:${parts[4] || '00'}:${parts[5] || '00'}"`;
    });
    s = s.replace(/datetime\.date\((\d+),\s*(\d+),\s*(\d+)\)/g, (_, y, m, d) =>
      `"${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}"`,
    );

    // Python literals → JSON literals
    s = s.replace(/\bTrue\b/g, 'true');
    s = s.replace(/\bFalse\b/g, 'false');
    s = s.replace(/\bNone\b/g, 'null');

    // Single-quoted strings → double-quoted (handles embedded double quotes)
    s = s.replace(/'((?:[^'\\]|\\.)*)'/g, (_, inner) =>
      '"' + inner.replace(/\\'/g, "'").replace(/"/g, '\\"') + '"',
    );

    return JSON.parse(s);
  }
}
