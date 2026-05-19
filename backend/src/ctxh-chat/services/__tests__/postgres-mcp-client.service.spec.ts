import { ConfigService } from '@nestjs/config';
import { PostgresMcpClientService } from '../postgres-mcp-client.service';

jest.mock(
  '@modelcontextprotocol/sdk/client/index.js',
  () => ({
    Client: class {
      connect = jest.fn();
      close = jest.fn();
      listTools = jest.fn().mockResolvedValue({ tools: [] });
      callTool = jest.fn();
    },
  }),
  { virtual: true },
);

jest.mock(
  '@modelcontextprotocol/sdk/client/sse.js',
  () => ({
    SSEClientTransport: class {
      constructor(_: URL) {}
    },
  }),
  { virtual: true },
);

describe('PostgresMcpClientService', () => {
  const configService = {
    get: jest.fn().mockReturnValue('http://localhost:8000/sse'),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses tool input and sanitizes description', () => {
    const service = new PostgresMcpClientService(configService);

    expect((service as any).parseToolInput('{"a":1}', 'execute_sql')).toEqual({ a: 1 });
    expect((service as any).parseToolInput('SELECT 1', 'execute_sql')).toEqual({ sql: 'SELECT 1' });
    expect((service as any).parseToolInput('SELECT 1', 'explain_query')).toEqual({ sql: 'SELECT 1' });
    expect((service as any).parseToolInput('public', 'list_objects')).toEqual({ schema_name: 'public' });
    expect((service as any).parseToolInput('users', 'get_object_details')).toEqual({ object_name: 'users' });
    expect((service as any).parseToolInput('x', 'other')).toEqual({ input: 'x' });

    const long = 'x'.repeat(400);
    expect((service as any).sanitizeDescription(long).length).toBe(300);
  });

  it('reports connection state from private fields', () => {
    const service = new PostgresMcpClientService(configService);
    expect(service.isConnected()).toBe(false);

    (service as any).client = {};
    (service as any).tools = [{ name: 'mcp_execute_sql' }];
    expect(service.isConnected()).toBe(true);
    expect(service.getLangChainTools()).toHaveLength(1);
  });

  it('executeSql handles guard and errors', async () => {
    const service = new PostgresMcpClientService(configService);

    await expect(service.executeSql('SELECT 1')).rejects.toThrow('not connected');

    (service as any).client = { callTool: jest.fn() };
    await expect(service.executeSql('DROP TABLE x')).rejects.toThrow('từ chối');

    (service as any).client.callTool.mockResolvedValue({
      content: [{ type: 'text', text: 'Error: DB failed' }],
    });
    await expect(service.executeSql('SELECT 1')).rejects.toThrow('Error: DB failed');

    (service as any).client.callTool.mockResolvedValue({
      content: [
        { type: 'text', text: 'ok-1' },
        { type: 'text', text: 'ok-2' },
      ],
    });
    await expect(service.executeSql('SELECT 1')).resolves.toBe('ok-1\nok-2');
  });

  it('executeSqlRows parses rows and python repr parser handles literals', async () => {
    const service = new PostgresMcpClientService(configService);
    jest.spyOn(service, 'executeSql').mockResolvedValue(
      "[{'id': UUID('abc'), 'active': True, 'score': Decimal('1.5'), 'd': datetime.date(2026, 4, 30), 'dt': datetime.datetime(2026, 4, 30, 8, 5, 2), 'v': None}]",
    );

    const rows = await service.executeSqlRows('SELECT');
    expect(rows[0]).toMatchObject({
      id: 'abc',
      active: true,
      score: 1.5,
      d: '2026-04-30',
      dt: '2026-04-30T08:05:02',
      v: null,
    });

    expect(PostgresMcpClientService.parsePythonRepr('')).toEqual([]);
  });
});
