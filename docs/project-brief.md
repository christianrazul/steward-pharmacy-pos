# Project Brief

## Product Vision

Steward is the point-of-sale system for one Philippine retail pharmacy. It runs on a machine in
the store, keeps selling when the internet does not, and is the store's record of what was sold
and what remains in stock. The destination is local-first operation with cloud sync, so the owner
can read the store's numbers without standing at the counter.

## Users

- Primary user: the cashier at the counter, ringing up walk-in sales during store hours.
- Secondary users: the pharmacist or owner, who maintains the product catalog and reads sales figures.
- Operating environment: one counter terminal in a single Philippine retail pharmacy. A desktop
  application on the store's Windows PC. Internet is not assumed, and a sale must complete
  without it.

## Current Milestone

Outcome: a cashier completes one cash sale end to end, offline, and the sale is durably recorded.

Issues: the catalog as [#1](https://github.com/christianrazul/steward-pharmacy-pos/issues/1),
[#2](https://github.com/christianrazul/steward-pharmacy-pos/issues/2) and
[#3](https://github.com/christianrazul/steward-pharmacy-pos/issues/3); the cart and cash sale as
[#4](https://github.com/christianrazul/steward-pharmacy-pos/issues/4).

Acceptance behavior, observed with the network disconnected:

1. A cashier finds a product by name and adds it to a cart with an adjustable quantity.
2. The cart shows per-line amounts and a total in PHP, with 12% VAT handled correctly.
3. A senior citizen or PWD discount applies to lines whose product is marked discount-eligible,
   showing the VAT exemption and the 20% discount as separate, visible amounts.
4. The cashier enters cash tendered and the system computes change.
5. Completing the sale writes an immutable sale record with a unique reference, appends one stock
   movement per line, and the sale can be retrieved afterwards.
6. An internal sales record can be produced for the sale. This is not a BIR official receipt.

Prescription capture is out of scope for this milestone. Only dangerous drugs require a register,
and that register is deferred, so catalog items sell as ordinary retail until it exists.

The catalog is seeded by hand. The store keeps no digital product list today, so there is nothing
to import.

### Discount computation

VAT is stripped before the discount is applied:

```text
Item marked 112.00 (VAT-inclusive)
  VAT-exempt base   112.00 / 1.12 = 100.00
  20% discount                      -20.00
  Amount due                         80.00
```

Approved during setup. Re-verify against how the store rings one up before this handles real
sales: discounting first and stripping VAT afterwards produces a different amount, and that is an
audit finding rather than a test failure.

This computation applies to VAT-able products only. A product that is VAT-exempt under RA 11467
has no VAT to strip, so the 20% applies to the full price: an exempt item marked 100.00 comes to
80.00. See the [product catalog spec](specs/2026-09-21-product-catalog-and-search.md).

## Next Milestones

This section stays at roadmap level: order, outcome and headline acceptance. Detailed specs for
every milestone are being written under `docs/specs/` ahead of building. Specs beyond the next
milestone are provisional and get re-validated right before they start, once the milestones before
them have taught what they can.

### Milestone 2: Go live at the store

Outcome: the store rings up every real sale in Steward and retires the handwritten logbook.
Issue: [#5](https://github.com/christianrazul/steward-pharmacy-pos/issues/5).

Milestone 1 ends at a working demo. Milestone 2 closes the gap between that and a till the store
can rely on:

- Steward installed and running on the store's Windows PC.
- Voiding a mistaken sale until the day is closed, so a total already checked against the drawer
  never changes. The voided sale stays in the history, marked as voided, and its stock goes back.
  A cashier will ring something up wrong on the first day. Returns remain deferred.
- An end-of-day close showing the day's sales total for checking the cash drawer. The Problem
  section names manual reconciliation as a pain, but nothing delivered it before this milestone.
- Automatic backups when the day is closed, written into a folder that a cloud sync app such as
  Google Drive or Dropbox uploads when the internet is up. Steward itself never needs the
  internet. The copy survives a dead disk, theft and fire; its cost is dependence on a sync app
  staying installed and signed in on the store machine.
- Staff accounts with logins and roles. Voids, stock corrections and catalog changes, prices
  included, are admin-only, and each one records who made it. Without this, anyone could void a cash sale after the customer leaves and
  keep the money while the drawer still balances. Logins protect actions in Steward, not the
  database file itself.
- A one-week parallel run. Steward and the logbook both record every sale, and the logbook is
  retired after a week in which every daily difference between them has been explained and none
  was caused by Steward. Rejected: switching over on a single day, which leaves nothing to fall
  back on if that day goes wrong.

The store takes cash only, so milestone 2 stays cash-only. If it starts accepting GCash or cards,
the first step is recording each sale's payment method so the end-of-day total can split by
method. Without that, a non-cash sale either goes unrecorded or makes the drawer look short.

The dangerous drugs register stays on paper at go-live. Steward rings up those sales and tracks
their stock like any other product.

Acceptance: every sale at the store goes through Steward on the store's Windows PC, with staff
logged in. Voids and stock corrections need an admin. Closing the day shows the sales total and
writes a backup. A backup has been restored onto another machine at least once, because a backup
nobody has restored may not work. The logbook is retired after the parallel week.

Rejected as milestone 2: cloud sync, which would be designed around guessed usage rather than
real sales, and checkout features such as a barcode scanner and a receipt printer, which would
speed up a till the store is not yet using.

Detailed specs: [go-live controls](specs/2026-09-24-go-live-controls.md) and
[Windows deployment and cutover](specs/2026-09-24-windows-deployment-and-cutover.md). They settle
what this section left open: price edits are admin-only; a locked-out admin is recovered by
another admin or a one-time recovery code; GitHub Actions builds an unsigned installer that
carries WebView2; and every ticket is checked on Windows before it is done.

### Milestone 3: Deliveries and expiry

Outcome: stock that arrives and expires is recorded as what it is.
Issue: [#6](https://github.com/christianrazul/steward-pharmacy-pos/issues/6).

Record deliveries by supplier instead of as recounts, track batches with expiry dates, and list
stock expiring soon. After go-live, deliveries become the stock change Steward records most
wrongly, and expired stock is the store's most direct money loss. Batches change how stock is
stored, so they come before sync. Whether sales use up the earliest-expiring batch first is a
question for this milestone's grill.

### Milestone 4: Barcode scanning

Outcome: the cashier scans a box instead of typing.
Issue: [#7](https://github.com/christianrazul/steward-pharmacy-pos/issues/7).

Each product's barcode is captured by scanning its box once. It is a small job that speeds up
every sale, and it follows deliveries because receiving is when every box passes through
someone's hands.

### Milestone 5: The owner's view from anywhere

Outcome: the owner reads the store's numbers without standing at the counter.
Issue: [#8](https://github.com/christianrazul/steward-pharmacy-pos/issues/8).

Cloud sync and remote reporting, the destination in the Product Vision. By this point real use
has settled how data is stored, which is why sync waited. A cheap interim can land earlier if
wanted: closing the day also writes a readable daily summary next to the backup, so the owner can
check it on a phone.

### Milestone 6: Official receipts

Outcome: Steward issues the store's official receipts.
Issue: [#9](https://github.com/christianrazul/steward-pharmacy-pos/issues/9).

BIR accreditation and a receipt printer. The store keeps writing official receipts by hand until
then, so a printer adds little earlier. The application takes a long time to process, so it can be
filed well before the build starts.

### Milestone 7: More tills and branches

Outcome: more than one till, and branches of this business, share one record.
Issue: [#10](https://github.com/christianrazul/steward-pharmacy-pos/issues/10).

A second terminal and branches, built on sync. Official receipt numbering is easier to get right
on one till first, which is why this follows milestone 6.

## Problem

Sales are written by hand in a logbook and stock is counted physically. There is no reliable
record of what sold, what remains, or what needs reordering, and every senior citizen or PWD
discount is computed by hand at the counter. Doing nothing keeps end-of-day reconciliation manual
and leaves the store's most audit-sensitive arithmetic dependent on whoever is at the till.

## Non-Goals

- Clinical records. No patient charts, diagnoses, allergies, or drug interaction checking.
  Recording a prescription for compliance is not validating one, and the pharmacist's professional
  judgment stays outside the software.
- Accounting and payroll. Steward produces sales data and exports. It does not file returns or
  replace a bookkeeper.
- E-commerce. No online ordering, storefront, or delivery.
- Multi-tenant SaaS. Other pharmacies are not customers. Additional branches of this business are
  scheduled in milestone 7.

## Later / Not Now

Scheduled items have moved into Next Milestones. These have no milestone yet:

- Non-cash payment: cards, GCash, other e-wallets
- Returns and refunds
- Purchase orders
- Digital RA 9165 dangerous drugs register

The dangerous drugs register is deferred, not dismissed. It stays on paper until Steward takes it
over.

## Constraints

- Stack: Tauri 2 desktop shell, React 19 with TypeScript, Vite, Tailwind, SQLite.
- Package manager: pnpm.
- Runtime: a Windows PC in the store, developed on macOS. The application must function with no
  internet connection.
- Data: the local SQLite database is the source of truth. Client-generated UUID primary keys,
  sales recorded as immutable append-only rows, and stock held as a ledger of movements rather
  than a mutable quantity column.
- Security: the GitHub repository is public. No real customer data, prescriptions, credentials, or
  store-identifying operational detail is ever committed, and none belongs in issue text.
- Performance: counter speed. Product search and add-to-cart must feel instant to a cashier
  serving a queue.
- Money: PHP, 12% VAT, Philippine retail pharmacy rules.
- Token budget: not constrained.

## Open Questions

None at brief level. Questions for a specific milestone live with that milestone above.
