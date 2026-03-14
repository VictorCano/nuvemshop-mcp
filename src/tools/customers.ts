import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { NuvemshopClient } from '../client.js';
import { buildQueryString, toolResponse, wrapPaginated } from './utils.js';

interface CustomerResource {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  total_spent: string;
  total_spent_currency: string;
  last_order_id?: number | null;
  active: boolean;
  created_at: string;
  [key: string]: unknown;
}

interface CuratedCustomer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  total_spent: string;
  total_spent_currency: string;
  last_order_id: number | null;
  active: boolean;
  created_at: string;
}

function curateCustomer(c: CustomerResource): CuratedCustomer {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? null,
    phone: c.phone ?? null,
    total_spent: c.total_spent,
    total_spent_currency: c.total_spent_currency,
    last_order_id: c.last_order_id ?? null,
    active: c.active,
    created_at: c.created_at,
  };
}

export function registerCustomerTools(server: McpServer, client: NuvemshopClient): void {
  // -----------------------------------------------------------------------
  // list_customers
  // -----------------------------------------------------------------------
  server.tool(
    'list_customers',
    'List customers with optional filtering by search query, email, or date ranges. ' +
      'Returns curated summary fields (id, name, email, phone, total_spent, last_order_id, active, created_at) ' +
      'with pagination. Use get_customer for full customer details including addresses.',
    {
      page: z.number().int().min(1).default(1).describe('Page number (1-based)'),
      per_page: z
        .number()
        .int()
        .min(1)
        .max(200)
        .default(20)
        .describe('Number of items per page (1–200)'),
      q: z.string().optional().describe('Search by name, email, or identification number'),
      email: z.string().optional().describe('Filter by exact email address'),
      created_at_min: z
        .string()
        .optional()
        .describe('Filter customers created on or after this ISO 8601 datetime'),
      created_at_max: z
        .string()
        .optional()
        .describe('Filter customers created on or before this ISO 8601 datetime'),
      since_id: z
        .number()
        .int()
        .optional()
        .describe('Return customers with ID greater than this value'),
    },
    async (args) => {
      const { page, per_page, q, email, created_at_min, created_at_max, since_id } = args as {
        page: number;
        per_page: number;
        q?: string;
        email?: string;
        created_at_min?: string;
        created_at_max?: string;
        since_id?: number;
      };

      const qs = buildQueryString({
        page,
        per_page,
        q,
        email,
        created_at_min,
        created_at_max,
        since_id,
      });
      const raw = await client.request<CustomerResource[]>('GET', `/customers${qs}`);
      const items = raw.map(curateCustomer);
      return toolResponse(wrapPaginated(items, page, per_page));
    },
  );

  // -----------------------------------------------------------------------
  // get_customer
  // -----------------------------------------------------------------------
  server.tool(
    'get_customer',
    'Get full details for a single customer by ID, including addresses, billing info, ' +
      'identification, and order history metadata. Use list_customers to find customer IDs.',
    {
      id: z.number().int().describe('Customer ID'),
    },
    async (args) => {
      const { id } = args as { id: number };
      const data = await client.get(`/customers/${id}`);
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // create_customer
  // -----------------------------------------------------------------------
  server.tool(
    'create_customer',
    'Create a new customer in the store. name is required. ' +
      'email and phone are optional but recommended for order communication. ' +
      'Use send_email_invite: true to send a store invitation email to the customer.',
    {
      name: z.string().min(1).describe('Customer full name (required)'),
      email: z.string().optional().describe('Customer email address'),
      phone: z.string().optional().describe('Customer phone number'),
      identification: z
        .string()
        .optional()
        .describe('Customer identification number (CPF, CNPJ, or other)'),
      send_email_invite: z
        .boolean()
        .optional()
        .describe('Whether to send a store invitation email to the customer (default: false)'),
    },
    async (args) => {
      const { name, email, phone, identification, send_email_invite } = args as {
        name: string;
        email?: string;
        phone?: string;
        identification?: string;
        send_email_invite?: boolean;
      };

      const body: Record<string, unknown> = { name };
      if (email !== undefined) body['email'] = email;
      if (phone !== undefined) body['phone'] = phone;
      if (identification !== undefined) body['identification'] = identification;
      if (send_email_invite !== undefined) body['send_email_invite'] = send_email_invite;

      const data = await client.post('/customers', body);
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // update_customer
  // -----------------------------------------------------------------------
  server.tool(
    'update_customer',
    'Update an existing customer. Only provided fields will be changed (partial update). ' +
      'Returns the full updated customer resource.',
    {
      id: z.number().int().describe('Customer ID to update'),
      name: z.string().optional().describe('Updated customer full name'),
      email: z.string().optional().describe('Updated email address'),
      phone: z.string().optional().describe('Updated phone number'),
      identification: z
        .string()
        .optional()
        .describe('Updated identification number (CPF, CNPJ, or other)'),
      active: z.boolean().optional().describe('Whether the customer account is active'),
    },
    async (args) => {
      const { id, name, email, phone, identification, active } = args as {
        id: number;
        name?: string;
        email?: string;
        phone?: string;
        identification?: string;
        active?: boolean;
      };

      const body: Record<string, unknown> = {};
      if (name !== undefined) body['name'] = name;
      if (email !== undefined) body['email'] = email;
      if (phone !== undefined) body['phone'] = phone;
      if (identification !== undefined) body['identification'] = identification;
      if (active !== undefined) body['active'] = active;

      const data = await client.put(`/customers/${id}`, body);
      return toolResponse(data);
    },
  );

  // -----------------------------------------------------------------------
  // delete_customer
  // -----------------------------------------------------------------------
  server.tool(
    'delete_customer',
    'Permanently delete a customer from the store. ' +
      'Customers with associated orders cannot be deleted — the API will return an error in that case. ' +
      'Call without confirm first to preview customer details. ' +
      'Then call again with confirm: true to execute the deletion. This action cannot be undone.',
    {
      id: z.number().int().describe('Customer ID to delete'),
      confirm: z
        .boolean()
        .optional()
        .describe(
          'Set to true to confirm deletion. Omit or set to false to preview customer details before deleting.',
        ),
    },
    async (args) => {
      const { id, confirm } = args as { id: number; confirm?: boolean };

      if (!confirm) {
        const customer = await client.get<CustomerResource>(`/customers/${id}`);
        return toolResponse({
          warning:
            `This will permanently delete customer "${customer.name}" ` +
            `(${customer.email ?? 'no email'}). This action cannot be undone. ` +
            `Customers with associated orders cannot be deleted.`,
          resource: {
            id: customer.id,
            name: customer.name,
            email: customer.email ?? null,
          },
          confirm_required: true,
          hint: 'Call delete_customer again with confirm: true to proceed.',
        });
      }

      await client.del(`/customers/${id}`);
      return toolResponse({ deleted: true, id });
    },
  );
}
