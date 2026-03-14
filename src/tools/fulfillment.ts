import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { NuvemshopClient } from '../client.js';
import { toolResponse } from './utils.js';

export function registerFulfillmentTools(server: McpServer, client: NuvemshopClient): void {
  // -----------------------------------------------------------------------
  // list_fulfillment_orders
  // -----------------------------------------------------------------------
  server.tool(
    'list_fulfillment_orders',
    'List all fulfillment orders for a given order. ' +
      'Fulfillment orders represent the shipping/delivery units within an order. ' +
      'Use get_fulfillment_order for full details of a single fulfillment order.',
    {
      order_id: z.number().int().describe('The order ID to list fulfillment orders for'),
    },
    async (args) => {
      const { order_id } = args as { order_id: number };
      const data = await client.get(`/orders/${order_id}/fulfillment-orders`);
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // get_fulfillment_order
  // -----------------------------------------------------------------------
  server.tool(
    'get_fulfillment_order',
    'Get full details for a single fulfillment order including tracking events and status history. ' +
      'Use list_fulfillment_orders to find fulfillment order IDs for a given order.',
    {
      order_id: z.number().int().describe('The order ID'),
      fulfillment_order_id: z.number().int().describe('The fulfillment order ID'),
    },
    async (args) => {
      const { order_id, fulfillment_order_id } = args as {
        order_id: number;
        fulfillment_order_id: number;
      };
      const data = await client.get(
        `/orders/${order_id}/fulfillment-orders/${fulfillment_order_id}`,
      );
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // update_fulfillment_order
  // -----------------------------------------------------------------------
  server.tool(
    'update_fulfillment_order',
    'Update the status of a fulfillment order. ' +
      'Valid statuses are: UNPACKED, PACKED, DISPATCHED, DELIVERED, READY_FOR_PICKUP. ' +
      'Note: To mark as DELIVERED, prefer using add_tracking_event with status "delivered" instead, ' +
      'as it provides richer tracking history for the customer.',
    {
      order_id: z.number().int().describe('The order ID'),
      fulfillment_order_id: z.number().int().describe('The fulfillment order ID to update'),
      status: z
        .enum(['UNPACKED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'READY_FOR_PICKUP'])
        .describe(
          'New fulfillment status. Use PACKED when items are boxed, DISPATCHED when handed to carrier, ' +
            'DELIVERED when received by customer, READY_FOR_PICKUP for pickup orders. ' +
            'For DELIVERED, prefer add_tracking_event with status "delivered".',
        ),
    },
    async (args) => {
      const { order_id, fulfillment_order_id, status } = args as {
        order_id: number;
        fulfillment_order_id: number;
        status: 'UNPACKED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'READY_FOR_PICKUP';
      };
      const data = await client.request(
        'PATCH',
        `/orders/${order_id}/fulfillment-orders/${fulfillment_order_id}`,
        { status },
      );
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // add_tracking_event
  // -----------------------------------------------------------------------
  server.tool(
    'add_tracking_event',
    'Add a tracking event to a fulfillment order. ' +
      'Creating a tracking event with status "delivered" is the preferred way to mark a fulfillment order as delivered, ' +
      'as it records rich tracking history visible to the customer. ' +
      'Common statuses: "in_transit", "delivered", "out_for_delivery", "attempt_failed", "ready_for_pickup".',
    {
      order_id: z.number().int().describe('The order ID'),
      fulfillment_order_id: z.number().int().describe('The fulfillment order ID'),
      status: z
        .string()
        .describe(
          'Tracking event status, e.g. "in_transit", "delivered", "out_for_delivery", "attempt_failed". ' +
            'Use "delivered" to mark the fulfillment order as delivered.',
        ),
      description: z
        .string()
        .optional()
        .describe(
          'Human-readable description of the tracking event, e.g. "Package picked up at warehouse"',
        ),
      city: z.string().optional().describe('City where the event occurred'),
      province: z.string().optional().describe('Province or state where the event occurred'),
      country: z.string().optional().describe('Country code where the event occurred (e.g. "BR")'),
      happened_at: z
        .string()
        .optional()
        .describe(
          'ISO 8601 datetime when the event occurred, e.g. "2024-01-15T10:00:00Z". Defaults to now if omitted.',
        ),
    },
    async (args) => {
      const {
        order_id,
        fulfillment_order_id,
        status,
        description,
        city,
        province,
        country,
        happened_at,
      } = args as {
        order_id: number;
        fulfillment_order_id: number;
        status: string;
        description?: string;
        city?: string;
        province?: string;
        country?: string;
        happened_at?: string;
      };

      const body: Record<string, unknown> = { status };
      if (description !== undefined) body['description'] = description;
      if (city !== undefined) body['city'] = city;
      if (province !== undefined) body['province'] = province;
      if (country !== undefined) body['country'] = country;
      if (happened_at !== undefined) body['happened_at'] = happened_at;

      const data = await client.post(
        `/orders/${order_id}/fulfillment-orders/${fulfillment_order_id}/tracking-events`,
        body,
      );
      return toolResponse(data);
    },
  );
}
