import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the server module
vi.mock('../src/server.js', () => ({
  createServer: vi.fn().mockReturnValue({ name: 'nuvemshop-mcp', tool: vi.fn() }),
  startStdio: vi.fn().mockResolvedValue(undefined),
  startHttp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the store-categories tools so they don't call real methods on the mock server
vi.mock('../src/tools/store-categories.js', () => ({
  registerStoreCategoryTools: vi.fn(),
}));

function runIndex(env: Record<string, string | undefined>, args: string[] = []): Promise<void> {
  // Set up env and args
  const savedEnv: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(env)) {
    savedEnv[k] = process.env[k];
    if (v === undefined) {
      Reflect.deleteProperty(process.env, k);
    } else {
      process.env[k] = v;
    }
  }
  const savedArgv = process.argv;
  process.argv = ['node', 'index.js', ...args];

  // Re-import the module fresh
  return import('../src/index.js').finally(() => {
    // Restore env
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) {
        Reflect.deleteProperty(process.env, k);
      } else {
        process.env[k] = v;
      }
    }
    process.argv = savedArgv;
  });
}

describe('index.ts env-var guards', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((_code) => {
      throw new Error(`process.exit(${String(_code)})`);
    });
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    // Clear module cache so index.ts re-runs
    vi.resetModules();
  });

  afterEach(() => {
    exitSpy.mockRestore();
    stderrSpy.mockRestore();
    vi.resetModules();
  });

  it('exits with code 1 and stderr message when USER_ACCESS_TOKEN is missing', async () => {
    await expect(runIndex({ USER_ACCESS_TOKEN: undefined, STORE_ID: '123' })).rejects.toThrow(
      'process.exit(1)',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrOutput).toContain('USER_ACCESS_TOKEN');
  });

  it('exits with code 1 and stderr message when STORE_ID is missing', async () => {
    await expect(runIndex({ USER_ACCESS_TOKEN: 'token', STORE_ID: undefined })).rejects.toThrow(
      'process.exit(1)',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrOutput).toContain('STORE_ID');
  });
});

describe('index.ts transport routing', () => {
  beforeEach(() => {
    vi.resetModules();
    // Mock process.exit so guards don't crash the test
    vi.spyOn(process, 'exit').mockImplementation((_code) => {
      throw new Error(`process.exit(${String(_code)})`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('calls startStdio when --http flag is not present', async () => {
    const savedArgv = process.argv;
    process.argv = ['node', 'index.js'];
    process.env['USER_ACCESS_TOKEN'] = 'test-token';
    process.env['STORE_ID'] = '123';

    try {
      await import('../src/index.js');
      const { startStdio, startHttp } = await import('../src/server.js');
      expect(startStdio).toHaveBeenCalledOnce();
      expect(startHttp).not.toHaveBeenCalled();
    } finally {
      process.argv = savedArgv;
      delete process.env['USER_ACCESS_TOKEN'];
      delete process.env['STORE_ID'];
    }
  });

  it('calls startHttp when --http flag is present', async () => {
    vi.resetModules();
    const savedArgv = process.argv;
    process.argv = ['node', 'index.js', '--http'];
    process.env['USER_ACCESS_TOKEN'] = 'test-token';
    process.env['STORE_ID'] = '123';

    try {
      await import('../src/index.js');
      const { startStdio, startHttp } = await import('../src/server.js');
      expect(startHttp).toHaveBeenCalledOnce();
      expect(startStdio).not.toHaveBeenCalled();
    } finally {
      process.argv = savedArgv;
      delete process.env['USER_ACCESS_TOKEN'];
      delete process.env['STORE_ID'];
    }
  });
});
