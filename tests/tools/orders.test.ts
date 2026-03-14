import { describe, expect, it, vi } from 'vitest';
import type { NuvemshopClient } from '../../src/client.js';
import { registerOrderTools } from '../../src/tools/orders.js';

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

describe('registerOrderTools', () => {
  it('registers exactly 5 tools', () => {
    const server = makeServer();
    const client = makeClient();
    registerOrderTools(server as never, client);
    expect(server.tool).toHaveBeenCalledTimes(5);
  });

  it('registers the expected tool names', () => {
    const server = makeServer();
    const client = makeClient();
    registerOrderTools(server as never, client);
    const names = server.calls.map(([name]) => name);
    expect(names).toContain('list_orders');
    expect(names).toContain('get_order');
    expect(names).toContain('close_order');
    expect(names).toContain('reopen_order');
    expect(names).toContain('cancel_order');
  });

  describe('list_orders', () => {
    it('calls client.request with GET and query params, returns curated wrapPaginated result', async () => {
      const server = makeServer();
      const client = makeClient();
      registerOrderTools(server as never, client);

      const rawOrders = [
        {
          id: 1001,
          number: 1,
          status: 'open',
          payment_status: 'paid',
          shipping_status: 'unshipped',
          total: '150.00',
          currency: 'BRL',
          customer: { id: 50, name: 'Alice Silva', email: 'alice@example.com' },
          created_at: '2024-01-01T00:00:00Z',
          extra_field: 'should_be_dropped',
        },
        {
          id: 1002,
          number: 2,
          status: 'closed',
          payment_status: 'paid',
          shipping_status: 'delivered',
          total: '300.00',
          currency: 'BRL',
          customer: { id: 51, name: 'Bob Santos', email: 'bob@example.com' },
          created_at: '2024-01-02T00:00:00Z',
          extra_field: 'should_be_dropped',
        },
      ];
      vi.mocked(client.request).mockResolvedValueOnce(rawOrders);

      const handler = getHandler(server, 'list_orders');
      const result = await handler({ page: 1, per_page: 20 });

      expect(client.request).toHaveBeenCalledWith('GET', expect.stringContaining('/orders'));
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.pagination.page).toBe(1);
      expect(parsed.pagination.per_page).toBe(20);
      expect(parsed.results).toHaveLength(2);

      // Curated fields
      expect(parsed.results[0]).toMatchObject({
        id: 1001,
        number: 1,
        status: 'open',
        payment_status: 'paid',
        shipping_status: 'unshipped',
        total: '150.00',
        currency: 'BRL',
        created_at: '2024-01-01T00:00:00Z',
      });
      expect(parsed.results[0].customer).toMatchObject({ id: 50, name: 'Alice Silva' });

      // extra_field should NOT be in curated response
      expect(parsed.results[0].extra_field).toBeUndefined();
    });

    it('passes status filter via query string', async () => {
      const server = makeServer();
      const client = makeClient();
      registerOrderTools(server as never, client);

      vi.mocked(client.request).mockResolvedValueOnce([]);

      const handler = getHandler(server, 'list_orders');
      await handler({ page: 1, per_page: 20, status: 'open' });

      const [, path] = vi.mocked(client.request).mock.calls[0] as [string, string];
      expect(path).toContain('status=open');
    });

    it('passes payment_status filter via query string', async () => {
      const server = makeServer();
      const client = makeClient();
      registerOrderTools(server as never, client);

      vi.mocked(client.request).mockResolvedValueOnce([]);

      const handler = getHandler(server, 'list_orders');
      await handler({ page: 1, per_page: 20, payment_status: 'paid' });

      const [, path] = vi.mocked(client.request).mock.calls[0] as [string, string];
      expect(path).toContain('payment_status=paid');
    });

    it('passes shipping_status filter via query string', async () => {
      const server = makeServer();
      const client = makeClient();
      registerOrderTools(server as never, client);

      vi.mocked(client.request).mockResolvedValueOnce([]);

      const handler = getHandler(server, 'list_orders');
      await handler({ page: 1, per_page: 20, shipping_status: 'shipped' });

      const [, path] = vi.mocked(client.request).mock.calls[0] as [string, string];
      expect(path).toContain('shipping_status=shipped');
    });

    it('passes customer_id filter via query string', async () => {
      const server = makeServer();
      const client = makeClient();
      registerOrderTools(server as never, client);

      vi.mocked(client.request).mockResolvedValueOnce([]);

      const handler = getHandler(server, 'list_orders');
      await handler({ page: 1, per_page: 20, customer_id: 42 });

      const [, path] = vi.mocked(client.request).mock.calls[0] as [string, string];
      expect(path).toContain('customer_id=42');
    });

    it('passes date range filters via query string', async () => {
      const server = makeServer();
      const client = makeClient();
      registerOrderTools(server as never, client);

      vi.mocked(client.request).mockResolvedValueOnce([]);

      const handler = getHandler(server, 'list_orders');
      await handler({
        page: 1,
        per_page: 20,
        created_at_min: '2024-01-01T00:00:00Z',
        created_at_max: '2024-01-31T23:59:59Z',
      });

      const [, path] = vi.mocked(client.request).mock.calls[0] as [string, string];
      expect(path).toContain('created_at_min=');
      expect(path).toContain('created_at_max=');
    });
  });

  describe('get_order', () => {
    it('calls client.get with /orders/{id} and returns full response', async () => {
      const server = makeServer();
      const client = makeClient();
      registerOrderTools(server as never, client);

      const orderData = {
        id: 1001,
        number: 1,
        status: 'open',
        payment_status: 'paid',
        shipping_status: 'unshipped',
        total: '150.00',
        currency: 'BRL',
        customer: { id: 50, name: 'Alice Silva' },
        line_items: [{ id: 1, name: 'Product A', quantity: 2, price: '75.00' }],
      };
      vi.mocked(client.get).mockResolvedValueOnce(orderData);

      const handler = getHandler(server, 'get_order');
      const result = await handler({ id: 1001 });

      expect(client.get).toHaveBeenCalledWith('/orders/1001');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(orderData);
    });
  });

  describe('close_order', () => {
    it('calls client.post with /orders/{id}/close and empty body, returns result', async () => {
      const server = makeServer();
      const client = makeClient();
      registerOrderTools(server as never, client);

      const closedOrder = { id: 1001, status: 'closed' };
      vi.mocked(client.post).mockResolvedValueOnce(closedOrder);

      const handler = getHandler(server, 'close_order');
      const result = await handler({ id: 1001 });

      expect(client.post).toHaveBeenCalledWith('/orders/1001/close', {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(closedOrder);
    });
  });

  describe('reopen_order', () => {
    it('calls client.post with /orders/{id}/open and empty body, returns result', async () => {
      const server = makeServer();
      const client = makeClient();
      registerOrderTools(server as never, client);

      const reopenedOrder = { id: 1001, status: 'open' };
      vi.mocked(client.post).mockResolvedValueOnce(reopenedOrder);

      const handler = getHandler(server, 'reopen_order');
      const result = await handler({ id: 1001 });

      expect(client.post).toHaveBeenCalledWith('/orders/1001/open', {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(reopenedOrder);
    });
  });

  describe('cancel_order', () => {
    it('returns warning with order details when confirm is not set', async () => {
      const server = makeServer();
      const client = makeClient();
      registerOrderTools(server as never, client);

      const order = {
        id: 1001,
        number: 42,
        status: 'open',
        payment_status: 'paid',
        total: '150.00',
        currency: 'BRL',
      };
      vi.mocked(client.get).mockResolvedValueOnce(order);

      const handler = getHandler(server, 'cancel_order');
      const result = await handler({ id: 1001 });

      expect(client.get).toHaveBeenCalledWith('/orders/1001');
      expect(client.post).not.toHaveBeenCalled();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.confirm_required).toBe(true);
      expect(parsed.warning).toBeDefined();
      expect(parsed.order).toBeDefined();
      expect(parsed.order.number).toBe(42);
      expect(parsed.order.status).toBe('open');
    });

    it('returns warning when confirm is explicitly false', async () => {
      const server = makeServer();
      const client = makeClient();
      registerOrderTools(server as never, client);

      const order = {
        id: 1001,
        number: 42,
        status: 'open',
        payment_status: 'paid',
        total: '150.00',
        currency: 'BRL',
      };
      vi.mocked(client.get).mockResolvedValueOnce(order);

      const handler = getHandler(server, 'cancel_order');
      const result = await handler({ id: 1001, confirm: false });

      expect(client.post).not.toHaveBeenCalled();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.confirm_required).toBe(true);
    });

    it('calls POST /orders/{id}/cancel with restock, notify_customer, reason when confirm is true', async () => {
      const server = makeServer();
      const client = makeClient();
      registerOrderTools(server as never, client);

      const cancelledOrder = { id: 1001, status: 'cancelled' };
      vi.mocked(client.post).mockResolvedValueOnce(cancelledOrder);

      const handler = getHandler(server, 'cancel_order');
      const result = await handler({
        id: 1001,
        confirm: true,
        restock: true,
        notify_customer: true,
        reason: 'Customer request',
      });

      expect(client.post).toHaveBeenCalledWith('/orders/1001/cancel', {
        restock: true,
        notify_customer: true,
        reason: 'Customer request',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(cancelledOrder);
    });

    it('uses default values for restock and notify_customer when confirm is true', async () => {
      const server = makeServer();
      const client = makeClient();
      registerOrderTools(server as never, client);

      const cancelledOrder = { id: 1001, status: 'cancelled' };
      vi.mocked(client.post).mockResolvedValueOnce(cancelledOrder);

      const handler = getHandler(server, 'cancel_order');
      await handler({ id: 1001, confirm: true });

      expect(client.post).toHaveBeenCalledWith('/orders/1001/cancel', {
        restock: false,
        notify_customer: false,
        reason: undefined,
      });
    });
  });
});
