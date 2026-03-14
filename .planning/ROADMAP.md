# Roadmap: Nuvemshop MCP Server

## Overview

Build a TypeScript MCP server that wraps the Nuvemshop/Tiendanube e-commerce API and publishes it to npm. Work proceeds foundation-first: the transport, authentication, and error-handling skeleton must be solid before any tool implementation begins. Core commerce tools (products, categories, orders, fulfillment) come next as a cohesive dependency chain, followed by the remaining customer and marketing tools, and finally the CI/CD pipeline and npm release that make the package publicly consumable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Secure MCP skeleton with auth, dual transports, error handling, and dev tooling (completed 2026-03-14)
- [ ] **Phase 2: Core Commerce Tools** - Product, category, order, fulfillment, and store tools
- [ ] **Phase 3: Customer and Marketing Tools** - Customer CRUD and coupon tools
- [ ] **Phase 4: Release and CI/CD** - npm package, GitHub Actions, and Portuguese README

## Phase Details

### Phase 1: Foundation
**Goal**: A working MCP server that connects via stdio and Streamable HTTP, authenticates to the Nuvemshop API, handles errors and rate limits correctly, and enforces credential safety — zero business tools registered yet, but the full stack is proven
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06
**Success Criteria** (what must be TRUE):
  1. MCP server starts, reads USER_ACCESS_TOKEN and STORE_ID from env vars, and exits with a clear error message if either is missing
  2. An MCP client (e.g., Claude Desktop) can connect to the server over stdio and receive a valid tool list response (even if the list is empty)
  3. An HTTP client can connect to the server over Streamable HTTP and receive a valid MCP response
  4. Any Nuvemshop API error returns a structured message including HTTP status code, error detail, and a retry hint — no raw stack traces
  5. The server produces zero stdout output in stdio mode; all diagnostic output goes to stderr
**Plans**: 3 plans

Plans:
- [x] 01-01: Project scaffold, TypeScript config, ESLint, Husky, detect-secrets hook
- [x] 01-02: NuvemshopClient (auth injection, User-Agent, error normalization, rate-limit retry, pagination helpers)
- [x] 01-03: MCP server core — stdio transport, Streamable HTTP transport, logger abstraction

### Phase 2: Core Commerce Tools
**Goal**: A developer can ask their AI assistant to manage the complete product catalog and order lifecycle against their Nuvemshop store
**Depends on**: Phase 1
**Requirements**: PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, PROD-06, PROD-07, PROD-08, PROD-09, PROD-10, CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, ORD-01, ORD-02, ORD-03, ORD-04, ORD-05, FULF-01, FULF-02, FULF-03, FULF-04, STOR-01
**Success Criteria** (what must be TRUE):
  1. A developer can ask the AI to list, create, update, and delete products and variants (including bulk stock/price update) and receive correct results
  2. A developer can look up a product by SKU through the AI and get back the matching product
  3. A developer can ask the AI to list, create, update, and delete categories and receive correct results
  4. A developer can ask the AI to list, filter, get, close, reopen, and cancel orders
  5. A developer can ask the AI to list fulfillment orders and add a tracking event to a fulfillment order
  6. A developer can ask the AI for store information (name, currency, language, plan) and receive accurate data
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md — Shared tool utilities, client PATCH fix, store info + category tools (STOR-01, CAT-01..05)
- [ ] 02-02-PLAN.md — Product and variant tools (PROD-01..10)
- [ ] 02-03-PLAN.md — Order tools (ORD-01..05)
- [ ] 02-04-PLAN.md — Fulfillment tools (FULF-01..04)

### Phase 3: Customer and Marketing Tools
**Goal**: A developer can manage customers and run basic marketing campaigns (coupons) through their AI assistant
**Depends on**: Phase 2
**Requirements**: CUST-01, CUST-02, CUST-03, CUST-04, CUST-05, MKTG-01, MKTG-02
**Success Criteria** (what must be TRUE):
  1. A developer can ask the AI to list, get, create, update, and delete customers and receive correct results
  2. A developer can ask the AI to list existing coupons and create a new coupon
**Plans**: TBD

Plans:
- [ ] 03-01: Customer tools (CUST-01..05)
- [ ] 03-02: Coupon tools (MKTG-01..02)

### Phase 4: Release and CI/CD
**Goal**: The package is published to npm and protected by automated CI checks that prevent broken or insecure releases
**Depends on**: Phase 3
**Requirements**: INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, INFR-06
**Success Criteria** (what must be TRUE):
  1. `npm install nuvemshop-mcp` succeeds and the installed package contains no credentials or .planning files
  2. A pull request to main triggers GitHub Actions that run lint and tests, and the PR cannot merge if either fails
  3. Merging to main triggers a GitHub Actions workflow that publishes a new semver version to npm via OIDC (no stored npm token in GitHub secrets)
  4. The README is written in Portuguese (Brazil) and includes a prominent AI-built disclaimer
  5. The develop branch exists and main contains only release commits (no direct development commits)
**Plans**: TBD

Plans:
- [ ] 04-01: develop/main branch strategy, package.json files whitelist, README in Portuguese (BR) with AI disclaimer
- [ ] 04-02: GitHub Actions PR checks workflow (lint, tests)
- [ ] 04-03: GitHub Actions npm release workflow (OIDC publish on merge to main)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete   | 2026-03-14 |
| 2. Core Commerce Tools | 1/4 | In Progress|  |
| 3. Customer and Marketing Tools | 0/2 | Not started | - |
| 4. Release and CI/CD | 0/3 | Not started | - |
