# Product Catalog and Search

Status: approved for implementation. Amended on 2026-09-24 by the
[cart and cash sale spec](2026-09-24-cart-and-cash-sale.md); the amendments are in the data model,
implementation notes and validation below.

A slice of milestone 1 (see [project brief](../project-brief.md)): a cashier must be able to find
a product by name before anything can be added to a cart.

## Decisions

### A catalog row is one sellable piece

A row represents the smallest thing handed to a customer: one tablet, one capsule, one bottle.
Price and stock are both per piece. A product sold only as a sealed box is simply a product whose
piece is the box.

Rejected: piece and box units with a conversion factor, which puts a unit on every price, stock
movement and cart line for capability this milestone does not need. Also rejected: separate rows
for piece and box, which splits one physical stock across two rows the movement ledger could never
reconcile.

Known cost: selling a whole box at a price other than piece price times count requires migrating
to a unit model later.

### The slice covers adding, editing and searching

The pharmacist can create products and correct them. The cashier can find them. Deletion and
archiving are out of scope: they entangle with immutable sales history and need their own
filtering rules.

Editing is not optional. Pharmacy prices change often, and a write-once catalog would need raw SQL
to fix the first wrong price.

Known cost: mistaken or discontinued products accumulate with no way to retire them.

### Products carry separate generic and brand names

`generic_name` is required. `brand_name` is optional, because unbranded generics are sold. Search
matches when every word typed appears, ignoring case, somewhere in the generic name, brand name,
strength or dosage form, so "amox", "Biogesic" and "amox 500" all find their product.

This follows RA 6675, keeps the generic name available wherever it must be displayed, and makes
questions like "every paracetamol product" answerable later.

Rejected: a single free-text name field, which is faster to type but can never be grouped or
reported on by generic. Since the catalog is entered by hand, correcting that later would mean
re-typing it. Also rejected: generic names only, which would return nothing for a customer asking
by brand.

Known cost: two name fields to type for every product during hand entry.

### VAT exemption is a boolean on the product

`is_vat_exempt` defaults to false. The pharmacist sets it for medicines exempt at retail under
RA 11467, which covers medicines for diabetes, hypertension, high cholesterol, cancer, mental
illness, tuberculosis and kidney disease.

This is exemption attached to the product, distinct from senior citizen and PWD exemption attached
to the customer. It changes the discount computation recorded in the project brief, which strips
12% VAT before applying the 20% discount. That formula holds only for VAT-able products. For an
exempt product there is no VAT to strip, and the 20% applies to the full price. The sale slice
must implement both cases.

Rejected: deriving exemption from a therapeutic category, which means maintaining a taxonomy and a
legal mapping that changes with the law. Also rejected: deferring exemption, since a senior buying
maintenance medicine is the most common discounted transaction and precisely the case it would get
wrong.

Known cost: correctness depends on the pharmacist marking each product, with nothing in the system
to verify it.

### Money is stored as integer centavos

Every price and amount is an INTEGER number of centavos, so 112.00 pesos is stored as 11200.
Arithmetic is exact and SQLite sums it natively.

Rejected: decimal strings, which SQLite cannot sum or compare without casting. Also rejected:
floating point, since 0.01 has no exact binary representation and VAT and discount arithmetic
would drift by centavos that break cash drawer reconciliation.

Known cost: every input and display converts by 100. A missed conversion is a 100x error, which is
loud rather than silent.

### Discount eligibility is a per-product flag, on by default

`is_discount_eligible` defaults to true. It defines "eligible lines" in milestone 1 acceptance
criterion 3, which the project brief left undefined. The senior citizen and PWD 20% discount
covers medicines and medical supplies for the customer's own use, not the general merchandise a
pharmacy also sells, so the pharmacist switches it off for items like snacks and toiletries.

The default reflects asymmetric risk. A missed switch on a snack gives away 20% of a small sale,
which is recoverable. A missed switch on a medicine would deny a legally mandated discount, which
carries penalties.

Rejected: off by default, which puts every error in the penalised direction. Also rejected: no
field, which misapplies the discount to every non-medical sale.

Known cost: general merchandise is discounted until someone marks it, and nothing flags the
omission.

### Strength and dosage form are optional free text

`strength` (for example "500mg" or "125mg/5mL") and `dosage_form` (for example "capsule" or
"syrup") are optional text fields, shown in search results so products sharing a generic name are
distinguishable at a glance. They are optional because non-medical items have neither.

Rejected: a structured amount, unit and form list, because compound strengths such as 125mg/5mL
and combinations such as 500mg/125mg do not fit a single amount and unit. Also rejected: typing
strength into the generic name, which would make each strength a different generic and undo the
naming decision.

Known cost: "500mg" and "500 mg" are different strings, so grouping by strength is unreliable.

### Stock is in scope, with starting counts and corrections

The movement ledger lands in this slice. A product can receive a starting count when it is
created, the pharmacist can correct counts afterwards, and search shows quantity on hand, derived
by summing movements.

Corrections arrive together with the first movement because the ledger is append-only. Editing a
product never changes stock, so a wrong count can only be fixed by appending a correcting
movement. Without that action, any mistyped count would be permanent.

Rejected: leaving stock out, which would delay showing quantities and make real catalog entry wait
for a later slice. Also rejected: starting counts without corrections, for the reason above.

Known cost: the slice roughly doubles and takes on correction reasons and recount rules.

### Corrections are entered as the counted total

The person correcting stock counts the shelf and enters the total. The system computes the
difference against current on-hand and appends it as a movement. This matches how the store counts
stock by hand today and removes mental arithmetic at the counter.

The difference is calculated when the count is entered, not when the shelf was counted. Once sales
exist, a sale rung up between counting and entering would be absorbed into the correction. With a
single till and prompt entry the risk is small, but it is real.

Rejected: entering a change such as −2, which forces subtraction during a full recount, and any
slip stays in the history permanently. Also rejected: offering both modes, which doubles the ways
to get it wrong.

Known cost: "remove 2 damaged units" cannot be entered directly. The remaining total is counted
and entered instead.

### Corrections carry a reason from a fixed list

Every correction requires a reason chosen from Recount, Damaged, Expired, Missing and Other, plus
an optional free-text note. Starting counts are labelled "Starting count" automatically; that
reason is not selectable by hand.

A fixed list makes losses summarisable later, for example stock lost to expiry in a month.
"Expired" is only a label here: batch and expiry tracking remains deferred.

Rejected: free text, which cannot be totalled or filtered because spelling varies. Also rejected:
no reason, which leaves the history unable to explain why the numbers changed.

Known cost: cases outside the list fall into Other, which can become a catch-all.

### A starting count is required

Every product is created with a starting count, which may be 0. Adding a product always appends
exactly one Starting count movement, so a product can never be "not yet counted".

The trap this avoids: if a blank count displayed as 0, an uncounted product would look out of
stock, and a cashier could turn a customer away while the shelf is full.

Rejected: optional, with "not counted" shown distinctly from 0, which adds a state for the cashier
to understand and lets products sit uncounted. Also rejected: optional, with a blank shown as 0,
for the reason above.

Known cost: stock that has not arrived is entered as 0, and its arrival is recorded as a Recount
until receiving exists.

## Acceptance Behavior

Observed with the network disconnected.

Adding and editing products:

1. A product can be added with a generic name, brand name, strength, dosage form, price,
   VAT-exempt flag, discount-eligible flag and starting count. Generic name, price and starting
   count are required.
2. Price is typed in pesos, such as 12, 12.50 or 1,200.00, and stored as integer centavos. It must
   be greater than zero. A missing, zero or negative price, or one with more than two decimal
   places, is refused with a visible reason.
3. The starting count must be a whole number of 0 or more. Adding a product appends exactly one
   Starting count movement, including when the count is 0.
4. VAT-exempt defaults to off and discount-eligible defaults to on.
5. A product's details can be edited. Editing never changes stock.

Searching:

6. Every word typed must appear, ignoring case, in the generic name, brand name, strength or
   dosage form. "amox 500" finds Amoxicillin 500mg, and "biogesic" finds Biogesic.
7. Each result shows generic name, brand name, strength, dosage form, price in pesos and quantity
   on hand.
8. Results update as the cashier types and feel instant with a catalog of a few thousand
   products. They are ordered by generic name, then brand name, then strength, and at most 50 are
   shown.

Correcting stock:

9. A correction takes the counted total, a whole number of 0 or more, and a reason from Recount,
   Damaged, Expired, Missing or Other, with an optional note. It appends one movement equal to the
   counted total minus current on-hand.
10. A correction whose counted total equals current on-hand still appends a movement of 0, which
    records that the count was confirmed.
11. Quantity on hand always equals the sum of that product's movements.
12. Stock movements cannot be updated or deleted. The database enforces this, not application code.

## Data Model

```text
products
  id                    TEXT PRIMARY KEY   client-generated UUID
  generic_name          TEXT NOT NULL
  brand_name            TEXT
  strength              TEXT
  dosage_form           TEXT
  price_centavos        INTEGER NOT NULL   greater than 0
  is_vat_exempt         INTEGER NOT NULL   CHECK IN (0, 1), default 0
  is_discount_eligible  INTEGER NOT NULL   CHECK IN (0, 1), default 1
  created_at            TEXT NOT NULL      ISO 8601, UTC
  updated_at            TEXT NOT NULL      ISO 8601, UTC

stock_movements
  id                    TEXT PRIMARY KEY   client-generated UUID
  product_id            TEXT NOT NULL      references products
  quantity_change       INTEGER NOT NULL
  reason                TEXT NOT NULL      references stock_movement_reasons
  note                  TEXT
  created_at            TEXT NOT NULL      ISO 8601, UTC

stock_movement_reasons
  code                  TEXT PRIMARY KEY   seeded with starting_count, recount, damaged,
                                           expired, missing, other
```

Triggers on `stock_movements` reject every UPDATE and DELETE. Reason codes live in
`stock_movement_reasons`, seeded by migrations, so a later milestone adds a code with one INSERT
instead of rebuilding this append-only table. Codes are shown to people as labels.

## Implementation Notes

- The schema is created through tauri-plugin-sql migrations, with SQL files under
  `src-tauri/migrations/` registered in `lib.rs`. `check-file-size.sh` already skips migrations.
- Adding a product and its Starting count movement is one transaction, run by a Rust command that
  borrows the SQL plugin's pool. The plugin has no transaction API, and each of its calls borrows
  its own pooled connection. See the [architecture](../architecture/index.md#database-access).
- Stock corrections are one `INSERT … SELECT` statement that computes the difference and appends
  the movement. A single statement is atomic, so corrections need no Rust.
- Flags are passed from TypeScript as 0 and 1. The plugin binds a JavaScript boolean as JSON, which
  would store the text `'true'`; the CHECK constraints make that mistake fail loudly.
- The plugin binds every JavaScript number as a float. Centavos stay exact because an INTEGER column
  stores a whole-number float as an integer, which validation confirms with `typeof()`.
- Foreign keys are a per-connection setting and the plugin's pool opens several connections.
  sqlx-sqlite 0.8.6 turns them on for every connection it opens, confirmed in its source.
  Validation confirms it at runtime rather than setting the pragma once.
- Confirm which `sql:` permission INSERT requires. The shell only granted `sql:default`, which may
  be read-only.
- Escape `%` and `_` in search input before building LIKE patterns, so typing "50%" is not
  treated as a wildcard.
- A plain LIKE scan is fast enough for a few thousand products. Revisit indexing or full-text
  search only if the catalog grows past tens of thousands.

## Validation

Risk lane: Critical. The slice stores money and introduces the first persistent data.

- Unit tests for the pure rules: peso text to centavos, search word matching and escaping, and the
  correction difference. This introduces Vitest, already listed as planned in
  [quality](../quality.md).
- Integration evidence in the running app: add, edit, search and correct, then read the rows back
  with `sqlite3`, confirm UPDATE and DELETE on `stock_movements` are rejected, and confirm with
  `typeof()` that prices are stored as integers and flags as 0 or 1.
- `./scripts/check-sonata.sh` and the Skylos gate.

## Open Risks

- Corrections are calculated at entry time. Once sales exist, a sale between counting and entering
  is absorbed into the correction.
- The VAT-exempt and discount-eligible flags depend on the pharmacist marking each product
  correctly, and nothing verifies them.
- Anyone at the till can change stock and prices until staff roles arrive.
- Deliveries are recorded as Recount until receiving exists.

## Deferred

- **Admin-only stock changes.** Stated as a requirement during this grill, then deferred to keep
  milestone 1 single-cashier with no authentication, as the project brief says. In this slice,
  anyone at the till can set starting counts and enter corrections. Staff roles are specified for
  milestone 2 in the [go-live controls spec](2026-09-24-go-live-controls.md). When they arrive:
  - Starting counts and corrections become admin-only.
  - Price edits become admin-only too. Unrestricted price edits at the till allow a discount to
    be given by editing a price, ringing the sale, and editing it back.
  - An in-app restriction does not protect the database file itself. Anyone with access to the
    machine can edit it with another SQLite tool. That needs operating-system controls or a
    server-side record kept through sync.

## Downstream Decisions

Not part of this slice, but created by decisions made here:

- **Rounding rule.** Taking 12% or 20% of an integer centavo amount produces fractions. The sale
  slice must fix whether rounding happens per line or per transaction, and in which direction.
- **Two discount formulas.** See the VAT exemption decision above.

## Open Questions

None.
