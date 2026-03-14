---
phase: 03-customer-and-marketing-tools
plan: "01"
subsystem: customer-tools
tags: [customers, crud, mcp-tools, tdd]
dependency_graph:
  requires:
    - 01-02-SUMMARY.md  # NuvemshopClient (request/get/post/put/del)
    - 02-01-SUMMARY.md  # store-category tools (pattern established)
  provides:
    - registerCustomerTools  # 5 customer CRUD tools
  affects:
    - src/index.ts  # wired registerCustomerTools(server, client)
tech_stack:
  added: []
  patterns:
    - curateCustomer helper for list response curation
    - confirm guard with order constraint warning in delete_customer
    - buildQueryString for all filter params
key_files:
  created:
    - src/tools/customers.ts
    - tests/tools/customers.test.ts
  modified:
    - src/index.ts
    - tests/index.test.ts
decisions:
  - delete_customer confirm guard fetches resource first, includes order constraint note in warning
  - create_customer body only includes defined optional fields (Object.fromEntries omit-undefined pattern)
  - curateCustomer uses ?? null for nullable fields (no non-null assertions per ESLint rule)
metrics:
  duration: "2 min"
  completed_date: "2026-03-14"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 03 Plan 01: Customer Tools Summary

Customer CRUD tools (list, get, create, update, delete) with full TDD coverage and server wiring.

## What Was Built

`registerCustomerTools` exports 5 MCP tools against the Nuvemshop `/customers` REST endpoint:

- **list_customers** — GET with buildQueryString (page, per_page, q, email, created_at_min/max, since_id); returns curated shape via `curateCustomer` + `wrapPaginated`
- **get_customer** — GET /customers/{id}; returns full API response via `toolResponse`
- **create_customer** — POST /customers; name required, email/phone/identification/send_email_invite optional; body only includes defined fields
- **update_customer** — PUT /customers/{id}; partial update (body only includes defined fields)
- **delete_customer** — confirm guard: without confirm fetches customer and returns warning (includes "Customers with associated orders cannot be deleted"); with confirm calls DELETE and returns `{ deleted: true, id }`

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement customer tools with tests (TDD) | 99a0b8a | src/tools/customers.ts, tests/tools/customers.test.ts |
| 2 | Wire customer tools into index.ts | dc9fad5 | src/index.ts, tests/index.test.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Mock] Added vi.mock for customers.js in index.test.ts**
- **Found during:** Task 2
- **Issue:** tests/index.test.ts was missing a `vi.mock('../src/tools/customers.js')` entry. When index.ts called `registerCustomerTools(server, client)` with the mock server object, it attempted `server.tool()` — but after `vi.resetModules()`, the mock server `{ tool: vi.fn() }` wasn't re-applied properly, causing `Cannot read properties of undefined (reading 'tool')`.
- **Fix:** Added `vi.mock('../src/tools/customers.js', () => ({ registerCustomerTools: vi.fn() }))` alongside the existing coupon/order/product mocks
- **Files modified:** tests/index.test.ts
- **Commit:** dc9fad5

## Verification

- `npm test` — 147 tests, 12 files, all passing
- `npx tsc --noEmit` — 0 errors
- `src/tools/customers.ts` exports `registerCustomerTools`
- `src/index.ts` calls `registerCustomerTools(server, client)`

## Self-Check: PASSED
