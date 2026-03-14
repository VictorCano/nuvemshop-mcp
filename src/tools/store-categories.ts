import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { NuvemshopClient } from '../client.js';
import { buildQueryString, flattenI18n, toolResponse, wrapPaginated } from './utils.js';

interface CategoryResource {
  id: number;
  name: Record<string, string> | string;
  parent_id: number | null;
  [key: string]: unknown;
}

export function registerStoreCategoryTools(server: McpServer, client: NuvemshopClient): void {
  // -----------------------------------------------------------------------
  // get_store
  // -----------------------------------------------------------------------
  server.tool(
    'get_store',
    'Get basic store information: name, plan, main language, main currency, and domain. ' +
      'Useful as a first call to understand the store context.',
    {},
    async () => {
      const data = await client.get('/store');
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // list_categories
  // -----------------------------------------------------------------------
  server.tool(
    'list_categories',
    'List product categories with pagination. Returns flattened names (primary language). ' +
      'Use parent_id to list subcategories under a specific category. ' +
      'See get_category for full details of a single category.',
    {
      page: z.number().int().min(1).default(1).describe('Page number (1-based)'),
      per_page: z
        .number()
        .int()
        .min(1)
        .max(200)
        .default(20)
        .describe('Number of items per page (1–200)'),
      parent_id: z
        .number()
        .int()
        .optional()
        .describe('Filter by parent category ID to list subcategories'),
    },
    async (args) => {
      const { page, per_page, parent_id } = args as {
        page: number;
        per_page: number;
        parent_id?: number;
      };
      const qs = buildQueryString({ page, per_page, parent_id });
      const raw = await client.requestList<CategoryResource>('GET', `/categories${qs}`);
      const items = raw.map((cat) => ({
        ...cat,
        name: flattenI18n(cat.name as Record<string, string>),
      }));
      return toolResponse(wrapPaginated(items, page, per_page));
    },
  );

  // -----------------------------------------------------------------------
  // get_category
  // -----------------------------------------------------------------------
  server.tool(
    'get_category',
    'Get full details for a single category by ID, including multilingual name/description ' +
      'and parent hierarchy. Use list_categories to find category IDs.',
    {
      id: z.string().describe('Category ID'),
    },
    async (args) => {
      const { id } = args as { id: string };
      const data = await client.get(`/categories/${id}`);
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // create_category
  // -----------------------------------------------------------------------
  server.tool(
    'create_category',
    'Create a new product category. Name is required. Returns the created category resource ' +
      'including the new category ID. Use update_category to set a parent afterwards.',
    {
      name: z
        .string()
        .min(1)
        .describe(
          'Category name. Can be a plain string or a JSON-encoded i18n object like {"pt":"Roupas","en":"Clothes"}',
        ),
      description: z.string().optional().describe('Optional category description'),
      parent: z.number().int().optional().describe('Parent category ID to create a subcategory'),
    },
    async (args) => {
      const { name, description, parent } = args as {
        name: string;
        description?: string;
        parent?: number;
      };
      const body: Record<string, unknown> = { name };
      if (description !== undefined) body['description'] = description;
      if (parent !== undefined) body['parent'] = parent;
      const data = await client.post('/categories', body);
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // update_category
  // -----------------------------------------------------------------------
  server.tool(
    'update_category',
    'Update an existing category. Only provide the fields you want to change. ' +
      'Returns the updated category resource. Use get_category to inspect current values first.',
    {
      id: z.string().describe('Category ID to update'),
      name: z.string().optional().describe('New category name'),
      description: z.string().optional().describe('New category description'),
      parent: z
        .number()
        .int()
        .optional()
        .describe('New parent category ID (set to 0 to make it a root category)'),
    },
    async (args) => {
      const { id, name, description, parent } = args as {
        id: string;
        name?: string;
        description?: string;
        parent?: number;
      };
      const body: Record<string, unknown> = {};
      if (name !== undefined) body['name'] = name;
      if (description !== undefined) body['description'] = description;
      if (parent !== undefined) body['parent'] = parent;
      // Nuvemshop categories API only supports PUT (full replace).
      // Fetch current values and merge to avoid clearing unset fields.
      const current = await client.get<CategoryResource>(`/categories/${id}`);
      const merged: Record<string, unknown> = {};
      merged['name'] = name ?? current.name;
      merged['description'] = description ?? (current as Record<string, unknown>)['description'];
      if (parent !== undefined) merged['parent'] = parent;
      const data = await client.put(`/categories/${id}`, merged);
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // delete_category
  // -----------------------------------------------------------------------
  server.tool(
    'delete_category',
    'Delete a category permanently. Call without confirm first to see a warning with the ' +
      'category name. Then call again with confirm: true to execute the deletion. ' +
      'This action is irreversible.',
    {
      id: z.string().describe('Category ID to delete'),
      confirm: z
        .boolean()
        .optional()
        .describe(
          'Set to true to confirm deletion. Omit or set to false to preview what will be deleted.',
        ),
    },
    async (args) => {
      const { id, confirm } = args as { id: string; confirm?: boolean };

      if (!confirm) {
        const category = await client.get<CategoryResource>(`/categories/${id}`);
        const name = flattenI18n(category.name as Record<string, string>);
        return toolResponse({
          warning: `You are about to permanently delete category "${name}" (ID: ${id}). This cannot be undone.`,
          resource: { id, name },
          confirm_required: true,
          hint: 'Call delete_category again with confirm: true to proceed.',
        });
      }

      await client.del(`/categories/${id}`);
      return toolResponse({ deleted: true, id });
    },
  );
}
