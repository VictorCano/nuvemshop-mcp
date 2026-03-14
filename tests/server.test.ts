import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock the MCP SDK modules
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  const McpServer = vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
  }));
  return { McpServer };
});

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  const StdioServerTransport = vi.fn().mockImplementation(() => ({}));
  return { StdioServerTransport };
});

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
  const StreamableHTTPServerTransport = vi.fn().mockImplementation(() => ({
    handleRequest: vi.fn().mockResolvedValue(undefined),
  }));
  return { StreamableHTTPServerTransport };
});

vi.mock('../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('createServer', () => {
  it('returns an McpServer instance', async () => {
    const { createServer } = await import('../src/server.js');
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    const server = createServer();
    expect(McpServer).toHaveBeenCalledWith({
      name: 'nuvemshop-mcp',
      version: expect.any(String) as string,
    });
    expect(server).toBeDefined();
  });

  it('creates server with version from package.json', async () => {
    const { createServer } = await import('../src/server.js');
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    createServer();
    const call = (McpServer as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { name: string; version: string },
    ];
    expect(call[0].version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('startStdio', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('connects server to StdioServerTransport', async () => {
    const { createServer, startStdio } = await import('../src/server.js');
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const server = createServer();
    await startStdio(server as McpServer);
    expect(StdioServerTransport).toHaveBeenCalledOnce();
    expect(server.connect).toHaveBeenCalledOnce();
  });

  it('writes zero bytes to stdout during startStdio', async () => {
    const { createServer, startStdio } = await import('../src/server.js');
    const server = createServer();
    await startStdio(server as McpServer);
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('logs startup message via logger (not stdout)', async () => {
    const { createServer, startStdio } = await import('../src/server.js');
    const { logger } = await import('../src/logger.js');
    const server = createServer();
    await startStdio(server as McpServer);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('stdio') as string);
  });
});

describe('startHttp', () => {
  it('starts an HTTP server on the specified port and host', async () => {
    const { createServer, startHttp } = await import('../src/server.js');
    const server = createServer();
    const httpServer = await startHttp(server as McpServer, '127.0.0.1', 0);
    expect(httpServer).toBeDefined();
    const addr = httpServer.address();
    expect(addr).not.toBeNull();
    httpServer.close();
  });

  it('responds to POST /mcp endpoint', async () => {
    const { createServer, startHttp } = await import('../src/server.js');
    const server = createServer();
    const httpServer = await startHttp(server as McpServer, '127.0.0.1', 0);
    const addr = httpServer.address() as { port: number };
    const port = addr.port;

    const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Host: '127.0.0.1' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    });

    // MCP server should respond with a valid JSON-RPC response (2xx)
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    httpServer.close();
  });

  it('logs startup message with host and port via logger', async () => {
    const { createServer, startHttp } = await import('../src/server.js');
    const { logger } = await import('../src/logger.js');
    const server = createServer();
    const httpServer = await startHttp(server as McpServer, '127.0.0.1', 0);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('HTTP') as string);
    httpServer.close();
  });
});
