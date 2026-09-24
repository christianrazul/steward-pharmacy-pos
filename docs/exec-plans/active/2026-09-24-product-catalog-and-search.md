# Product Catalog and Search

## Goal

Deliver the approved [product catalog and search spec](../../specs/2026-09-21-product-catalog-and-search.md)
as three vertical tickets, each demoable on its own.

## Acceptance Criteria

The twelve acceptance criteria in the spec, split across the tickets below. A ticket is done when
its listed criteria pass with the network disconnected.

## Context Links

- [Spec](../../specs/2026-09-21-product-catalog-and-search.md)
- [Project brief](../../project-brief.md)
- [Architecture](../../architecture/index.md)
- [Quality](../../quality.md)
- [Issue tracker](../../issue-tracker.md)

## Steps

### 1. Add and search products with starting counts

- Issue: [#1](https://github.com/christianrazul/steward-pharmacy-pos/issues/1).
- Blocked by: nothing.
- Delivers: add a product with its starting count, then find it by typing any mix of generic name,
  brand name, strength or dosage form, and see its price and quantity on hand.
- Spec criteria: 1–4, 6–8, 11, 12.
- Groundwork: Vitest; schema migrations under `src-tauri/migrations/` registered in `lib.rs`; the
  `products`, `stock_movements` and `stock_movement_reasons` tables, with triggers rejecting UPDATE
  and DELETE on stock history; a Rust command that adds a product and its starting count in one
  transaction; flags stored as 0 and 1; confirming that foreign keys hold on every pooled
  connection and which `sql:` permission allows writes.
- Fallback split if it proves too large: adding products, then searching them.

### 2. Edit product details

- Issue: [#2](https://github.com/christianrazul/steward-pharmacy-pos/issues/2).
- Blocked by: 1.
- Delivers: open a product from search, correct its details, and see the change in search. Stock
  is not touched.
- Spec criteria: 5.
- Builds the product screen reached from search results, which ticket 3 extends.

### 3. Correct stock with a counted total

- Issue: [#3](https://github.com/christianrazul/steward-pharmacy-pos/issues/3).
- Blocked by: 2.
- Delivers: enter a counted total and a reason for a product. Quantity on hand becomes that total,
  and the history records the difference.
- Spec criteria: 9, 10.
- Implementation: the correction is one `INSERT … SELECT` statement, which is atomic on its own.

## Validation

Risk lane: Critical, per the spec. Every ticket also runs `./scripts/check-sonata.sh` and the
Skylos gate.

1. Vitest for pesos to centavos, search word matching, and `%` and `_` treated literally. In the
   running app: add products, including one counted at 0, search for them, read the rows back with
   `sqlite3`, and confirm the database refuses edits and deletes of stock history.
2. In the running app: edit a product, then confirm its `updated_at` changed and its stock history
   did not.
3. Vitest for the difference calculation, including a recount with no change and a count down
   to 0. In the running app: correct stock and confirm exactly one new history row with the right
   change and reason.

## Decision Log

- 2026-09-24: Three tickets, approved. Ticket 3 is blocked by ticket 2 rather than only ticket 1,
  so the product screen reached from search is built once and extended, not built twice.
- 2026-09-24: Ticket 1 kept whole despite carrying all the groundwork, because search is the only
  way anyone sees products. Splitting it would require a throwaway product list.

- 2026-09-24: Amended by the cart and cash sale spec. Adding a product runs in a Rust transaction
  command, because the SQL plugin cannot make two inserts atomic. Movement reasons moved to a
  lookup table so later milestones can add codes without rebuilding an append-only table.

## Progress Log

- 2026-09-24: Plan approved. Issues #1, #2 and #3 published to GitHub in blocker order. No ticket
  started.
