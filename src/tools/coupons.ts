import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { NuvemshopClient } from '../client.js';
import { buildQueryString, toolResponse, wrapPaginated } from './utils.js';

interface CouponResource {
  id: number;
  code: string;
  type: string;
  value: string | null;
  valid: boolean;
  used: number;
  max_uses: number | null;
  start_date: string | null;
  end_date: string | null;
  min_price: string | null;
  [key: string]: unknown;
}

function curateCoupon(coupon: CouponResource) {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    valid: coupon.valid,
    used: coupon.used,
    max_uses: coupon.max_uses,
    start_date: coupon.start_date,
    end_date: coupon.end_date,
    min_price: coupon.min_price,
  };
}

export function registerCouponTools(server: McpServer, client: NuvemshopClient): void {
  // -----------------------------------------------------------------------
  // list_coupons
  // -----------------------------------------------------------------------
  server.tool(
    'list_coupons',
    'List discount coupons with optional filters for status, type, validity, and date ranges. ' +
      'Returns a curated summary (id, code, type, value, valid, used, max_uses, start_date, end_date, min_price) ' +
      'with pagination. Use create_coupon to create new coupons.',
    {
      page: z.number().int().min(1).default(1).describe('Page number (1-based)'),
      per_page: z
        .number()
        .int()
        .min(1)
        .max(200)
        .default(20)
        .describe('Number of items per page (1–200)'),
      q: z.string().optional().describe('Search coupons by code or description'),
      valid: z.boolean().optional().describe('Filter by validity (true = currently valid)'),
      status: z
        .enum(['valid', 'invalid'])
        .optional()
        .describe('Filter by coupon status: valid or invalid'),
      discount_type: z
        .enum(['percentage', 'absolute', 'shipping'])
        .optional()
        .describe('Filter by discount type'),
      sort_by: z.string().optional().describe('Sort field (e.g. "created_at-descending")'),
      min_start_date: z
        .string()
        .optional()
        .describe('Filter coupons with start_date on or after this ISO 8601 date'),
      max_start_date: z
        .string()
        .optional()
        .describe('Filter coupons with start_date on or before this ISO 8601 date'),
      created_at_min: z
        .string()
        .optional()
        .describe('Filter coupons created on or after this ISO 8601 datetime'),
      created_at_max: z
        .string()
        .optional()
        .describe('Filter coupons created on or before this ISO 8601 datetime'),
    },
    async (args) => {
      const {
        page,
        per_page,
        q,
        valid,
        status,
        discount_type,
        sort_by,
        min_start_date,
        max_start_date,
        created_at_min,
        created_at_max,
      } = args as {
        page: number;
        per_page: number;
        q?: string;
        valid?: boolean;
        status?: string;
        discount_type?: string;
        sort_by?: string;
        min_start_date?: string;
        max_start_date?: string;
        created_at_min?: string;
        created_at_max?: string;
      };

      const qs = buildQueryString({
        page,
        per_page,
        q,
        valid,
        status,
        discount_type,
        sort_by,
        min_start_date,
        max_start_date,
        created_at_min,
        created_at_max,
      });

      const raw = await client.request<CouponResource[]>('GET', `/coupons${qs}`);
      const items = raw.map(curateCoupon);

      return toolResponse(wrapPaginated(items, page, per_page));
    },
  );

  // -----------------------------------------------------------------------
  // create_coupon
  // -----------------------------------------------------------------------
  server.tool(
    'create_coupon',
    'Create a new discount coupon for the store. ' +
      'For type "percentage" or "absolute", the value field is required (e.g. 10 for 10% or $10 off). ' +
      'For type "shipping", value is optional (free shipping coupon). ' +
      'Returns the created coupon resource.',
    {
      code: z.string().min(1).describe('Coupon code (must be unique, min 1 character)'),
      type: z
        .enum(['percentage', 'absolute', 'shipping'])
        .describe(
          'Discount type: percentage (e.g. 10% off), absolute (e.g. $10 off), or shipping (free/discounted shipping)',
        ),
      value: z
        .number()
        .optional()
        .describe(
          'Discount value. Required for type "percentage" (e.g. 10 = 10%) and "absolute" (e.g. 10 = $10 off). Optional for "shipping".',
        ),
      valid: z
        .boolean()
        .optional()
        .describe('Whether the coupon is currently active (default: true)'),
      start_date: z
        .string()
        .optional()
        .describe('Date when coupon becomes valid (ISO 8601 format, e.g. "2024-01-01")'),
      end_date: z
        .string()
        .optional()
        .describe('Date when coupon expires (ISO 8601 format, e.g. "2024-12-31")'),
      min_price: z.number().optional().describe('Minimum order value required to use this coupon'),
      max_uses: z
        .number()
        .int()
        .optional()
        .describe('Maximum number of times this coupon can be used (null = unlimited)'),
      includes_shipping: z
        .boolean()
        .optional()
        .describe('Whether this coupon also provides free shipping'),
      first_consumer_purchase: z
        .boolean()
        .optional()
        .describe('Restrict coupon to customers making their first purchase'),
      combines_with_other_discounts: z
        .boolean()
        .optional()
        .describe('Whether this coupon can be combined with other discounts'),
    },
    async (args) => {
      const {
        code,
        type,
        value,
        valid,
        start_date,
        end_date,
        min_price,
        max_uses,
        includes_shipping,
        first_consumer_purchase,
        combines_with_other_discounts,
      } = args as {
        code: string;
        type: 'percentage' | 'absolute' | 'shipping';
        value?: number;
        valid?: boolean;
        start_date?: string;
        end_date?: string;
        min_price?: number;
        max_uses?: number;
        includes_shipping?: boolean;
        first_consumer_purchase?: boolean;
        combines_with_other_discounts?: boolean;
      };

      if (type !== 'shipping' && value === undefined) {
        return toolResponse({
          error: `Coupon type "${type}" requires a value.`,
          hint: 'Provide the value field with a numeric amount. For "percentage", value is the percentage (e.g. 10 = 10% off). For "absolute", value is the fixed discount amount.',
        });
      }

      const body = Object.fromEntries(
        Object.entries({
          code,
          type,
          value,
          valid,
          start_date,
          end_date,
          min_price,
          max_uses,
          includes_shipping,
          first_consumer_purchase,
          combines_with_other_discounts,
        }).filter(([, v]) => v !== undefined),
      );

      const data = await client.post('/coupons', body);
      return toolResponse(data);
    },
  );
}
