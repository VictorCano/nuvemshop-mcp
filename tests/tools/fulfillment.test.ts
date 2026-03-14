import { describe, expect, it, vi } from 'vitest';
import type { NuvemshopClient } from '../../src/client.js';
import { registerFulfillmentTools } from '../../src/tools/fulfillment.js';

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
    requestList: vi.fn(),
    list: vi.fn(),
  } as unknown as NuvemshopClient;
}

function getHandler(server: ReturnType<typeof makeServer>, name: string): ToolHandler {
  const call = server.calls.find(([n]) => n === name);
  if (!call) throw new Error(`Tool "${name}" not found`);
  return call[3];
}

describe('registerFulfillmentTools', () => {
  it('registers exactly 4 tools', () => {
    const server = makeServer();
    const client = makeClient();
    registerFulfillmentTools(server as never, client);
    expect(server.tool).toHaveBeenCalledTimes(4);
  });

  it('registers the expected tool names', () => {
    const server = makeServer();
    const client = makeClient();
    registerFulfillmentTools(server as never, client);
    const names = server.calls.map(([name]) => name);
    expect(names).toContain('list_fulfillment_orders');
    expect(names).toContain('get_fulfillment_order');
    expect(names).toContain('update_fulfillment_order');
    expect(names).toContain('add_tracking_event');
  });

  describe('list_fulfillment_orders', () => {
    it('calls client.get with correct path and returns list', async () => {
      const server = makeServer();
      const client = makeClient();
      registerFulfillmentTools(server as never, client);

      const fulfillmentOrders = [
        { id: 1, status: 'UNPACKED', order_id: 42 },
        { id: 2, status: 'PACKED', order_id: 42 },
      ];
      vi.mocked(client.get).mockResolvedValueOnce(fulfillmentOrders);

      const handler = getHandler(server, 'list_fulfillment_orders');
      const result = await handler({ order_id: 42 });

      expect(client.get).toHaveBeenCalledWith('/orders/42/fulfillment-orders');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fulfillmentOrders);
    });
  });

  describe('get_fulfillment_order', () => {
    it('calls client.get with correct path and returns full response', async () => {
      const server = makeServer();
      const client = makeClient();
      registerFulfillmentTools(server as never, client);

      const fulfillmentOrder = {
        id: 5,
        order_id: 42,
        status: 'DISPATCHED',
        tracking_events: [],
      };
      vi.mocked(client.get).mockResolvedValueOnce(fulfillmentOrder);

      const handler = getHandler(server, 'get_fulfillment_order');
      const result = await handler({ order_id: 42, fulfillment_order_id: 5 });

      expect(client.get).toHaveBeenCalledWith('/orders/42/fulfillment-orders/5');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(fulfillmentOrder);
    });
  });

  describe('update_fulfillment_order', () => {
    it('calls client.request with PATCH, correct path, and status body', async () => {
      const server = makeServer();
      const client = makeClient();
      registerFulfillmentTools(server as never, client);

      const updated = { id: 5, order_id: 42, status: 'PACKED' };
      vi.mocked(client.request).mockResolvedValueOnce(updated);

      const handler = getHandler(server, 'update_fulfillment_order');
      const result = await handler({ order_id: 42, fulfillment_order_id: 5, status: 'PACKED' });

      expect(client.request).toHaveBeenCalledWith('PATCH', '/orders/42/fulfillment-orders/5', {
        status: 'PACKED',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(updated);
    });

    it('only accepts valid status enum values', async () => {
      const server = makeServer();
      const client = makeClient();
      registerFulfillmentTools(server as never, client);
      const names = server.calls.map(([name]) => name);
      expect(names).toContain('update_fulfillment_order');
    });
  });

  describe('add_tracking_event', () => {
    it('calls client.post with correct path and tracking event body', async () => {
      const server = makeServer();
      const client = makeClient();
      registerFulfillmentTools(server as never, client);

      const createdEvent = {
        id: 10,
        status: 'in_transit',
        description: 'Package picked up',
        city: 'Sao Paulo',
        province: 'SP',
        country: 'BR',
        happened_at: '2024-01-15T10:00:00Z',
      };
      vi.mocked(client.post).mockResolvedValueOnce(createdEvent);

      const handler = getHandler(server, 'add_tracking_event');
      const result = await handler({
        order_id: 42,
        fulfillment_order_id: 5,
        status: 'in_transit',
        description: 'Package picked up',
        city: 'Sao Paulo',
        province: 'SP',
        country: 'BR',
        happened_at: '2024-01-15T10:00:00Z',
      });

      expect(client.post).toHaveBeenCalledWith(
        '/orders/42/fulfillment-orders/5/tracking-events',
        expect.objectContaining({
          status: 'in_transit',
          description: 'Package picked up',
          city: 'Sao Paulo',
          province: 'SP',
          country: 'BR',
          happened_at: '2024-01-15T10:00:00Z',
        }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(createdEvent);
    });

    it('sends only status when optional fields are omitted', async () => {
      const server = makeServer();
      const client = makeClient();
      registerFulfillmentTools(server as never, client);

      vi.mocked(client.post).mockResolvedValueOnce({ id: 11, status: 'delivered' });

      const handler = getHandler(server, 'add_tracking_event');
      await handler({ order_id: 42, fulfillment_order_id: 5, status: 'delivered' });

      const [, body] = vi.mocked(client.post).mock.calls[0] as [string, Record<string, unknown>];
      expect(body).toEqual({ status: 'delivered' });
    });
  });
});
