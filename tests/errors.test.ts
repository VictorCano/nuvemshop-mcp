import { describe, it, expect } from 'vitest';
import { normalizeError } from '../src/errors.js';

function makeMockResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('normalizeError', () => {
  it('maps 401 to UNAUTHORIZED with token check hint', async () => {
    const result = await normalizeError(makeMockResponse(401), 'products');

    expect(result.isError).toBe(true);
    expect(result.code).toBe('UNAUTHORIZED');
    expect(result.resource).toBe('products');
    expect(result.retryHint).toContain('USER_ACCESS_TOKEN');
  });

  it('maps 404 to NOT_FOUND with ID verification hint', async () => {
    const result = await normalizeError(makeMockResponse(404), 'orders/123');

    expect(result.isError).toBe(true);
    expect(result.code).toBe('NOT_FOUND');
    expect(result.resource).toBe('orders/123');
    expect(result.retryHint).toContain('ID');
  });

  it('maps 429 to RATE_LIMITED with retry hint', async () => {
    const result = await normalizeError(makeMockResponse(429), 'products');

    expect(result.isError).toBe(true);
    expect(result.code).toBe('RATE_LIMITED');
    expect(result.resource).toBe('products');
    expect(result.retryHint).toContain('try again');
  });

  it('maps 500 to SERVER_ERROR with retry hint', async () => {
    const result = await normalizeError(makeMockResponse(500), 'products');

    expect(result.isError).toBe(true);
    expect(result.code).toBe('SERVER_ERROR');
    expect(result.resource).toBe('products');
    expect(result.retryHint).toContain('shortly');
  });

  it('maps 422 to VALIDATION_ERROR', async () => {
    const result = await normalizeError(makeMockResponse(422), 'products');

    expect(result.isError).toBe(true);
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.resource).toBe('products');
  });

  it('maps 502 to SERVER_ERROR', async () => {
    const result = await normalizeError(makeMockResponse(502), 'products');

    expect(result.isError).toBe(true);
    expect(result.code).toBe('SERVER_ERROR');
  });

  it('maps 503 to SERVER_ERROR', async () => {
    const result = await normalizeError(makeMockResponse(503), 'products');

    expect(result.isError).toBe(true);
    expect(result.code).toBe('SERVER_ERROR');
  });

  it('maps 504 to SERVER_ERROR', async () => {
    const result = await normalizeError(makeMockResponse(504), 'products');

    expect(result.isError).toBe(true);
    expect(result.code).toBe('SERVER_ERROR');
  });

  it('maps unknown status to API_ERROR', async () => {
    const result = await normalizeError(makeMockResponse(418), 'products');

    expect(result.isError).toBe(true);
    expect(result.code).toBe('API_ERROR');
  });

  it('includes JSON body detail when parseable', async () => {
    const res = makeMockResponse(422, { description: { name: ['is required'] } });
    const result = await normalizeError(res, 'products');

    expect(result.detail).toBeTruthy();
  });

  it('all errors have message field', async () => {
    const result = await normalizeError(makeMockResponse(500), 'products');

    expect(typeof result.message).toBe('string');
    expect(result.message.length).toBeGreaterThan(0);
  });
});
