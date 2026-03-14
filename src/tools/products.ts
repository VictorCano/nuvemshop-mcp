import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { NuvemshopClient } from '../client.js';
import { buildQueryString, flattenI18n, toolResponse, wrapPaginated } from './utils.js';

interface VariantResource {
  id: number;
  price: string;
  sku?: string | null;
  [key: string]: unknown;
}

interface ProductResource {
  id: number;
  name: Record<string, string> | string;
  published: boolean;
  variants: VariantResource[];
  updated_at: string;
  [key: string]: unknown;
}

export function registerProductTools(server: McpServer, client: NuvemshopClient): void {
  // -----------------------------------------------------------------------
  // list_products
  // -----------------------------------------------------------------------
  server.tool(
    'list_products',
    'List products with pagination and optional filters. Returns curated product fields: ' +
      'id, name (flattened), published, variant_count, price_range, sku (first variant), updated_at. ' +
      'Use get_product for full details of a single product.',
    {
      page: z.number().int().min(1).default(1).describe('Page number (1-based)'),
      per_page: z
        .number()
        .int()
        .min(1)
        .max(200)
        .default(20)
        .describe('Number of items per page (1–200)'),
      q: z.string().optional().describe('Full-text search query'),
      category_id: z.number().int().optional().describe('Filter by category ID'),
      published: z
        .boolean()
        .optional()
        .describe('Filter by published status (true=published, false=draft)'),
      sort_by: z
        .string()
        .optional()
        .describe('Sort field and direction, e.g. "created-at-descending"'),
      created_at_min: z
        .string()
        .optional()
        .describe('Filter by creation date (ISO 8601 min, inclusive)'),
      created_at_max: z
        .string()
        .optional()
        .describe('Filter by creation date (ISO 8601 max, inclusive)'),
      min_stock: z.number().int().optional().describe('Filter products with stock >= this value'),
      max_stock: z.number().int().optional().describe('Filter products with stock <= this value'),
    },
    async (args) => {
      const {
        page,
        per_page,
        q,
        category_id,
        published,
        sort_by,
        created_at_min,
        created_at_max,
        min_stock,
        max_stock,
      } = args as {
        page: number;
        per_page: number;
        q?: string;
        category_id?: number;
        published?: boolean;
        sort_by?: string;
        created_at_min?: string;
        created_at_max?: string;
        min_stock?: number;
        max_stock?: number;
      };
      const qs = buildQueryString({
        page,
        per_page,
        q,
        category_id,
        published,
        sort_by,
        created_at_min,
        created_at_max,
        min_stock,
        max_stock,
      });
      const raw = await client.requestList<ProductResource>('GET', `/products${qs}`);
      const items = raw.map((product) => {
        const variants = product.variants ?? [];
        const prices = variants.map((v) => parseFloat(v.price)).filter((p) => !isNaN(p));
        const priceMin = prices.length > 0 ? String(Math.min(...prices)) : null;
        const priceMax = prices.length > 0 ? String(Math.max(...prices)) : null;
        const firstVariant = variants[0];
        return {
          id: product.id,
          name: flattenI18n(product.name as Record<string, string>),
          published: product.published,
          variant_count: variants.length,
          price_range: {
            min: firstVariant?.price ?? priceMin,
            max:
              prices.length > 1 ? String(Math.max(...prices)) : (firstVariant?.price ?? priceMax),
          },
          sku: firstVariant?.sku ?? null,
          updated_at: product.updated_at,
        };
      });
      return toolResponse(wrapPaginated(items, page, per_page));
    },
  );

  // -----------------------------------------------------------------------
  // get_product
  // -----------------------------------------------------------------------
  server.tool(
    'get_product',
    'Get full details for a single product by ID, including all variants, images, and attributes. ' +
      'Use list_products to find product IDs.',
    {
      id: z.string().describe('Product ID'),
    },
    async (args) => {
      const { id } = args as { id: string };
      const data = await client.get(`/products/${id}`);
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // get_product_by_sku
  // -----------------------------------------------------------------------
  server.tool(
    'get_product_by_sku',
    'Find a product by variant SKU. Returns the full product resource including all variants. ' +
      'Useful when you have a SKU but not the product ID.',
    {
      sku: z.string().describe('Variant SKU to search for'),
    },
    async (args) => {
      const { sku } = args as { sku: string };
      const data = await client.get(`/products/sku/${sku}`);
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // create_product
  // -----------------------------------------------------------------------
  server.tool(
    'create_product',
    'Create a new product. Name is required. Returns the created product resource including the new ID. ' +
      'Use create_variant to add variants after creation.',
    {
      name: z
        .string()
        .min(1)
        .describe(
          'Product name. Can be a plain string or a JSON-encoded i18n object like {"pt":"Camiseta","en":"T-Shirt"}',
        ),
      description: z.string().optional().describe('Product description (HTML allowed)'),
      published: z
        .boolean()
        .optional()
        .describe('Whether product is visible in store (default true)'),
      price: z.string().optional().describe('Base price as string, e.g. "29.99"'),
      variants: z
        .array(z.record(z.unknown()))
        .optional()
        .describe('Array of variant objects to create along with the product'),
      categories: z
        .array(z.object({ id: z.number().int() }))
        .optional()
        .describe('Category assignments, e.g. [{"id": 5}]'),
      images: z
        .array(z.record(z.unknown()))
        .optional()
        .describe('Image objects to attach to the product'),
    },
    async (args) => {
      const { name, description, published, price, variants, categories, images } = args as {
        name: string;
        description?: string;
        published?: boolean;
        price?: string;
        variants?: Record<string, unknown>[];
        categories?: { id: number }[];
        images?: Record<string, unknown>[];
      };
      const body: Record<string, unknown> = { name };
      if (description !== undefined) body['description'] = description;
      if (published !== undefined) body['published'] = published;
      if (price !== undefined) body['price'] = price;
      if (variants !== undefined) body['variants'] = variants;
      if (categories !== undefined) body['categories'] = categories;
      if (images !== undefined) body['images'] = images;
      const data = await client.post('/products', body);
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // update_product
  // -----------------------------------------------------------------------
  server.tool(
    'update_product',
    'Update an existing product. Only provide the fields you want to change. ' +
      'Returns the updated product resource. Use get_product to inspect current values first.',
    {
      id: z.string().describe('Product ID to update'),
      name: z.string().optional().describe('New product name'),
      description: z.string().optional().describe('New product description'),
      published: z.boolean().optional().describe('Published status'),
      price: z.string().optional().describe('New base price as string'),
      categories: z
        .array(z.object({ id: z.number().int() }))
        .optional()
        .describe('New category assignments'),
    },
    async (args) => {
      const { id, name, description, published, price, categories } = args as {
        id: string;
        name?: string;
        description?: string;
        published?: boolean;
        price?: string;
        categories?: { id: number }[];
      };
      const body: Record<string, unknown> = {};
      if (name !== undefined) body['name'] = name;
      if (description !== undefined) body['description'] = description;
      if (published !== undefined) body['published'] = published;
      if (price !== undefined) body['price'] = price;
      if (categories !== undefined) body['categories'] = categories;
      const data = await client.put(`/products/${id}`, body);
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // delete_product
  // -----------------------------------------------------------------------
  server.tool(
    'delete_product',
    'Delete a product permanently. Call without confirm first to see a warning with the ' +
      'product name and variant count. Then call again with confirm: true to execute deletion. ' +
      'This action is irreversible and also deletes all variants.',
    {
      id: z.string().describe('Product ID to delete'),
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
        const product = await client.get<ProductResource>(`/products/${id}`);
        const name = flattenI18n(product.name as Record<string, string>);
        const variantCount = product.variants?.length ?? 0;
        return toolResponse({
          warning:
            `You are about to permanently delete product "${name}" (ID: ${id}) ` +
            `with ${variantCount} variant(s). This cannot be undone.`,
          resource: { id, name, variant_count: variantCount },
          confirm_required: true,
          hint: 'Call delete_product again with confirm: true to proceed.',
        });
      }

      await client.del(`/products/${id}`);
      return toolResponse({ deleted: true, id });
    },
  );

  // -----------------------------------------------------------------------
  // create_variant
  // -----------------------------------------------------------------------
  server.tool(
    'create_variant',
    'Create a new variant for an existing product. Price is required. ' +
      'Returns the created variant resource. Use get_product to see existing variants.',
    {
      product_id: z.string().describe('Product ID to add the variant to'),
      price: z.string().describe('Variant price as string, e.g. "29.99"'),
      values: z
        .array(z.record(z.unknown()))
        .optional()
        .describe('Attribute values that define this variant, e.g. [{"id": 1, "es": "Rojo"}]'),
      sku: z.string().optional().describe('Stock keeping unit identifier'),
      stock: z.number().int().optional().describe('Initial stock quantity'),
      weight: z.string().optional().describe('Variant weight for shipping calculations'),
      dimensions: z.record(z.unknown()).optional().describe('Shipping dimensions object'),
    },
    async (args) => {
      const { product_id, price, values, sku, stock, weight, dimensions } = args as {
        product_id: string;
        price: string;
        values?: Record<string, unknown>[];
        sku?: string;
        stock?: number;
        weight?: string;
        dimensions?: Record<string, unknown>;
      };
      const body: Record<string, unknown> = { price };
      if (values !== undefined) body['values'] = values;
      if (sku !== undefined) body['sku'] = sku;
      if (stock !== undefined) body['stock'] = stock;
      if (weight !== undefined) body['weight'] = weight;
      if (dimensions !== undefined) body['dimensions'] = dimensions;
      const data = await client.post(`/products/${product_id}/variants`, body);
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // update_variant
  // -----------------------------------------------------------------------
  server.tool(
    'update_variant',
    'Update an existing product variant. Only provide the fields you want to change. ' +
      'Returns the updated variant resource.',
    {
      product_id: z.string().describe('Product ID that owns the variant'),
      variant_id: z.string().describe('Variant ID to update'),
      price: z.string().optional().describe('New variant price'),
      sku: z.string().optional().describe('New SKU'),
      stock: z.number().int().optional().describe('New stock quantity'),
      weight: z.string().optional().describe('New weight'),
      dimensions: z.record(z.unknown()).optional().describe('New dimensions object'),
    },
    async (args) => {
      const { product_id, variant_id, price, sku, stock, weight, dimensions } = args as {
        product_id: string;
        variant_id: string;
        price?: string;
        sku?: string;
        stock?: number;
        weight?: string;
        dimensions?: Record<string, unknown>;
      };
      const body: Record<string, unknown> = {};
      if (price !== undefined) body['price'] = price;
      if (sku !== undefined) body['sku'] = sku;
      if (stock !== undefined) body['stock'] = stock;
      if (weight !== undefined) body['weight'] = weight;
      if (dimensions !== undefined) body['dimensions'] = dimensions;
      const data = await client.put(`/products/${product_id}/variants/${variant_id}`, body);
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // delete_variant
  // -----------------------------------------------------------------------
  server.tool(
    'delete_variant',
    'Delete a product variant permanently. Call without confirm first to see a warning. ' +
      'Then call again with confirm: true to execute deletion. This action is irreversible.',
    {
      product_id: z.string().describe('Product ID that owns the variant'),
      variant_id: z.string().describe('Variant ID to delete'),
      confirm: z
        .boolean()
        .optional()
        .describe(
          'Set to true to confirm deletion. Omit or set to false to preview what will be deleted.',
        ),
    },
    async (args) => {
      const { product_id, variant_id, confirm } = args as {
        product_id: string;
        variant_id: string;
        confirm?: boolean;
      };

      if (!confirm) {
        const variant = await client.get<VariantResource>(
          `/products/${product_id}/variants/${variant_id}`,
        );
        return toolResponse({
          warning:
            `You are about to permanently delete variant ID ${variant_id} ` +
            `(SKU: ${variant.sku ?? 'none'}, price: ${variant.price}) from product ${product_id}. ` +
            `This cannot be undone.`,
          resource: { product_id, variant_id, sku: variant.sku, price: variant.price },
          confirm_required: true,
          hint: 'Call delete_variant again with confirm: true to proceed.',
        });
      }

      await client.del(`/products/${product_id}/variants/${variant_id}`);
      return toolResponse({ deleted: true, product_id, variant_id });
    },
  );

  // -----------------------------------------------------------------------
  // bulk_update_stock_price
  // -----------------------------------------------------------------------
  server.tool(
    'bulk_update_stock_price',
    'Bulk update stock and/or price for up to 50 product variants in a single request. ' +
      'Each entry specifies a product ID and the variants to update. ' +
      'Use this for efficient batch operations instead of individual update_variant calls.',
    {
      products: z
        .array(
          z.object({
            id: z.number().int().describe('Product ID'),
            variants: z
              .array(
                z.object({
                  id: z.number().int().describe('Variant ID'),
                  price: z.string().optional().describe('New price as string'),
                  inventory_levels: z
                    .array(
                      z.object({
                        stock: z.number().int().describe('New stock quantity'),
                      }),
                    )
                    .optional()
                    .describe('Inventory level updates'),
                }),
              )
              .describe('Variants to update'),
          }),
        )
        .min(1)
        .max(50)
        .describe('Array of product+variant update objects (1–50 items)'),
    },
    async (args) => {
      const { products } = args as {
        products: Array<{
          id: number;
          variants: Array<{
            id: number;
            price?: string;
            inventory_levels?: Array<{ stock: number }>;
          }>;
        }>;
      };
      if (!Array.isArray(products) || products.length < 1 || products.length > 50) {
        throw new Error('products must be an array of 1–50 items');
      }
      const data = await client.request('PATCH', '/products/stock-price', products);
      return toolResponse(data);
    },
  );
}
