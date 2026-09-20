# Architecture

## Current Shape

- Kind: greenfield. No application code exists yet.
- Stack: Tauri 2 desktop shell; React 19 with TypeScript, Vite, and Tailwind; SQLite; pnpm.
- Deployment: one on-premise machine in a single store. Local-first, offline-capable.
- Cloud: none. Sync is the stated destination but is deferred past the current milestone.

## System Map

Only what is decided is recorded here. Layers get documented when the code needs them.

- Till interface: catalog search, cart, discount application, cash tender, sale completion.
- Local database: SQLite on the store machine, the source of truth for catalog, sales, and stock.
- No server, no cloud component, and no second terminal exists.

## Data Decisions That Precede The Code

These three exist so that a future sync engine stays tractable. Sync is deferred; these
affordances are not.

- **Client-generated UUID primary keys.** Two offline nodes must never collide on an identifier.
- **Sales are immutable, append-only rows.** A completed sale is a fact, so it can never produce
  an update conflict. Corrections become new records, which is also why voids are a deferred
  feature rather than a mutation.
- **Stock is a ledger of movements, not a mutable quantity column.** Two tills decrementing the
  same integer offline is the one conflict that cannot be cleanly resolved, whereas summing
  movements always converges. Current stock is derived.

## Boundary Rule

For each load-bearing boundary, record:

- What it owns.
- Its public interface.
- Allowed dependencies.
- Relevant validation command.

If a boundary must stay true, enforce it mechanically.
