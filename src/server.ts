import type { Server } from 'node:http';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { logger } from './logger.js';

const SERVER_NAME = 'nuvemshop-mcp';
const SERVER_VERSION = '0.0.1';

export function createServer(): McpServer {
  return new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
}

export async function startStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Server started (stdio)');
}

export async function startHttp(server: McpServer, host: string, port: number): Promise<Server> {
  const app = express();
  app.use(express.json());

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);

  app.post('/mcp', async (req, res) => {
    await transport.handleRequest(req, res, req.body);
  });

  return new Promise((resolve) => {
    const httpServer = app.listen(port, host, () => {
      const addr = httpServer.address() as { port: number };
      logger.info(`Server started (HTTP) on ${host}:${addr.port}`);
      resolve(httpServer);
    });
  });
}
