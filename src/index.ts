#!/usr/bin/env node
import { createServer, startHttp, startStdio } from './server.js';

const accessToken = process.env['USER_ACCESS_TOKEN'];
if (!accessToken) {
  process.stderr.write(
    '[nuvemshop-mcp] Missing required environment variable: USER_ACCESS_TOKEN\n  Set it with: export USER_ACCESS_TOKEN=your_value\n',
  );
  process.exit(1);
}

const storeId = process.env['STORE_ID'];
if (!storeId) {
  process.stderr.write(
    '[nuvemshop-mcp] Missing required environment variable: STORE_ID\n  Set it with: export STORE_ID=your_value\n',
  );
  process.exit(1);
}

const useHttp = process.argv.includes('--http');
const server = createServer();

if (useHttp) {
  const host = process.env['MCP_HTTP_HOST'] ?? '127.0.0.1';
  const port = Number(process.env['MCP_HTTP_PORT'] ?? 3000);
  await startHttp(server, host, port);
} else {
  await startStdio(server);
}
