import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NuvemshopClientConfig } from '../src/types.js';

// We import the client only after we set up our module — import is done inline inside tests
// to ensure vi.mock hoisting works correctly.

const makeConfig = (): NuvemshopClientConfig => ({
  accessToken: 'test-token-abc',
  storeId: '12345',
});

// Helper: build a minimal Response-like object
function makeResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Response {
  const headersMap = new Headers(headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `Status ${status}`,
    headers: headersMap,
    json: async () => body,
    text: async () => JSON.stringify(body),
    clone: function () {
      return this;
    },
  } as unknown as Response;
}

describe('NuvemshopClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ------------------------------------------------------------------ imports
  it('can be imported without errors', async () => {
    const mod = await import('../src/client.js');
    expect(mod.NuvemshopClient).toBeDefined();
  });

  // ------------------------------------------------------------------ constructor
  it('stores config values', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    const client = new NuvemshopClient(makeConfig());
    expect(client).toBeInstanceOf(NuvemshopClient);
  });

  // ------------------------------------------------------------------ URL format
  it('sends request to correct URL: https://api.nuvemshop.com.br/2025-03/{storeId}{path}', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(200, { id: 1 }));
    const client = new NuvemshopClient(makeConfig());
    await client.get('/products');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.nuvemshop.com.br/2025-03/12345/products');
  });

  // ------------------------------------------------------------------ Authentication header
  it('sends "Authentication: bearer {token}" header (not Authorization)', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = new NuvemshopClient(makeConfig());
    await client.get('/products');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authentication']).toBe('bearer test-token-abc');
    expect(headers['Authorization']).toBeUndefined();
  });

  // ------------------------------------------------------------------ User-Agent header
  it('sends User-Agent header on every request', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = new NuvemshopClient(makeConfig());
    await client.get('/products');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['User-Agent']).toBe(
      'nuvemshop-mcp (https://github.com/VictorCano/nuvemshop-mcp)',
    );
  });

  // ------------------------------------------------------------------ Content-Type for POST/PUT
  it('sends Content-Type header for POST requests', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(201, { id: 2 }));
    const client = new NuvemshopClient(makeConfig());
    await client.post('/products', { name: 'Widget' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json; charset=utf-8');
  });

  it('sends Content-Type header for PUT requests', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(200, { id: 2 }));
    const client = new NuvemshopClient(makeConfig());
    await client.put('/products/2', { name: 'Widget v2' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json; charset=utf-8');
  });

  // ------------------------------------------------------------------ successful response
  it('returns parsed JSON on 2xx', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    const payload = { id: 42, name: 'T-shirt' };
    fetchMock.mockResolvedValueOnce(makeResponse(200, payload));
    const client = new NuvemshopClient(makeConfig());
    const result = await client.get<typeof payload>('/products/42');
    expect(result).toEqual(payload);
  });

  // ------------------------------------------------------------------ 401 error (non-retryable)
  it('throws NuvemshopMcpError with code UNAUTHORIZED on 401', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(401, { error: 'Unauthorized' }));
    const client = new NuvemshopClient(makeConfig());
    const result = await client.get('/products').catch((e: unknown) => e);
    expect(result).toMatchObject({
      isError: true,
      code: 'UNAUTHORIZED',
    });
    // Should not retry — fetch called exactly once
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  // ------------------------------------------------------------------ 429 retry (all methods)
  it('retries 429 up to 3 times then throws NuvemshopMcpError', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    // Return 429 four times (initial + 3 retries)
    fetchMock
      .mockResolvedValueOnce(makeResponse(429, { error: 'Rate limit' }))
      .mockResolvedValueOnce(makeResponse(429, { error: 'Rate limit' }))
      .mockResolvedValueOnce(makeResponse(429, { error: 'Rate limit' }))
      .mockResolvedValueOnce(makeResponse(429, { error: 'Rate limit' }));

    const client = new NuvemshopClient(makeConfig());
    // Attach .catch() before advancing timers to avoid unhandled rejection warnings
    const resultPromise = client.get('/products').catch((e: unknown) => e);

    // Advance through all retry delays: 1000 + 2000 + 4000 = 7000ms
    await vi.advanceTimersByTimeAsync(10_000);

    const result = await resultPromise;
    expect(result).toMatchObject({ isError: true, code: 'RATE_LIMITED' });
    expect(fetchMock).toHaveBeenCalledTimes(4); // initial + 3 retries
  });

  it('retries 429 on POST (all methods retry on 429)', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock
      .mockResolvedValueOnce(makeResponse(429, { error: 'Rate limit' }))
      .mockResolvedValueOnce(makeResponse(429, { error: 'Rate limit' }))
      .mockResolvedValueOnce(makeResponse(429, { error: 'Rate limit' }))
      .mockResolvedValueOnce(makeResponse(429, { error: 'Rate limit' }));

    const client = new NuvemshopClient(makeConfig());
    // Attach .catch() before advancing timers to avoid unhandled rejection warnings
    const resultPromise = client.post('/products', {}).catch((e: unknown) => e);

    await vi.advanceTimersByTimeAsync(10_000);

    const result = await resultPromise;
    expect(result).toMatchObject({ isError: true, code: 'RATE_LIMITED' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  // ------------------------------------------------------------------ Retry-After header
  it('uses Retry-After header value (seconds) when present on 429', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    // First call: 429 with Retry-After: 5 (5 seconds)
    // Second call: 200 success
    fetchMock
      .mockResolvedValueOnce(makeResponse(429, { error: 'Rate limit' }, { 'Retry-After': '5' }))
      .mockResolvedValueOnce(makeResponse(200, { id: 1 }));

    const client = new NuvemshopClient(makeConfig());
    const promise = client.get('/products');

    // Advance past the Retry-After delay (5000ms)
    await vi.advanceTimersByTimeAsync(6_000);

    const result = await promise;
    expect(result).toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // ------------------------------------------------------------------ 5xx retry: GET only
  it('retries 500 on GET, succeeds on second attempt', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock
      .mockResolvedValueOnce(makeResponse(500, { error: 'Server error' }))
      .mockResolvedValueOnce(makeResponse(200, { id: 1 }));

    const client = new NuvemshopClient(makeConfig());
    const promise = client.get('/products');

    await vi.advanceTimersByTimeAsync(2_000);

    const result = await promise;
    expect(result).toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry 500 on POST — surfaces error immediately', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(500, { error: 'Server error' }));

    const client = new NuvemshopClient(makeConfig());
    const result = await client.post('/products', {}).catch((e: unknown) => e);

    expect(result).toMatchObject({ isError: true, code: 'SERVER_ERROR' });
    expect(fetchMock).toHaveBeenCalledOnce(); // no retries
  });

  it('does NOT retry 503 on PUT', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(503, { error: 'Unavailable' }));

    const client = new NuvemshopClient(makeConfig());
    const result = await client.put('/products/1', {}).catch((e: unknown) => e);

    expect(result).toMatchObject({ isError: true, code: 'SERVER_ERROR' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('does NOT retry 502 on DELETE', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(502, { error: 'Bad gateway' }));

    const client = new NuvemshopClient(makeConfig());
    const result = await client.del('/products/1').catch((e: unknown) => e);

    expect(result).toMatchObject({ isError: true, code: 'SERVER_ERROR' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  // ------------------------------------------------------------------ list() pagination
  it('list() adds default page=1&per_page=20 query params', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(200, []));
    const client = new NuvemshopClient(makeConfig());
    await client.list('/products');
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('page=1');
    expect(url).toContain('per_page=20');
  });

  it('list() with custom params uses provided values', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(200, []));
    const client = new NuvemshopClient(makeConfig());
    await client.list('/products', { page: 3, per_page: 50 });
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('page=3');
    expect(url).toContain('per_page=50');
  });

  // ------------------------------------------------------------------ timeout
  it('uses AbortSignal.timeout(30000) for 30s timeout', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = new NuvemshopClient(makeConfig());
    await client.get('/products');
    expect(timeoutSpy).toHaveBeenCalledWith(30_000);
  });

  // ------------------------------------------------------------------ convenience shorthands
  it('get() calls request with GET method', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(200, { id: 1 }));
    const client = new NuvemshopClient(makeConfig());
    await client.get('/products/1');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('GET');
  });

  it('post() calls request with POST method and serialized body', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(201, { id: 99 }));
    const client = new NuvemshopClient(makeConfig());
    await client.post('/products', { name: 'Widget' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'Widget' }));
  });

  it('put() calls request with PUT method', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(200, { id: 1 }));
    const client = new NuvemshopClient(makeConfig());
    await client.put('/products/1', { name: 'Updated' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('PUT');
  });

  it('del() calls request with DELETE method', async () => {
    const { NuvemshopClient } = await import('../src/client.js');
    fetchMock.mockResolvedValueOnce(makeResponse(200, {}));
    const client = new NuvemshopClient(makeConfig());
    await client.del('/products/1');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('DELETE');
  });
});
