import { describe, expect, it } from '@jest/globals';

jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: class {
    connect = jest.fn();
    close = jest.fn();
    listTools = jest.fn().mockResolvedValue({ tools: [] });
    callTool = jest.fn();
  },
}), { virtual: true });

jest.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: class {},
}), { virtual: true });

jest.mock('@modelcontextprotocol/sdk/types.js', () => ({}), { virtual: true });

jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: class {
    handleRequest = jest.fn();
    close = jest.fn();
  },
}), { virtual: true });

jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    tool = jest.fn();
    connect = jest.fn();
    close = jest.fn();
  },
}), { virtual: true });

describe('Zero-covered modules smoke', () => {
  it('should import ExportModule', () => {
    const mod = require('../export/export.module');
    expect(mod.ExportModule).toBeDefined();
  });

  it('should import CtxhMcpModule', () => {
    const mod = require('../ctxh-mcp/ctxh-mcp.module');
    expect(mod.CtxhMcpModule).toBeDefined();
  });

  it('should import CtxhChatModule', () => {
    const mod = require('../ctxh-chat/ctxh-chat.module');
    expect(mod.CtxhChatModule).toBeDefined();
  });
});
