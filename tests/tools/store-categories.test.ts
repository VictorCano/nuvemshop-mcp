import { describe, expect, it, vi } from 'vitest';
import type { NuvemshopClient } from '../../src/client.js';
import { registerStoreCategoryTools } from '../../src/tools/store-categories.js';

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

describe('registerStoreCategoryTools', () => {
  it('registers exactly 6 tools', () => {
    const server = makeServer();
    const client = makeClient();
    registerStoreCategoryTools(server as never, client);
    expect(server.tool).toHaveBeenCalledTimes(6);
  });

  it('registers the expected tool names', () => {
    const server = makeServer();
    const client = makeClient();
    registerStoreCategoryTools(server as never, client);
    const names = server.calls.map(([name]) => name);
    expect(names).toContain('get_store');
    expect(names).toContain('list_categories');
    expect(names).toContain('get_category');
    expect(names).toContain('create_category');
    expect(names).toContain('update_category');
    expect(names).toContain('delete_category');
  });

  describe('get_store', () => {
    it('calls client.get("/store") and returns response', async () => {
      const server = makeServer();
      const client = makeClient();
      registerStoreCategoryTools(server as never, client);

      const storeData = {
        id: 1,
        name: 'My Store',
        main_currency: 'BRL',
        main_language: 'pt',
        plan_name: 'basic',
      };
      vi.mocked(client.get).mockResolvedValueOnce(storeData);

      const handler = getHandler(server, 'get_store');
      const result = await handler({});

      expect(client.get).toHaveBeenCalledWith('/store');
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(storeData);
    });
  });

  describe('list_categories', () => {
    it('calls client.request with GET and query params, returns wrapPaginated result', async () => {
      const server = makeServer();
      const client = makeClient();
      registerStoreCategoryTools(server as never, client);

      const categories = [
        { id: 1, name: { pt: 'Roupas', en: 'Clothes' }, parent_id: null },
        { id: 2, name: { pt: 'Calçados', en: 'Shoes' }, parent_id: null },
      ];
      vi.mocked(client.request).mockResolvedValueOnce(categories);

      const handler = getHandler(server, 'list_categories');
      const result = await handler({ page: 1, per_page: 20 });

      expect(client.request).toHaveBeenCalledWith('GET', expect.stringContaining('/categories'));
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.pagination.page).toBe(1);
      expect(parsed.pagination.per_page).toBe(20);
      expect(parsed.results).toHaveLength(2);
      // Names should be flattened
      expect(parsed.results[0].name).toBe('Roupas');
      expect(parsed.results[1].name).toBe('Calçados');
    });

    it('passes parent_id filter when provided', async () => {
      const server = makeServer();
      const client = makeClient();
      registerStoreCategoryTools(server as never, client);

      vi.mocked(client.request).mockResolvedValueOnce([]);

      const handler = getHandler(server, 'list_categories');
      await handler({ page: 1, per_page: 20, parent_id: 5 });

      const [, path] = vi.mocked(client.request).mock.calls[0] as [string, string];
      expect(path).toContain('parent_id=5');
    });
  });

  describe('get_category', () => {
    it('calls client.get with the correct path', async () => {
      const server = makeServer();
      const client = makeClient();
      registerStoreCategoryTools(server as never, client);

      const category = { id: 3, name: { pt: 'Eletrônicos' }, parent_id: null };
      vi.mocked(client.get).mockResolvedValueOnce(category);

      const handler = getHandler(server, 'get_category');
      const result = await handler({ id: '3' });

      expect(client.get).toHaveBeenCalledWith('/categories/3');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(category);
    });
  });

  describe('create_category', () => {
    it('calls client.post and returns created resource', async () => {
      const server = makeServer();
      const client = makeClient();
      registerStoreCategoryTools(server as never, client);

      const created = { id: 10, name: { pt: 'Nova Categoria' }, parent_id: null };
      vi.mocked(client.post).mockResolvedValueOnce(created);

      const handler = getHandler(server, 'create_category');
      const result = await handler({ name: 'Nova Categoria' });

      expect(client.post).toHaveBeenCalledWith(
        '/categories',
        expect.objectContaining({ name: 'Nova Categoria' }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(created);
    });
  });

  describe('update_category', () => {
    it('calls client.put with correct path and fields, returns updated resource', async () => {
      const server = makeServer();
      const client = makeClient();
      registerStoreCategoryTools(server as never, client);

      const updated = { id: 5, name: { pt: 'Atualizado' }, parent_id: null };
      vi.mocked(client.put).mockResolvedValueOnce(updated);

      const handler = getHandler(server, 'update_category');
      const result = await handler({ id: '5', name: 'Atualizado' });

      expect(client.put).toHaveBeenCalledWith(
        '/categories/5',
        expect.objectContaining({ name: 'Atualizado' }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(updated);
    });
  });

  describe('delete_category', () => {
    it('returns warning object without confirm', async () => {
      const server = makeServer();
      const client = makeClient();
      registerStoreCategoryTools(server as never, client);

      const category = { id: 7, name: { pt: 'Para Deletar' }, parent_id: null };
      vi.mocked(client.get).mockResolvedValueOnce(category);

      const handler = getHandler(server, 'delete_category');
      const result = await handler({ id: '7' });

      expect(client.get).toHaveBeenCalledWith('/categories/7');
      expect(client.del).not.toHaveBeenCalled();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.confirm_required).toBe(true);
      expect(parsed.warning).toBeDefined();
    });

    it('deletes category when confirm is true', async () => {
      const server = makeServer();
      const client = makeClient();
      registerStoreCategoryTools(server as never, client);

      vi.mocked(client.del).mockResolvedValueOnce(undefined);

      const handler = getHandler(server, 'delete_category');
      const result = await handler({ id: '7', confirm: true });

      expect(client.del).toHaveBeenCalledWith('/categories/7');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.deleted).toBe(true);
      expect(parsed.id).toBe('7');
    });
  });
});
