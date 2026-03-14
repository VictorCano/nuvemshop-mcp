import { describe, expect, it, vi } from 'vitest';
import type { NuvemshopClient } from '../../src/client.js';
import { registerCouponTools } from '../../src/tools/coupons.js';

type ToolHandler = (
  args: Record<string, unknown>,
) => Promise<{ content: [{ type: 'text'; text: string }] }>;

function makeServer() {
  const calls: Array<[string, string, unknown, ToolHandler]> = [];
  const tool = vi.fn((name: string, description: string, schema: unknown, handler: ToolHandler) => {
    calls.push([name, description, schema, handler]);
  });
  return { tool, calls };
}

function makeClient(): NuvemshopClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    request: vi.fn(),
    list: vi.fn(),
  } as unknown as NuvemshopClient;
}

function getHandler(server: ReturnType<typeof makeServer>, name: string): ToolHandler {
  const call = server.calls.find(([n]) => n === name);
  if (!call) throw new Error(`Tool "${name}" not found`);
  return call[3];
}

describe('registerCouponTools', () => {
  it('registers exactly 2 tools', () => {
    const server = makeServer();
    const client = makeClient();
    registerCouponTools(server as never, client);
    expect(server.tool).toHaveBeenCalledTimes(2);
  });

  it('registers the expected tool names', () => {
    const server = makeServer();
    const client = makeClient();
    registerCouponTools(server as never, client);
    const names = server.calls.map(([name]) => name);
    expect(names).toContain('list_coupons');
    expect(names).toContain('create_coupon');
  });

  describe('list_coupons', () => {
    it('calls client.request with GET and query params, returns curated wrapPaginated result', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCouponTools(server as never, client);

      const rawCoupons = [
        {
          id: 1,
          code: 'SAVE10',
          type: 'percentage',
          value: '10.00',
          valid: true,
          used: 5,
          max_uses: 100,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          min_price: '50.00',
          extra_field: 'should_be_dropped',
        },
        {
          id: 2,
          code: 'FREE_SHIP',
          type: 'shipping',
          value: null,
          valid: true,
          used: 0,
          max_uses: null,
          start_date: null,
          end_date: null,
          min_price: null,
          extra_field: 'should_be_dropped',
        },
      ];
      vi.mocked(client.request).mockResolvedValueOnce(rawCoupons);

      const handler = getHandler(server, 'list_coupons');
      const result = await handler({ page: 1, per_page: 20 });

      expect(client.request).toHaveBeenCalledWith('GET', expect.stringContaining('/coupons'));
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.pagination.page).toBe(1);
      expect(parsed.pagination.per_page).toBe(20);
      expect(parsed.results).toHaveLength(2);

      // Curated fields
      expect(parsed.results[0]).toMatchObject({
        id: 1,
        code: 'SAVE10',
        type: 'percentage',
        value: '10.00',
        valid: true,
        used: 5,
        max_uses: 100,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        min_price: '50.00',
      });

      // extra_field should NOT be in curated response
      expect(parsed.results[0].extra_field).toBeUndefined();
    });

    it('passes q filter via query string', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCouponTools(server as never, client);

      vi.mocked(client.request).mockResolvedValueOnce([]);

      const handler = getHandler(server, 'list_coupons');
      await handler({ page: 1, per_page: 20, q: 'SAVE' });

      const [, path] = vi.mocked(client.request).mock.calls[0] as [string, string];
      expect(path).toContain('q=SAVE');
    });

    it('passes status filter via query string', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCouponTools(server as never, client);

      vi.mocked(client.request).mockResolvedValueOnce([]);

      const handler = getHandler(server, 'list_coupons');
      await handler({ page: 1, per_page: 20, status: 'valid' });

      const [, path] = vi.mocked(client.request).mock.calls[0] as [string, string];
      expect(path).toContain('status=valid');
    });

    it('passes discount_type filter via query string', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCouponTools(server as never, client);

      vi.mocked(client.request).mockResolvedValueOnce([]);

      const handler = getHandler(server, 'list_coupons');
      await handler({ page: 1, per_page: 20, discount_type: 'percentage' });

      const [, path] = vi.mocked(client.request).mock.calls[0] as [string, string];
      expect(path).toContain('discount_type=percentage');
    });
  });

  describe('create_coupon', () => {
    it('returns error response (not exception) when type is percentage and value is undefined', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCouponTools(server as never, client);

      const handler = getHandler(server, 'create_coupon');
      const result = await handler({ code: 'SAVE10', type: 'percentage' });

      // Should NOT call client.post
      expect(client.post).not.toHaveBeenCalled();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBeDefined();
      expect(parsed.hint).toBeDefined();
    });

    it('returns error response (not exception) when type is absolute and value is undefined', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCouponTools(server as never, client);

      const handler = getHandler(server, 'create_coupon');
      const result = await handler({ code: 'FLAT20', type: 'absolute' });

      expect(client.post).not.toHaveBeenCalled();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBeDefined();
      expect(parsed.hint).toBeDefined();
    });

    it('calls client.post successfully when type is shipping and value is omitted', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCouponTools(server as never, client);

      const createdCoupon = { id: 10, code: 'FREESHIP', type: 'shipping', value: null };
      vi.mocked(client.post).mockResolvedValueOnce(createdCoupon);

      const handler = getHandler(server, 'create_coupon');
      const result = await handler({ code: 'FREESHIP', type: 'shipping' });

      expect(client.post).toHaveBeenCalledWith(
        '/coupons',
        expect.objectContaining({ code: 'FREESHIP', type: 'shipping' }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(createdCoupon);
    });

    it('calls client.post with correct body for percentage type with value', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCouponTools(server as never, client);

      const createdCoupon = { id: 11, code: 'SAVE10', type: 'percentage', value: '10.00' };
      vi.mocked(client.post).mockResolvedValueOnce(createdCoupon);

      const handler = getHandler(server, 'create_coupon');
      const result = await handler({ code: 'SAVE10', type: 'percentage', value: 10 });

      expect(client.post).toHaveBeenCalledWith(
        '/coupons',
        expect.objectContaining({
          code: 'SAVE10',
          type: 'percentage',
          value: 10,
        }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(createdCoupon);
    });

    it('only includes defined fields in the POST body', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCouponTools(server as never, client);

      const createdCoupon = { id: 12, code: 'FLAT5', type: 'absolute', value: '5.00' };
      vi.mocked(client.post).mockResolvedValueOnce(createdCoupon);

      const handler = getHandler(server, 'create_coupon');
      await handler({ code: 'FLAT5', type: 'absolute', value: 5 });

      const [, body] = vi.mocked(client.post).mock.calls[0] as [string, Record<string, unknown>];
      // Undefined optional fields should NOT be present in body
      expect(body.start_date).toBeUndefined();
      expect(body.end_date).toBeUndefined();
      expect(body.min_price).toBeUndefined();
      expect(body.max_uses).toBeUndefined();
    });
  });
});
