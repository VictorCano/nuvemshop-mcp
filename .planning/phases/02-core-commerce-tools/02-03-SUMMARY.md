---
phase: 02-core-commerce-tools
plan: "03"
subsystem: tools
tags: [mcp-tools, orders, tdd, confirm-guard, pagination, filters]
dependency_graph:
  requires: [02-01]
  provides: [order-tools]
  affects: []
tech_stack:
  added: []
  patterns: [tool-registration-pattern, confirm-guard-pattern, curated-response, paginated-wrapping]
key_files:
  created:
    - src/tools/orders.ts
    - tests/tools/orders.test.ts
  modified:
    - src/index.ts
    - tests/index.test.ts
decisions:
  - "cancel_order confirm guard: no confirm fetches order to show number, status, and total in warning"
  - "list_orders returns curated shape (id, number, status, payment/shipping status, total, currency, customer id+name, created_at) to reduce payload"
  - "close_order and reopen_order execute immediately — no confirm guard since they are reversible"
  - "cancel_order defaults restock and notify_customer to false; reason is optional"
metrics:
  duration: "~2 min"
  completed_date: "2026-03-14"
  tasks_completed: 1
  files_changed: 4
---

# Phase 2 Plan 3: Order Tools Summary

**One-liner:** Five order MCP tools (list, get, close, reopen, cancel) with full filter support and a confirm guard on the irreversible cancel action.

## What Was Built

### src/tools/orders.ts

`registerOrderTools(server, client)` registers 5 MCP tools:

- `list_orders` — GETs `/orders` with buildQueryString for all filters: `status`, `payment_status`, `shipping_status`, `created_at_min`, `created_at_max`, `updated_at_min`, `updated_at_max`, `customer_id`. Returns curated shape wrapped in `wrapPaginated`.
- `get_order` — full resource by ID via `client.get('/orders/{id}')`
- `close_order` — calls `client.post('/orders/{id}/close', {})`, reversible (description cross-references `reopen_order`)
- `reopen_order` — calls `client.post('/orders/{id}/open', {})`, reversible (description cross-references `close_order`)
- `cancel_order` — confirm guard: without `confirm` fetches order and returns warning with `order.number`, `order.status`, `order.total`; with `confirm: true` calls `client.post('/orders/{id}/cancel', { restock, notify_customer, reason })`

**Curated list_orders shape:**
```typescript
{ id, number, status, payment_status, shipping_status, total, currency,
  customer: { id, name }, created_at }
```

**cancel_order params:** `id`, `confirm?`, `restock?` (default false), `notify_customer?` (default false), `reason?`

### src/index.ts (updated)

Added `registerOrderTools` import and call. Also cleaned up Wave 2 comments (products and fulfillment were already wired in by plans 02-02 and 02-04).

### tests/index.test.ts (updated)

Added `vi.mock('../src/tools/orders.js', ...)` to prevent the mock server (which lacks `tool()`) from being called during index.ts routing tests.

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| tests/tools/orders.test.ts | 15 | PASS |
| Full suite | 119 | PASS |

`npx tsc --noEmit` — clean compile.

## Commits

| Hash | Description |
|------|-------------|
| 067ee86 | test(02-03): add failing tests for order tools (RED) |
| be5684c | feat(02-03): implement order tools and wire index.ts (GREEN) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed index.test.ts missing mock for orders.js**
- **Found during:** Task 1 (GREEN phase, full test suite)
- **Issue:** After wiring `registerOrderTools` in index.ts, the `startHttp` routing test failed with `Cannot read properties of undefined (reading 'tool')` because the mock server doesn't implement `tool()` and the `vi.mock` for orders.js was missing.
- **Fix:** Added `vi.mock('../src/tools/orders.js', () => ({ registerOrderTools: vi.fn() }))` to index.test.ts. The linter (lint-staged) also detected and added the missing products.js mock simultaneously.
- **Files modified:** tests/index.test.ts
- **Commit:** be5684c

## Self-Check: PASSED

All key files found. Both task commits verified in git history.
