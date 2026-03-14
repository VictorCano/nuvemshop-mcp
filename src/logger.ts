function writeLog(level: string, msg: string): void {
  const timestamp = new Date().toISOString();
  process.stderr.write(`[nuvemshop-mcp] [${level}] ${timestamp} ${msg}\n`);
}

export const logger = {
  info(msg: string): void {
    writeLog('INFO', msg);
  },
  warn(msg: string): void {
    writeLog('WARN', msg);
  },
  error(msg: string): void {
    writeLog('ERROR', msg);
  },
  debug(msg: string): void {
    writeLog('DEBUG', msg);
  },
};
