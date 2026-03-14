# Nuvemshop MCP Server

## What This Is

An MCP (Model Context Protocol) server that connects AI assistants like Claude and Cursor to the Nuvemshop/Tiendanube e-commerce API. A developer adds this MCP to their AI tool and manages their Nuvemshop store — products, orders, customers, and store settings — through natural language.

## Core Value

A developer can connect their AI assistant to their Nuvemshop store and perform any standard store management operation without leaving their IDE or chat interface.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] MCP server exposing Nuvemshop API as tools via stdio and streamable HTTP transports
- [ ] Products & Variants: CRUD for products, variants, images, categories
- [ ] Orders & Fulfillment: orders, transactions, shipping, fulfillment
- [ ] Customers: customer management, addresses, segments
- [ ] Store & Config: store settings, themes, scripts, webhooks
- [ ] Authentication via environment variable (access_token + store_id)
- [ ] Full OAuth2 authorization flow for production apps
- [ ] Credential safety: detect-secrets pre-commit hook, no secrets in repo
- [ ] TypeScript codebase with linting and tests
- [ ] Husky pre-commit hooks running tests and secret detection
- [ ] Published to npm as `nuvemshop-mcp` with semver (starting 0.0.1)
- [ ] README in Portuguese (Brazil)
- [ ] AI-built disclaimer in README and package metadata
- [ ] ./dev folder gitignored for local development
- [ ] Git branching: develop (active dev) and main (releases only)
- [ ] GitHub Actions: PR checks (tests, lint) before merge to main
- [ ] GitHub Actions: merge to main triggers npm release

### Out of Scope

- Mobile or web UI — this is a CLI/MCP server only
- Nuvemshop app marketplace listing — just the npm package for now
- Real-time webhook listener — MCP exposes API tools, doesn't run a persistent webhook server
- Multi-store management in a single session — one store per connection

## Context

- Nuvemshop (Tiendanube in Spanish-speaking markets) is the largest e-commerce platform in Latin America
- API docs: https://dev.nuvemshop.com.br/docs/applications/overview
- MCP is a protocol by Anthropic for connecting AI assistants to external tools
- Project is ~90% AI-built and this must be disclosed
- Repository is public — all credential handling must be airtight
- Commits may note AI co-authorship but must not mention "Claude" by name
- CLAUDE.md and AI settings files must be preserved throughout development
- .planning/ directory is gitignored (local-only planning docs)

## Constraints

- **Language**: TypeScript — entire codebase
- **Development language**: English (code, comments, commits)
- **Documentation language**: README in Portuguese (Brazil)
- **Package manager**: npm
- **Versioning**: Semantic versioning, starting at 0.0.1
- **Branching**: develop branch for active work, main for releases (no master branch)
- **Security**: detect-secrets for pre-commit secret scanning; public repo
- **Testing**: Tests enforced via husky pre-commit hooks
- **AI disclosure**: README must state project is ~90% AI-built

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| stdio + streamable HTTP transports | stdio for local AI tools, HTTP for newer MCP spec and remote clients | — Pending |
| detect-secrets for credential safety | Industry-standard, works as pre-commit hook, public repo demands it | — Pending |
| Unscoped npm name `nuvemshop-mcp` | Simple, discoverable, no org scope needed | — Pending |
| Both env token and OAuth auth | Env token for quick dev setup, OAuth for production app integration | — Pending |
| develop/main branching | Separate active dev from releases, main triggers npm publish | — Pending |
| .planning/ gitignored | Planning docs are local-only, not shipped with the package | — Pending |

---
*Last updated: 2026-03-14 after initialization*
