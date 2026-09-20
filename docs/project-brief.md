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
  application on the store's own machine. Internet is not assumed, and a sale must complete without it.

## Current Milestone

Outcome: a cashier completes one cash sale end to end, offline, and the sale is durably recorded.

Acceptance behavior, observed with the network disconnected:

1. A cashier finds a product by name and adds it to a cart with an adjustable quantity.
2. The cart shows per-line amounts and a total in PHP, with 12% VAT handled correctly.
3. A senior citizen or PWD discount applies to eligible lines, showing the VAT exemption and the
   20% discount as separate, visible amounts.
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
  a separate question, deferred below.

## Later / Not Now

- Cloud sync and off-site reporting
- Second terminal, and multi-branch for this business
- Non-cash payment: cards, GCash, other e-wallets
- Returns, voids, and refunds
- Purchase orders, supplier management, receiving
- Batch and expiry tracking, FEFO dispensing
- Barcode scanner and receipt printer hardware
- Staff accounts, roles, and audit trail
- RA 9165 dangerous drugs register
- BIR accreditation and Permit to Use

Voids and the RA 9165 register are deferred, not dismissed. A real pharmacy cannot run without
them for long.

## Constraints

- Stack: Tauri 2 desktop shell, React 19 with TypeScript, Vite, Tailwind, SQLite.
- Package manager: pnpm.
- Runtime: the store's own machine. The application must function with no internet connection.
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

- Counter hardware: which machine and operating system the till runs on, which decides the Tauri
  build target.
- Backup: where the local SQLite file is backed up and how often. A single local database is the
  source of truth, so this must be answered before the till handles real sales.
