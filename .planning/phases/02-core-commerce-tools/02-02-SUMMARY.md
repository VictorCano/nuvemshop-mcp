---
phase: 02-core-commerce-tools
plan: "02"
subsystem: tools
tags: [mcp-tools, products, variants, tdd, bulk-operations]
dependency_graph:
  requires: [02-01]
  provides: [product-tools, variant-tools]
  affects: [02-03, 02-04]
tech_stack:
  added: []
  patterns: [tool-registration-pattern, confirm-guard-pattern, i18n-flatten, paginated-wrapping, bulk-patch]
key_files:
  created:
    - src/tools/products.ts
    - tests/tools/products.test.ts
  modified:
    - src/index.ts
    - tests/index.test.ts
decisions:
  - "list_products curates fields (id, flattened name, published, variant_count, price_range, sku, updated_at) rather than returning raw API response"
  - "bulk_update_stock_price adds runtime length validation (1-50 items) in handler since MCP SDK validates Zod schema before calling handler"
  - "price_range min/max computed from float-parsed variant prices with fallback to first variant price string"
metrics:
  duration: "~3 min"
  completed_date: "2026-03-14"
  tasks_completed: 1
  files_changed: 4
---

# Phase 2 Plan 2: Product and Variant Tools Summary

**One-liner:** 10 product/variant MCP tools (list, get, get-by-SKU, CRUD, bulk stock/price) with confirm guards on deletes and curated list response.

## What Was Built

### src/tools/products.ts

`registerProductTools(server, client)` registers 10 MCP tools:

- `list_products` — paginated product listing with 9 optional filters (q, category_id, published, sort_by, created_at_min/max, min/max_stock); returns curated shape: id, flattened name, published, variant_count, price_range {min, max}, first variant sku, updated_at
- `get_product` — full API response by product ID (no field curation)
- `get_product_by_sku` — calls `GET /products/sku/{sku}`, returns full product
- `create_product` — POST with name (required), description, published, price, variants, categories, images
- `update_product` — PUT with partial fields
- `delete_product` — confirm guard: no confirm fetches product to show name + variant_count in warning; confirm:true calls del
- `create_variant` — POST to `/products/{product_id}/variants` with price (required), values, sku, stock, weight, dimensions
- `update_variant` — PUT to `/products/{product_id}/variants/{variant_id}`
- `delete_variant` — confirm guard with SKU + price in warning; confirm:true deletes
- `bulk_update_stock_price` — PATCH `/products/stock-price` with array body (1-50 items), runtime validation enforced

### src/index.ts (updated)

Added `registerProductTools` import and call in the tool registration block alongside existing store-categories, orders, and fulfillment tools.

### tests/index.test.ts (auto-fix)

Added `vi.mock('../src/tools/products.js')` to prevent the mock server from throwing when `registerProductTools` tries to call `server.tool()` on the mock.

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| tests/tools/products.test.ts | 17 | PASS |
| Full suite | 119 | PASS |

`npx tsc --noEmit` — clean compile.

## Commits

| Hash | Description |
|------|-------------|
| 62d48c9 | test(02-02): add failing tests for product/variant tools (RED) |
| 53df741 | feat(02-02): implement product/variant tools and wire index.ts (GREEN) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed index.test.ts missing mock for products module**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** After wiring `registerProductTools` into index.ts, `tests/index.test.ts` failed with `Cannot read properties of undefined (reading 'tool')` because the mock server object doesn't have a real `tool` method and `registerProductTools` calls it directly.
- **Fix:** Added `vi.mock('../src/tools/products.js', () => ({ registerProductTools: vi.fn() }))` to tests/index.test.ts, same pattern already used for store-categories, fulfillment, and orders.
- **Files modified:** tests/index.test.ts
- **Commit:** 53df741

**2. [Rule 2 - Missing validation] Added runtime length check in bulk_update_stock_price handler**
- **Found during:** Task 1 (GREEN phase) — test for empty array rejection
- **Issue:** The Zod `.min(1).max(50)` constraint on the `products` array is enforced by the MCP SDK before calling the handler, but in unit tests the handler is called directly, bypassing Zod. The test expects the handler to reject an empty array.
- **Fix:** Added explicit `if (!Array.isArray(products) || products.length < 1 || products.length > 50)` guard in the handler to enforce the constraint at runtime as well.
- **Files modified:** src/tools/products.ts
- **Commit:** 53df741

## Self-Check: PASSED
