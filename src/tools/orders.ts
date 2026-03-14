import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { NuvemshopClient } from '../client.js';
import { buildQueryString, toolResponse, wrapPaginated } from './utils.js';

interface OrderCustomer {
  id: number;
  name: string;
  [key: string]: unknown;
}

interface OrderResource {
  id: number;
  number: number;
  status: string;
  payment_status: string;
  shipping_status: string;
  total: string;
  currency: string;
  customer: OrderCustomer;
  created_at: string;
  [key: string]: unknown;
}

export function registerOrderTools(server: McpServer, client: NuvemshopClient): void {
  // -----------------------------------------------------------------------
  // list_orders
  // -----------------------------------------------------------------------
  server.tool(
    'list_orders',
    'List orders with optional filters for status, payment, shipping, dates, and customer. ' +
      'Returns a curated summary (id, number, status, payment/shipping status, total, currency, ' +
      'customer name, created_at) with pagination. Use get_order to fetch full order details.',
    {
      page: z.number().int().min(1).default(1).describe('Page number (1-based)'),
      per_page: z
        .number()
        .int()
        .min(1)
        .max(200)
        .default(20)
        .describe('Number of items per page (1–200)'),
      status: z
        .enum(['any', 'open', 'closed', 'cancelled'])
        .optional()
        .describe('Filter by order status: open, closed, cancelled, or any'),
      payment_status: z
        .enum([
          'pending',
          'authorized',
          'paid',
          'partially_paid',
          'abandoned',
          'refunded',
          'partially_refunded',
          'voided',
        ])
        .optional()
        .describe('Filter by payment status'),
      shipping_status: z
        .enum([
          'unpacked',
          'shipped',
          'unshipped',
          'delivered',
          'partially_packed',
          'partially_fulfilled',
        ])
        .optional()
        .describe('Filter by shipping/fulfillment status'),
      created_at_min: z
        .string()
        .optional()
        .describe('Filter orders created on or after this ISO 8601 datetime'),
      created_at_max: z
        .string()
        .optional()
        .describe('Filter orders created on or before this ISO 8601 datetime'),
      updated_at_min: z
        .string()
        .optional()
        .describe('Filter orders updated on or after this ISO 8601 datetime'),
      updated_at_max: z
        .string()
        .optional()
        .describe('Filter orders updated on or before this ISO 8601 datetime'),
      customer_id: z.number().int().optional().describe('Filter orders by customer ID'),
    },
    async (args) => {
      const {
        page,
        per_page,
        status,
        payment_status,
        shipping_status,
        created_at_min,
        created_at_max,
        updated_at_min,
        updated_at_max,
        customer_id,
      } = args as {
        page: number;
        per_page: number;
        status?: string;
        payment_status?: string;
        shipping_status?: string;
        created_at_min?: string;
        created_at_max?: string;
        updated_at_min?: string;
        updated_at_max?: string;
        customer_id?: number;
      };

      const qs = buildQueryString({
        page,
        per_page,
        status,
        payment_status,
        shipping_status,
        created_at_min,
        created_at_max,
        updated_at_min,
        updated_at_max,
        customer_id,
      });

      const raw = await client.request<OrderResource[]>('GET', `/orders${qs}`);
      const items = raw.map((order) => ({
        id: order.id,
        number: order.number,
        status: order.status,
        payment_status: order.payment_status,
        shipping_status: order.shipping_status,
        total: order.total,
        currency: order.currency,
        customer: {
          id: order.customer?.id,
          name: order.customer?.name,
        },
        created_at: order.created_at,
      }));

      return toolResponse(wrapPaginated(items, page, per_page));
    },
  );

  // -----------------------------------------------------------------------
  // get_order
  // -----------------------------------------------------------------------
  server.tool(
    'get_order',
    'Get full details for a single order by ID, including line items, customer, shipping address, ' +
      'payment details, and fulfillment events. Use list_orders to find order IDs.',
    {
      id: z.number().int().describe('Order ID'),
    },
    async (args) => {
      const { id } = args as { id: number };
      const data = await client.get(`/orders/${id}`);
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // close_order
  // -----------------------------------------------------------------------
  server.tool(
    'close_order',
    'Close an open order, marking it as fulfilled. This is reversible — use reopen_order to undo. ' +
      'Returns the updated order resource.',
    {
      id: z.number().int().describe('Order ID to close'),
    },
    async (args) => {
      const { id } = args as { id: number };
      const data = await client.post(`/orders/${id}/close`, {});
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // reopen_order
  // -----------------------------------------------------------------------
  server.tool(
    'reopen_order',
    'Reopen a previously closed order. This is reversible — use close_order to close again. ' +
      'Returns the updated order resource.',
    {
      id: z.number().int().describe('Order ID to reopen'),
    },
    async (args) => {
      const { id } = args as { id: number };
      const data = await client.post(`/orders/${id}/open`, {});
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // cancel_order
  // -----------------------------------------------------------------------
  server.tool(
    'cancel_order',
    'Cancel an order. Call without confirm first to see a warning with order details. ' +
      'Then call again with confirm: true to execute the cancellation. ' +
      'Use restock to return inventory and notify_customer to send a cancellation email. ' +
      'This action is irreversible.',
    {
      id: z.number().int().describe('Order ID to cancel'),
      confirm: z
        .boolean()
        .optional()
        .describe(
          'Set to true to confirm cancellation. Omit or set to false to preview order details before cancelling.',
        ),
      restock: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to restock the inventory items from this order (default: false)'),
      notify_customer: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Whether to send a cancellation notification email to the customer (default: false)',
        ),
      reason: z
        .string()
        .optional()
        .describe('Optional reason for cancellation (e.g., "Customer request", "Fraud")'),
    },
    async (args) => {
      const {
        id,
        confirm,
        restock = false,
        notify_customer = false,
        reason,
      } = args as {
        id: number;
        confirm?: boolean;
        restock?: boolean;
        notify_customer?: boolean;
        reason?: string;
      };

      if (!confirm) {
        const order = await client.get<OrderResource>(`/orders/${id}`);
        return toolResponse({
          warning:
            `You are about to cancel order #${order.number} (ID: ${id}). ` +
            `Current status: ${order.status}, payment: ${order.payment_status}. ` +
            `Total: ${order.currency} ${order.total}. This action is irreversible.`,
          order: {
            id: order.id,
            number: order.number,
            status: order.status,
            payment_status: order.payment_status,
            total: order.total,
            currency: order.currency,
          },
          confirm_required: true,
          hint: 'Call cancel_order again with confirm: true to proceed. Use restock: true to return inventory.',
        });
      }

      const data = await client.post(`/orders/${id}/cancel`, {
        restock,
        notify_customer,
        reason,
      });
      return toolResponse(data);
    },
  );
}
