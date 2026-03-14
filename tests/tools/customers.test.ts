import { describe, expect, it, vi } from 'vitest';
import type { NuvemshopClient } from '../../src/client.js';
import { registerCustomerTools } from '../../src/tools/customers.js';

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

describe('registerCustomerTools', () => {
  it('registers exactly 5 tools', () => {
    const server = makeServer();
    const client = makeClient();
    registerCustomerTools(server as never, client);
    expect(server.tool).toHaveBeenCalledTimes(5);
  });

  it('registers the expected tool names', () => {
    const server = makeServer();
    const client = makeClient();
    registerCustomerTools(server as never, client);
    const names = server.calls.map(([name]) => name);
    expect(names).toContain('list_customers');
    expect(names).toContain('get_customer');
    expect(names).toContain('create_customer');
    expect(names).toContain('update_customer');
    expect(names).toContain('delete_customer');
  });

  describe('list_customers', () => {
    it('calls client.request with GET and query params, returns curated wrapPaginated result', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      const rawCustomers = [
        {
          id: 101,
          name: 'Alice Silva',
          email: 'alice@example.com',
          phone: '+5511999990001',
          total_spent: '500.00',
          total_spent_currency: 'BRL',
          last_order_id: 9001,
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          extra_field: 'should_be_dropped',
          billing_address: { street: 'Rua A' },
        },
        {
          id: 102,
          name: 'Bob Santos',
          email: 'bob@example.com',
          phone: null,
          total_spent: '0.00',
          total_spent_currency: 'BRL',
          last_order_id: null,
          active: false,
          created_at: '2024-02-01T00:00:00Z',
          extra_field: 'should_be_dropped',
        },
      ];
      vi.mocked(client.request).mockResolvedValueOnce(rawCustomers);

      const handler = getHandler(server, 'list_customers');
      const result = await handler({ page: 1, per_page: 20 });

      expect(client.request).toHaveBeenCalledWith('GET', expect.stringContaining('/customers'));
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.pagination.page).toBe(1);
      expect(parsed.pagination.per_page).toBe(20);
      expect(parsed.results).toHaveLength(2);

      // Curated fields present
      expect(parsed.results[0]).toMatchObject({
        id: 101,
        name: 'Alice Silva',
        email: 'alice@example.com',
        phone: '+5511999990001',
        total_spent: '500.00',
        total_spent_currency: 'BRL',
        last_order_id: 9001,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
      });

      // Extra fields should NOT be in curated response
      expect(parsed.results[0].extra_field).toBeUndefined();
      expect(parsed.results[0].billing_address).toBeUndefined();

      // Nullable fields should be null when absent
      expect(parsed.results[1].phone).toBeNull();
      expect(parsed.results[1].last_order_id).toBeNull();
    });

    it('passes q filter via query string', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      vi.mocked(client.request).mockResolvedValueOnce([]);

      const handler = getHandler(server, 'list_customers');
      await handler({ page: 1, per_page: 20, q: 'alice' });

      const [, path] = vi.mocked(client.request).mock.calls[0] as [string, string];
      expect(path).toContain('q=alice');
    });

    it('passes email filter via query string', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      vi.mocked(client.request).mockResolvedValueOnce([]);

      const handler = getHandler(server, 'list_customers');
      await handler({ page: 1, per_page: 20, email: 'alice@example.com' });

      const [, path] = vi.mocked(client.request).mock.calls[0] as [string, string];
      expect(path).toContain('email=');
    });

    it('passes created_at date range filters via query string', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      vi.mocked(client.request).mockResolvedValueOnce([]);

      const handler = getHandler(server, 'list_customers');
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

    it('passes since_id filter via query string', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      vi.mocked(client.request).mockResolvedValueOnce([]);

      const handler = getHandler(server, 'list_customers');
      await handler({ page: 1, per_page: 20, since_id: 50 });

      const [, path] = vi.mocked(client.request).mock.calls[0] as [string, string];
      expect(path).toContain('since_id=50');
    });
  });

  describe('get_customer', () => {
    it('calls client.get with /customers/{id} and returns full response', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      const customerData = {
        id: 101,
        name: 'Alice Silva',
        email: 'alice@example.com',
        phone: '+5511999990001',
        total_spent: '500.00',
        total_spent_currency: 'BRL',
        last_order_id: 9001,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        billing_address: { street: 'Rua A', city: 'São Paulo' },
        addresses: [{ street: 'Rua A', city: 'São Paulo' }],
      };
      vi.mocked(client.get).mockResolvedValueOnce(customerData);

      const handler = getHandler(server, 'get_customer');
      const result = await handler({ id: 101 });

      expect(client.get).toHaveBeenCalledWith('/customers/101');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(customerData);
      // Full response — billing_address should be present
      expect(parsed.billing_address).toBeDefined();
    });
  });

  describe('create_customer', () => {
    it('calls client.post with /customers and body, returns created resource', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      const createdCustomer = {
        id: 201,
        name: 'Carlos Lima',
        email: 'carlos@example.com',
        phone: null,
        active: true,
        created_at: '2024-03-01T00:00:00Z',
      };
      vi.mocked(client.post).mockResolvedValueOnce(createdCustomer);

      const handler = getHandler(server, 'create_customer');
      const result = await handler({ name: 'Carlos Lima', email: 'carlos@example.com' });

      expect(client.post).toHaveBeenCalledWith(
        '/customers',
        expect.objectContaining({ name: 'Carlos Lima', email: 'carlos@example.com' }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(createdCustomer);
    });

    it('creates customer with name only (minimum required fields)', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      const createdCustomer = { id: 202, name: 'Diana Costa', active: true };
      vi.mocked(client.post).mockResolvedValueOnce(createdCustomer);

      const handler = getHandler(server, 'create_customer');
      await handler({ name: 'Diana Costa' });

      expect(client.post).toHaveBeenCalledWith(
        '/customers',
        expect.objectContaining({ name: 'Diana Costa' }),
      );
    });

    it('passes optional fields (phone, identification, send_email_invite) in body', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      vi.mocked(client.post).mockResolvedValueOnce({ id: 203, name: 'Eva Martins' });

      const handler = getHandler(server, 'create_customer');
      await handler({
        name: 'Eva Martins',
        phone: '+5511888880002',
        identification: '123.456.789-00',
        send_email_invite: true,
      });

      expect(client.post).toHaveBeenCalledWith(
        '/customers',
        expect.objectContaining({
          phone: '+5511888880002',
          identification: '123.456.789-00',
          send_email_invite: true,
        }),
      );
    });
  });

  describe('update_customer', () => {
    it('calls client.put with /customers/{id} and partial body, returns updated resource', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      const updatedCustomer = {
        id: 101,
        name: 'Alice Silva Updated',
        email: 'alice.new@example.com',
        active: true,
      };
      vi.mocked(client.put).mockResolvedValueOnce(updatedCustomer);

      const handler = getHandler(server, 'update_customer');
      const result = await handler({
        id: 101,
        name: 'Alice Silva Updated',
        email: 'alice.new@example.com',
      });

      expect(client.put).toHaveBeenCalledWith(
        '/customers/101',
        expect.objectContaining({ name: 'Alice Silva Updated', email: 'alice.new@example.com' }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(updatedCustomer);
    });

    it('passes phone update in body', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      vi.mocked(client.put).mockResolvedValueOnce({ id: 101, phone: '+5511777770003' });

      const handler = getHandler(server, 'update_customer');
      await handler({ id: 101, phone: '+5511777770003' });

      expect(client.put).toHaveBeenCalledWith(
        '/customers/101',
        expect.objectContaining({ phone: '+5511777770003' }),
      );
    });
  });

  describe('delete_customer', () => {
    it('returns warning with customer details and confirm_required when confirm is not set', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      const customer = {
        id: 101,
        name: 'Alice Silva',
        email: 'alice@example.com',
        active: true,
      };
      vi.mocked(client.get).mockResolvedValueOnce(customer);

      const handler = getHandler(server, 'delete_customer');
      const result = await handler({ id: 101 });

      expect(client.get).toHaveBeenCalledWith('/customers/101');
      expect(client.del).not.toHaveBeenCalled();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.confirm_required).toBe(true);
      expect(parsed.warning).toBeDefined();
      expect(parsed.warning).toContain('Alice Silva');
    });

    it('warning mentions order constraint when confirm is not set', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      vi.mocked(client.get).mockResolvedValueOnce({
        id: 101,
        name: 'Alice Silva',
        email: 'alice@example.com',
      });

      const handler = getHandler(server, 'delete_customer');
      const result = await handler({ id: 101 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.warning).toContain('Customers with associated orders cannot be deleted');
    });

    it('returns warning when confirm is explicitly false', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      vi.mocked(client.get).mockResolvedValueOnce({
        id: 101,
        name: 'Alice Silva',
        email: 'alice@example.com',
      });

      const handler = getHandler(server, 'delete_customer');
      const result = await handler({ id: 101, confirm: false });

      expect(client.del).not.toHaveBeenCalled();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.confirm_required).toBe(true);
    });

    it('calls client.del with /customers/{id} and returns { deleted: true, id } when confirm is true', async () => {
      const server = makeServer();
      const client = makeClient();
      registerCustomerTools(server as never, client);

      vi.mocked(client.del).mockResolvedValueOnce(undefined);

      const handler = getHandler(server, 'delete_customer');
      const result = await handler({ id: 101, confirm: true });

      expect(client.del).toHaveBeenCalledWith('/customers/101');
      expect(client.get).not.toHaveBeenCalled();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.deleted).toBe(true);
      expect(parsed.id).toBe(101);
    });
  });
});
