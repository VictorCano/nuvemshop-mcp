---
phase: 02-core-commerce-tools
plan: "01"
subsystem: tools
tags: [mcp-tools, store, categories, utilities, tdd]
dependency_graph:
  requires: [01-03]
  provides: [utils-layer, store-category-tools]
  affects: [02-02, 02-03, 02-04]
tech_stack:
  added: []
  patterns: [tool-registration-pattern, confirm-guard-pattern, i18n-flatten, paginated-wrapping]
key_files:
  created:
    - src/tools/utils.ts
    - src/tools/store-categories.ts
    - tests/tools/utils.test.ts
    - tests/tools/store-categories.test.ts
  modified:
    - src/client.ts
    - src/index.ts
    - tests/index.test.ts
decisions:
  - "flattenI18n returns first non-empty value from object preserving key order"
  - "buildQueryString filters undefined and null but includes 0 and false (falsy but defined)"
  - "delete_category confirm guard: no confirm fetches resource to show name in warning"
  - "index.test.ts mocks store-categories module to avoid tool() calls on mock server"
  - "Wave 2 tool registrations commented out in index.ts with clear // Wire in Wave 2: marker"
metrics:
  duration: "~5 min"
  completed_date: "2026-03-14"
  tasks_completed: 2
  files_changed: 7
---

# Phase 2 Plan 1: Shared Utilities and Store/Category Tools Summary

**One-liner:** Shared tool utilities (buildQueryString, wrapPaginated, flattenI18n, toolResponse) plus 6 store/category MCP tools wired into index.ts, with PATCH Content-Type fix in client.

## What Was Built

### src/tools/utils.ts
Four exported helpers used by all tool plans:
- `buildQueryString` — URLSearchParams-based, filters null/undefined, returns `?k=v&...` or `""`
- `wrapPaginated<T>` — wraps array with `{ results, pagination: { page, per_page, has_more } }`, `has_more` is `items.length === per_page`
- `flattenI18n` — returns first non-empty value from i18n object, plain string, or `""` for null/undefined
- `toolResponse` — `JSON.stringify` wrapper returning MCP-compatible `{ content: [{ type, text }] }`

### src/tools/store-categories.ts
`registerStoreCategoryTools(server, client)` registers 6 MCP tools:
- `get_store` — calls `client.get('/store')`, returns full response
- `list_categories` — pagination + optional parent_id filter via buildQueryString, returns wrapPaginated with flattenI18n names
- `get_category` — full resource by ID
- `create_category` — POST with name (required), description, parent
- `update_category` — PUT with optional fields
- `delete_category` — confirm guard: no confirm returns warning with resource name; confirm:true calls del

### src/client.ts (fix)
Added `PATCH` to Content-Type condition (line 56-59) so bulk stock/price updates and fulfillment status changes include the required header.

### src/index.ts (updated)
- Imports and instantiates `NuvemshopClient`
- Calls `registerStoreCategoryTools(server, client)` before transport start
- Includes commented-out `// Wire in Wave 2:` block for products/orders/fulfillment

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| tests/tools/utils.test.ts | 15 | PASS |
| tests/tools/store-categories.test.ts | 10 | PASS |
| Full suite | 79 | PASS |

`npx tsc --noEmit` — clean compile.

## Commits

| Hash | Description |
|------|-------------|
| 25cdbfe | test(02-01): add failing tests for utils helpers (RED) |
| 79f19bb | feat(02-01): implement utils helpers and fix client PATCH Content-Type (GREEN) |
| 94a3967 | test(02-01): add failing tests for store-categories tools (RED) |
| f9dda41 | feat(02-01): implement store-categories tools and wire index.ts (GREEN) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed index.test.ts mock missing tool() method**
- **Found during:** Task 2
- **Issue:** Existing test mock for `createServer()` returned `{ name: 'nuvemshop-mcp' }` without a `tool` method. After index.ts was updated to call `registerStoreCategoryTools`, tests failed with `Cannot read properties of undefined (reading 'tool')`.
- **Fix:** Updated mock to return `{ name: 'nuvemshop-mcp', tool: vi.fn() }` and added a `vi.mock` for store-categories module to prevent the mock server from being called in transport routing tests.
- **Files modified:** tests/index.test.ts
- **Commit:** f9dda41

## Self-Check: PASSED

All key files found. All 4 task commits verified in git history.
