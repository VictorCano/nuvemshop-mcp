import { describe, expect, it, vi } from 'vitest';
import type { NuvemshopClient } from '../../src/client.js';
import { registerProductTools } from '../../src/tools/products.js';

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

describe('registerProductTools', () => {
  it('registers exactly 10 tools', () => {
    const server = makeServer();
    const client = makeClient();
    registerProductTools(server as never, client);
    expect(server.tool).toHaveBeenCalledTimes(10);
  });

  it('registers the expected tool names', () => {
    const server = makeServer();
    const client = makeClient();
    registerProductTools(server as never, client);
    const names = server.calls.map(([name]) => name);
    expect(names).toContain('list_products');
    expect(names).toContain('get_product');
    expect(names).toContain('get_product_by_sku');
    expect(names).toContain('create_product');
    expect(names).toContain('update_product');
    expect(names).toContain('delete_product');
    expect(names).toContain('create_variant');
    expect(names).toContain('update_variant');
    expect(names).toContain('delete_variant');
    expect(names).toContain('bulk_update_stock_price');
  });

  describe('list_products', () => {
    it('calls client.requestList with GET and correct path including query params', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      const products = [
        {
          id: 1,
          name: { pt: 'Camiseta', en: 'T-Shirt' },
          published: true,
          variants: [{ id: 10, price: '29.99', sku: 'CAM-001' }],
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      vi.mocked(client.requestList).mockResolvedValueOnce(products);

      const handler = getHandler(server, 'list_products');
      const result = await handler({ page: 1, per_page: 20 });

      expect(client.requestList).toHaveBeenCalledWith('GET', expect.stringContaining('/products'));
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.pagination.page).toBe(1);
      expect(parsed.pagination.per_page).toBe(20);
      expect(parsed.results).toHaveLength(1);
    });

    it('returns curated product fields with flattened name and price_range', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      const products = [
        {
          id: 1,
          name: { pt: 'Camiseta', en: 'T-Shirt' },
          published: true,
          variants: [
            { id: 10, price: '29.99', sku: 'CAM-001' },
            { id: 11, price: '39.99', sku: 'CAM-002' },
          ],
          updated_at: '2024-01-01T00:00:00Z',
          some_extra_field: 'should be excluded',
        },
      ];
      vi.mocked(client.requestList).mockResolvedValueOnce(products);

      const handler = getHandler(server, 'list_products');
      const result = await handler({ page: 1, per_page: 20 });
      const parsed = JSON.parse(result.content[0].text);

      const product = parsed.results[0];
      expect(product.id).toBe(1);
      expect(product.name).toBe('Camiseta'); // flattened
      expect(product.published).toBe(true);
      expect(product.variant_count).toBe(2);
      expect(product.price_range).toEqual({ min: '29.99', max: '39.99' });
      expect(product.sku).toBe('CAM-001'); // first variant's SKU
      expect(product.updated_at).toBe('2024-01-01T00:00:00Z');
      // Extra fields should NOT be present
      expect(product.some_extra_field).toBeUndefined();
    });

    it('passes query filters when provided', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      vi.mocked(client.requestList).mockResolvedValueOnce([]);

      const handler = getHandler(server, 'list_products');
      await handler({ page: 1, per_page: 20, q: 'camiseta', category_id: 5 });

      const [, path] = vi.mocked(client.requestList).mock.calls[0] as [string, string];
      expect(path).toContain('q=camiseta');
      expect(path).toContain('category_id=5');
    });
  });

  describe('get_product', () => {
    it('calls client.get with /products/{id} and returns full response', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      const product = {
        id: 42,
        name: { pt: 'Produto Completo' },
        variants: [],
        images: [],
      };
      vi.mocked(client.get).mockResolvedValueOnce(product);

      const handler = getHandler(server, 'get_product');
      const result = await handler({ id: '42' });

      expect(client.get).toHaveBeenCalledWith('/products/42');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(product);
    });
  });

  describe('get_product_by_sku', () => {
    it('calls client.get with /products/sku/{sku} and returns full response', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      const product = { id: 5, name: { pt: 'Produto SKU' }, variants: [] };
      vi.mocked(client.get).mockResolvedValueOnce(product);

      const handler = getHandler(server, 'get_product_by_sku');
      const result = await handler({ sku: 'ABC-123' });

      expect(client.get).toHaveBeenCalledWith('/products/sku/ABC-123');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(product);
    });
  });

  describe('create_product', () => {
    it('calls client.post with /products and body, returns created resource', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      const created = { id: 99, name: { pt: 'Novo Produto' }, variants: [] };
      vi.mocked(client.post).mockResolvedValueOnce(created);

      const handler = getHandler(server, 'create_product');
      const result = await handler({ name: 'Novo Produto', price: '49.99' });

      expect(client.post).toHaveBeenCalledWith(
        '/products',
        expect.objectContaining({ name: 'Novo Produto' }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(created);
    });
  });

  describe('update_product', () => {
    it('calls client.put with /products/{id} and partial body, returns updated resource', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      const updated = { id: 10, name: { pt: 'Atualizado' }, variants: [] };
      vi.mocked(client.put).mockResolvedValueOnce(updated);

      const handler = getHandler(server, 'update_product');
      const result = await handler({ id: '10', name: 'Atualizado' });

      expect(client.put).toHaveBeenCalledWith(
        '/products/10',
        expect.objectContaining({ name: 'Atualizado' }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(updated);
    });
  });

  describe('delete_product', () => {
    it('returns warning with product name and variant count when confirm not set', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      const product = {
        id: 7,
        name: { pt: 'Para Deletar' },
        variants: [{ id: 1 }, { id: 2 }],
      };
      vi.mocked(client.get).mockResolvedValueOnce(product);

      const handler = getHandler(server, 'delete_product');
      const result = await handler({ id: '7' });

      expect(client.get).toHaveBeenCalledWith('/products/7');
      expect(client.del).not.toHaveBeenCalled();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.confirm_required).toBe(true);
      expect(parsed.warning).toBeDefined();
      expect(parsed.warning).toContain('Para Deletar');
      expect(parsed.resource.variant_count).toBe(2);
    });

    it('deletes product when confirm is true', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      vi.mocked(client.del).mockResolvedValueOnce(undefined);

      const handler = getHandler(server, 'delete_product');
      const result = await handler({ id: '7', confirm: true });

      expect(client.del).toHaveBeenCalledWith('/products/7');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.deleted).toBe(true);
      expect(parsed.id).toBe('7');
    });
  });

  describe('create_variant', () => {
    it('calls client.post with /products/{product_id}/variants and returns created variant', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      const created = { id: 50, price: '19.99', sku: 'VAR-001' };
      vi.mocked(client.post).mockResolvedValueOnce(created);

      const handler = getHandler(server, 'create_variant');
      const result = await handler({ product_id: '10', price: '19.99', sku: 'VAR-001' });

      expect(client.post).toHaveBeenCalledWith(
        '/products/10/variants',
        expect.objectContaining({ price: '19.99', sku: 'VAR-001' }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(created);
    });
  });

  describe('update_variant', () => {
    it('calls client.put with /products/{product_id}/variants/{variant_id}', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      const updated = { id: 50, price: '24.99', sku: 'VAR-001' };
      vi.mocked(client.put).mockResolvedValueOnce(updated);

      const handler = getHandler(server, 'update_variant');
      const result = await handler({ product_id: '10', variant_id: '50', price: '24.99' });

      expect(client.put).toHaveBeenCalledWith(
        '/products/10/variants/50',
        expect.objectContaining({ price: '24.99' }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(updated);
    });
  });

  describe('delete_variant', () => {
    it('returns warning when confirm not set', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      const variant = { id: 50, price: '19.99', sku: 'VAR-001' };
      vi.mocked(client.get).mockResolvedValueOnce(variant);

      const handler = getHandler(server, 'delete_variant');
      const result = await handler({ product_id: '10', variant_id: '50' });

      expect(client.get).toHaveBeenCalledWith('/products/10/variants/50');
      expect(client.del).not.toHaveBeenCalled();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.confirm_required).toBe(true);
      expect(parsed.warning).toBeDefined();
    });

    it('deletes variant when confirm is true', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      vi.mocked(client.del).mockResolvedValueOnce(undefined);

      const handler = getHandler(server, 'delete_variant');
      const result = await handler({ product_id: '10', variant_id: '50', confirm: true });

      expect(client.del).toHaveBeenCalledWith('/products/10/variants/50');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.deleted).toBe(true);
      expect(parsed.variant_id).toBe('50');
    });
  });

  describe('bulk_update_stock_price', () => {
    it('calls client.request with PATCH and /products/stock-price and array body', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      const responseData = { updated: 2 };
      vi.mocked(client.request).mockResolvedValueOnce(responseData);

      const bulkBody = [
        { id: 1, variants: [{ id: 10, price: '29.99' }] },
        { id: 2, variants: [{ id: 20, inventory_levels: [{ stock: 5 }] }] },
      ];

      const handler = getHandler(server, 'bulk_update_stock_price');
      const result = await handler({ products: bulkBody });

      expect(client.request).toHaveBeenCalledWith('PATCH', '/products/stock-price', bulkBody);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(responseData);
    });

    it('rejects when products array is empty', async () => {
      const server = makeServer();
      const client = makeClient();
      registerProductTools(server as never, client);

      const handler = getHandler(server, 'bulk_update_stock_price');
      await expect(handler({ products: [] })).rejects.toThrow();
    });
  });
});
