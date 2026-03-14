# Requirements: Nuvemshop MCP Server

**Defined:** 2026-03-14
**Core Value:** A developer can connect their AI assistant to their Nuvemshop store and perform any standard store management operation without leaving their IDE or chat interface.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: MCP server initializes with `USER_ACCESS_TOKEN` and `STORE_ID` from environment variables
- [x] **FOUND-02**: MCP server communicates over stdio transport (JSON-RPC)
- [x] **FOUND-03**: MCP server communicates over Streamable HTTP transport
- [x] **FOUND-04**: All list tools support pagination with `page` and `per_page` parameters (default 20)
- [x] **FOUND-05**: API errors return actionable messages including status code, error detail, and retry hint
- [x] **FOUND-06**: No stdout logging in stdio mode (stderr only) to prevent JSON-RPC corruption

### Products

- [x] **PROD-01**: User can list products with filtering and pagination
- [x] **PROD-02**: User can get a product by ID
- [x] **PROD-03**: User can get a product by SKU
- [x] **PROD-04**: User can create a product
- [x] **PROD-05**: User can update a product
- [x] **PROD-06**: User can delete a product
- [x] **PROD-07**: User can create a variant for a product
- [x] **PROD-08**: User can update a variant
- [x] **PROD-09**: User can delete a variant
- [x] **PROD-10**: User can bulk update stock and prices for up to 50 variants

### Categories

- [x] **CAT-01**: User can list categories
- [x] **CAT-02**: User can get a category by ID
- [x] **CAT-03**: User can create a category
- [x] **CAT-04**: User can update a category
- [x] **CAT-05**: User can delete a category

### Orders

- [x] **ORD-01**: User can list orders with filtering and pagination
- [x] **ORD-02**: User can get an order by ID
- [x] **ORD-03**: User can close an order
- [x] **ORD-04**: User can reopen an order
- [x] **ORD-05**: User can cancel an order

### Fulfillment

- [x] **FULF-01**: User can list fulfillment orders for an order
- [x] **FULF-02**: User can get a fulfillment order by ID
- [x] **FULF-03**: User can update fulfillment order status
- [x] **FULF-04**: User can add tracking events to a fulfillment order

### Customers

- [x] **CUST-01**: User can list customers with filtering and pagination
- [x] **CUST-02**: User can get a customer by ID
- [x] **CUST-03**: User can create a customer
- [x] **CUST-04**: User can update a customer
- [x] **CUST-05**: User can delete a customer

### Marketing

- [x] **MKTG-01**: User can list coupons
- [x] **MKTG-02**: User can create a coupon

### Store

- [x] **STOR-01**: User can get store information (name, currency, language, plan)

### Infrastructure

- [x] **INFR-01**: npm package published as `nuvemshop-mcp` with semver starting at 0.0.1
- [x] **INFR-02**: README in Portuguese (Brazil) with AI-built disclaimer
- [x] **INFR-03**: Husky pre-commit hooks running tests and detect-secrets
- [x] **INFR-04**: GitHub Actions workflow for PR checks (lint, tests)
- [x] **INFR-05**: GitHub Actions workflow for npm release on merge to main
- [x] **INFR-06**: develop/main branch strategy (no master branch)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Authentication

- **AUTH-01**: Full OAuth2 authorization flow for production app integration

### Webhooks

- **WEBH-01**: User can list webhooks
- **WEBH-02**: User can create a webhook
- **WEBH-03**: User can delete a webhook

### Marketing

- **MKTG-03**: User can update a coupon
- **MKTG-04**: User can delete a coupon

### Data Model

- **DATA-01**: User can manage custom fields and metafields for products
- **DATA-02**: User can manage custom fields for orders and customers

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time webhook listener | Requires persistent server process; not an MCP pattern |
| Multi-store sessions | Auth is per-store; run multiple MCP instances instead |
| Raw API passthrough tool | Poor LLM performance; purpose-built tools are better |
| Bulk operations (10K+) | Rate-limited by Nuvemshop; use batch endpoint for up to 50 |
| Binary file upload | LLMs handle URLs better; Nuvemshop accepts image URLs natively |
| Admin/billing management | High-risk with no rollback; use Nuvemshop dashboard |
| Mobile app | Web/CLI-first |
| App marketplace listing | Just the npm package for now |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Complete |
| PROD-01 | Phase 2 | Complete |
| PROD-02 | Phase 2 | Complete |
| PROD-03 | Phase 2 | Complete |
| PROD-04 | Phase 2 | Complete |
| PROD-05 | Phase 2 | Complete |
| PROD-06 | Phase 2 | Complete |
| PROD-07 | Phase 2 | Complete |
| PROD-08 | Phase 2 | Complete |
| PROD-09 | Phase 2 | Complete |
| PROD-10 | Phase 2 | Complete |
| CAT-01 | Phase 2 | Complete |
| CAT-02 | Phase 2 | Complete |
| CAT-03 | Phase 2 | Complete |
| CAT-04 | Phase 2 | Complete |
| CAT-05 | Phase 2 | Complete |
| ORD-01 | Phase 2 | Complete |
| ORD-02 | Phase 2 | Complete |
| ORD-03 | Phase 2 | Complete |
| ORD-04 | Phase 2 | Complete |
| ORD-05 | Phase 2 | Complete |
| FULF-01 | Phase 2 | Complete |
| FULF-02 | Phase 2 | Complete |
| FULF-03 | Phase 2 | Complete |
| FULF-04 | Phase 2 | Complete |
| STOR-01 | Phase 2 | Complete |
| CUST-01 | Phase 3 | Complete |
| CUST-02 | Phase 3 | Complete |
| CUST-03 | Phase 3 | Complete |
| CUST-04 | Phase 3 | Complete |
| CUST-05 | Phase 3 | Complete |
| MKTG-01 | Phase 3 | Complete |
| MKTG-02 | Phase 3 | Complete |
| INFR-01 | Phase 4 | Complete |
| INFR-02 | Phase 4 | Complete |
| INFR-03 | Phase 4 | Complete |
| INFR-04 | Phase 4 | Complete |
| INFR-05 | Phase 4 | Complete |
| INFR-06 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after roadmap creation*
