# Cart and Cash Sale

Status: approved for implementation.

The rest of milestone 1 after finding a product (see the [project brief](../project-brief.md)): the
cart, VAT, the senior citizen and PWD discount, cash tender, and the sale record. Tracked as
[#4](https://github.com/christianrazul/steward-pharmacy-pos/issues/4), blocked by #1. It builds on
the [product catalog and search spec](2026-09-21-product-catalog-and-search.md).

## Decisions

### The cart holds one line per product

Adding a product already in the cart raises that line's quantity. Quantity is a whole number of 1
or more, and a line can be removed.

Rejected: a new line per add, which lists one product several times.

### The discount is one switch for the whole sale

Turning on "Senior citizen / PWD" applies the discount to every discount-eligible line in the
sale. Lines whose product is not discount-eligible are unaffected.

Rejected: a switch per line, which multiplies taps and chances to miss one.

Known cost: a senior buying for someone else in the same visit is rung up as two sales.

### A discounted sale records the customer's ID number and name

Business call. The discount applies only after the cashier enters the customer's ID number and
name, since discounted sales normally need them on record.

This is the first personal data in the database. From milestone 2 it also travels into the
cloud-synced backups.

Rejected: no capture, which leaves discounted sales without the record the store keeps today.

### Amounts are computed per line and rounded half up to the centavo

Each line stores five amounts, all integer centavos. Gross is unit price times quantity.
"Discounted" means the sale's discount switch is on and the product is discount-eligible.

| Line kind | VAT-able base | VAT | Exempt base | Discount | Due |
|---|---|---|---|---|---|
| VAT-able, not discounted | round(gross ÷ 1.12) | gross − VAT-able base | 0 | 0 | gross |
| VAT-able, discounted | 0 | 0 | round(gross ÷ 1.12) | round(exempt base × 20%) | exempt base − discount |
| VAT-exempt, not discounted | 0 | 0 | gross | 0 | gross |
| VAT-exempt, discounted | 0 | 0 | gross | round(gross × 20%) | gross − discount |

Sale totals are sums of line amounts, so the record always adds up. Rounding uses integer
arithmetic only, never floating point.

Worked examples:

- ₱112.00 VAT-able, discounted: exempt base ₱100.00, discount ₱20.00, due ₱80.00.
- ₱100.00 VAT-exempt, discounted: discount ₱20.00, due ₱80.00.
- ₱11.34 VAT-able, not discounted: ₱11.34 ÷ 1.12 is exactly ₱10.125, which rounds half up to
  ₱10.13, so the VAT is ₱1.21.

Rejected: rounding once for the whole sale, which lets the displayed lines disagree with the
total. Known cost: per-line rounding can differ from whole-sale rounding by a centavo on a large
cart.

### Money rules live in TypeScript only

The cart computes every amount in TypeScript, where Vitest covers it, and the sale is written with
exactly those amounts.

Rejected: recomputing in Rust as a check, which means two implementations of the money rules that
can drift apart.

### Completing a sale is one atomic write, through a small Rust command

The sale, its lines and one `sale` stock movement per line are written together or not at all. A
partial write would leave the ledger disagreeing with the sales.

tauri-plugin-sql cannot do this from TypeScript. Its source (version 2.4.1) shows a connection pool
with default settings and no transaction API: each `execute` call borrows its own connection, so a
BEGIN and a COMMIT sent as separate calls can land on different connections. The plugin does
publicly expose its pool (`DbInstances`, `DbPool::sqlite()`), so a Rust command in `lib.rs`
borrows it and runs a real transaction. Reads and single-statement writes stay in TypeScript
through the plugin.

Rejected: separate BEGIN and COMMIT calls, for the reason above. Also rejected: an all-SQL
workaround where a trigger parses a JSON payload into several tables, which works but is hard to
test and debug. Also rejected: replacing the plugin with a Rust data layer, which rewrites far more
than this needs.

Known cost: milestone 1 contains Rust after all, and the project takes a direct `sqlx` dependency
that must stay on the same version as the plugin's.

### Selling past the count on hand is allowed, with a warning

Business call. If a sale would take on-hand below zero, the cashier sees a warning and can
continue. The item is physically at the counter, so Steward's count is what is wrong. On-hand goes
negative until a recount corrects it.

Rejected: blocking the sale, which turns a counting mistake into a lost sale.

### Sale lines keep a snapshot of the product as sold

Each line copies the product's name, strength, dosage form, unit price, VAT-exempt flag and
discount-eligible flag at the moment of sale. Products stay editable, and editing must never change
a past sale.

### Cash tendered must cover the amount due

Completion is refused until cash tendered is at least the total. Change is tendered minus total.
Tendered is typed in pesos with the same rules as prices.

### Sales are numbered in sequence

Each sale gets a readable number starting at 1, with no gaps, assigned inside the atomic write and
shown on the record. The UUID stays the primary key.

### The cart lives in memory

An unfinished cart is lost if the app closes or crashes. The customer is still at the counter, so
the cashier rings it up again.

Rejected: saving draft carts, which adds recovery states for a rare event.

### The internal sales record is shown on screen

It appears when a sale completes and can be reopened from a list of recent sales, newest first. It
shows the sale number, date and time, each line, the VAT breakdown, any discount with its ID
details, the total, cash tendered, change, and the words "Not an official receipt". Printing waits
for the receipt printer in milestone 6.

## Changes to the Approved Catalog Spec

These affect #1 and should be applied to its spec before it is built.

- **Adding a product uses the same Rust transaction command.** The product and its Starting count
  movement are two inserts that must succeed together.
- **Movement reasons live in a lookup table.** A CHECK constraint listing reason codes would force a
  rebuild of the append-only table whenever a milestone adds a code: `sale` here, `void` in
  milestone 2, `delivery` in milestone 3, transfers in milestone 7. A `stock_movement_reasons`
  table seeded by migrations lets each milestone add a code with one INSERT.
- **Flags are passed as 0 and 1, and the columns check for exactly that.** The plugin binds a
  JavaScript boolean as JSON, so `true` would be stored as the text `'true'`. A `CHECK (column IN
  (0, 1))` turns that mistake into a loud failure.
- **Foreign keys must be verified on every pooled connection.** The pragma is per connection and the
  pool opens several. sqlx is expected to enable foreign keys by default; #1 confirms it rather than
  setting the pragma once and trusting it.
- **Stock corrections (#3) need no Rust.** Computing the difference and inserting the movement fits
  in one `INSERT … SELECT` statement, which is atomic on its own.

## Acceptance Behavior

Observed with the network disconnected.

1. A product found through search can be added to the cart, and adding it again raises its
   quantity.
2. Quantity is a whole number of 1 or more, and a line can be removed.
3. Each line shows its amount due, and the cart shows the total due, both in pesos.
4. With the discount switch on, every discount-eligible line shows its VAT exemption and 20%
   discount as separate amounts, computed by the table above. Other lines are unaffected.
5. The discount cannot be applied until an ID number and name are entered.
6. A sale that takes on-hand below zero shows a warning and can still be completed.
7. Completion is refused while cash tendered is less than the total; otherwise the change is shown.
8. Completing a sale writes the sale, its lines and one `sale` movement per line in one
   transaction, and assigns the next sale number.
9. If that write fails, nothing is written and the cart is still there to retry.
10. The internal sales record appears on completion and can be reopened from recent sales.
11. Editing a product afterwards does not change any past sale.
12. Sales and sale lines cannot be updated or deleted. The database enforces this.
13. Every money amount is stored as a SQLite integer, confirmed with `typeof()`.

## Data Model

```text
sales
  id                      TEXT PRIMARY KEY   client-generated UUID
  sale_number             INTEGER NOT NULL   sequential from 1; unique through a named index
  is_discounted           INTEGER NOT NULL   0 or 1
  discount_id_number      TEXT               required when discounted
  discount_holder_name    TEXT               required when discounted
  total_due_centavos      INTEGER NOT NULL
  cash_tendered_centavos  INTEGER NOT NULL   at least total_due_centavos
  change_centavos         INTEGER NOT NULL
  created_at              TEXT NOT NULL      ISO 8601, UTC

sale_lines
  id                      TEXT PRIMARY KEY   client-generated UUID
  sale_id                 TEXT NOT NULL      references sales
  product_id              TEXT NOT NULL      references products
  product_label           TEXT NOT NULL      name, strength and form as sold
  quantity                INTEGER NOT NULL   1 or more
  unit_price_centavos     INTEGER NOT NULL   as sold
  is_vat_exempt           INTEGER NOT NULL   as sold, 0 or 1
  is_discount_eligible    INTEGER NOT NULL   as sold, 0 or 1
  vatable_base_centavos   INTEGER NOT NULL
  vat_centavos            INTEGER NOT NULL
  exempt_base_centavos    INTEGER NOT NULL
  discount_centavos       INTEGER NOT NULL
  amount_due_centavos     INTEGER NOT NULL

stock_movements, added column
  sale_line_id            TEXT               references sale_lines; set on `sale` movements
```

Triggers on `sales` and `sale_lines` reject every UPDATE and DELETE. The `sale` code is added to
`stock_movement_reasons`.

## Groundwork for Later Milestones

Decided here so that later milestones extend these tables rather than rebuild them:

- Sales are never updated, so milestone 2 records a void as its own append-only row, plus `void`
  movements that return the stock. The triggers above stay intact.
- Later milestones add nullable or defaulted columns: who rang up a sale (milestone 2), which batch
  a movement touched (milestone 3), which till made a sale (milestone 7).
- Sale-number uniqueness is a named unique index rather than an inline UNIQUE constraint. SQLite can
  drop and recreate an index without rebuilding the table, so milestone 7 can make numbering unique
  per till.
- Constraints on append-only tables stay limited to rules that will not change. Changing one later
  means rebuilding the table around its protective triggers, so anything likely to grow goes in a
  lookup table or an index.

## Validation

Risk lane: Critical. This slice computes what customers are charged.

- Vitest, table-driven, for every row of the amounts table, including an exact half such as
  ₱11.34, non-eligible lines in a discounted sale, and tender and change.
- In the running app: complete sales with and without the discount, read the rows back with
  `sqlite3`, confirm one `sale` movement per line and consecutive sale numbers, confirm UPDATE and
  DELETE on `sales` and `sale_lines` are rejected, and force a failed write to confirm nothing
  partial remains.
- `./scripts/check-sonata.sh` and the Skylos gate.

## Open Risks

- The discount formulas and rounding are recorded as understood, not yet checked against how the
  store rings up a discounted sale today.
- ID numbers and names travel into the cloud-synced backups from milestone 2.
- Negative on-hand is possible by design and relies on recounts to correct it.
- The Rust command couples the project to the plugin's `sqlx` version. Upgrading the plugin means
  checking that the two still match.
