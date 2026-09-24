# Architecture

## Current Shape

- Kind: a runnable shell exists. No point-of-sale behavior is implemented.
- Stack: Tauri 2 desktop shell; React 19 with TypeScript, Vite, and Tailwind 4; SQLite; pnpm.
- Deployment: one Windows PC in a single store, developed on macOS. Local-first, offline-capable.
  macOS renders the app with WebKit and Windows with Chromium-based WebView2, so behavior verified
  on the development machine is not verified for the till.
- Cloud: none. Sync is the stated destination but is deferred past the current milestone.

## System Map

Only what exists is recorded here. Layers get documented when the code needs them.

- `src/` — React till interface. `App.tsx` renders an empty counter screen and reports database
  state.
- `src/lib/database.ts` — the only seam that opens the database. Everything reaching SQLite goes
  through it, so schema, migrations, and a future sync engine have one place to attach.
- `src-tauri/` — Rust shell. `lib.rs` registers `tauri-plugin-sql` and nothing else; the demo
  `greet` command and `tauri-plugin-opener` were removed rather than left as scaffolding.
- Database file: resolved by the SQL plugin from the `sqlite:steward.db` URL into the app's data
  directory. On the macOS development machine that is
  `~/Library/Application Support/com.christianrazul.steward/steward.db`. The plugin resolves the
  directory with `app_config_dir()`, confirmed in its source, which on Windows is
  `%APPDATA%\com.christianrazul.steward\`. Not yet observed on a Windows machine.
- No server, no cloud component, no second terminal, and no schema yet.

Planned till behavior — catalog search, cart, discount application, cash tender, sale completion —
is specified in the project brief and not yet built.

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

## Database Access

Decided in the [cart and cash sale spec](../specs/2026-09-24-cart-and-cash-sale.md) after reading
the source of tauri-plugin-sql 2.4.1:

- Reads and single-statement writes go through the SQL plugin from TypeScript.
- Writes that must succeed together, such as a sale or a product with its starting count, are Rust
  commands in `lib.rs` that borrow the plugin's pool (`DbInstances`) and run one transaction. The
  plugin has no transaction API, and each of its calls borrows its own pooled connection.
- Money rules live in TypeScript only. Rust commands write the amounts they are given.
- The plugin binds every JavaScript number as a float and every boolean as JSON text. Money stays
  exact because INTEGER columns store whole-number floats as integers; flags are passed as 0 and 1
  and checked by the schema.
- sqlx-sqlite 0.8.6, underneath the plugin, turns foreign keys on for every pooled connection and
  leaves the journal mode and sync setting at SQLite's defaults: a rollback journal with full
  sync, so a committed sale survives a power cut. Confirmed in its source; validated at runtime.
- Constraints on append-only tables stay limited to rules that will not change. Changing one means
  rebuilding the table around its protective triggers, so anything likely to grow, such as movement
  reasons, lives in a lookup table or an index.

## Boundary Rule

For each load-bearing boundary, record:

- What it owns.
- Its public interface.
- Allowed dependencies.
- Relevant validation command.

If a boundary must stay true, enforce it mechanically.
