# Go-Live Controls

Status: approved for implementation.

The software side of milestone 2 ([#5](https://github.com/christianrazul/steward-pharmacy-pos/issues/5)):
staff accounts, voids, the end-of-day close, and backups. Building, installing, and the cutover from
the logbook are in the [Windows deployment and cutover spec](2026-09-24-windows-deployment-and-cutover.md).
It builds on the [catalog](2026-09-21-product-catalog-and-search.md) and
[cart and cash sale](2026-09-24-cart-and-cash-sale.md) specs.

## Decisions

### Two roles: admin and cashier

Cashiers search, sell and view sales. Admins can also change the catalog and stock, void sales,
manage staff accounts, restore backups and change settings.

### Catalog changes are admin-only, prices included

Business call. Adding a product, editing any product field and correcting stock need an admin.
Adding a product sets its starting count, which was already meant to be admin-only, and an
unrestricted price edit is the same gap as an unrestricted void: edit the price, ring the sale, edit
it back.

Known cost: fixing a wrong price needs an admin present.

### Staff sign in by choosing their name and entering a 6-digit PIN

A PIN is faster than a password at a counter. PINs are hashed with PBKDF2 through the webview's
built-in WebCrypto, with a random salt per account. Wrong PINs add a growing delay instead of
locking the account, because a lockout could shut out the only admin.

Rejected: passwords, which slow down every sign-in and every approval at the counter.

The limit, stated plainly: a PIN stops casual misuse inside Steward. It does not protect the
database file, and no hashing makes a 6-digit PIN safe from someone who copies that file.

### Admin-only actions ask for an admin on the spot

When an admin is signed in, admin-only actions simply work. When a cashier is signed in, the action
asks an admin to choose their name and enter their PIN, and the record keeps both the cashier who
asked and the admin who approved.

After 15 minutes without input the screen locks until the signed-in person enters their PIN, so an
admin who walks away does not leave admin access open.

### The first launch creates the first admin and a recovery code

With no accounts, Steward asks for the first admin, then shows a one-time recovery code to write
down and store somewhere safe. Any admin can reset any other account's PIN. If every admin is
locked out, the recovery code resets an admin's PIN, and a new code replaces it.

Business call: someone has to keep that code safe. Keeping at least two admin accounts makes it a
last resort rather than a routine tool.

Accounts are deactivated, never deleted, because past sales and stock movements refer to them.

### A void cancels a whole sale, with an admin and a reason

The reason comes from a short list, Wrong item, Wrong quantity, Customer changed mind and Other,
plus an optional note. The voided sale keeps its number and shows as VOID on its record, and one
`void` movement per line returns the stock. The void row and its movements are written in one
transaction by a Rust command. A void is refused once the sale's business day is closed.

Rejected: voiding single lines, which adds partial-refund arithmetic to fix what re-ringing the
sale already fixes.

Known cost: correcting one line of a large sale means voiding it and ringing it up again.

### A business day runs from its first sale until someone closes it

A store open past midnight, or a close that happens late, still gets a single business day. The
first sale after a close opens the next one.

Rejected: calendar days, which split a late shift in two and would cut off voids at midnight rather
than at the close.

### Closing the day records the counted cash

Any signed-in user can close, and the close records who did. The close screen shows the number of
sales, voided sales and their amount, the VAT breakdown, discounts given, net cash sales, the change
fund, and the cash expected in the drawer. The closer counts the drawer and enters the total, and
Steward records expected, counted and the difference. The difference is shown for confirmation
before the close is final, and a closed day never reopens.

The change fund is a setting that admins edit. Each close keeps a copy of the value it used.

Rejected: showing totals without recording the count, which leaves no trace of a shortage.

Known cost: a mistyped count stays on record as a difference.

### Backups run at every close, and at startup when the newest is over a day old

Each backup is a consistent snapshot written with SQLite's `VACUUM INTO`, which works while the app
is running, into a folder an admin chooses once. That folder is expected to sit inside a Google
Drive or Dropbox folder. Files are named by date and time. The newest 30 are kept, and Steward only
ever deletes files that match its own naming.

A failed backup, such as a missing folder or a full disk, leaves a warning on every screen until a
backup succeeds. The startup rule covers a day nobody closed.

### Backups are not encrypted

Business call. They hold customers' ID numbers and names, plus the staff PIN hashes, and they sit in
a consumer cloud account. Encryption would protect them if that account were broken into, but a
lost key would make every backup useless. Recommendation: turn on two-step verification for the
cloud account instead.

### Restoring is an admin action that keeps a safety copy

An admin picks a backup file. Steward checks that it is a Steward database it can migrate, backs up
the current database, replaces it and restarts. This is also how the go-live restore test is done.

### Steward backs itself up before running migrations

When a new version finds migrations to run, it writes a backup first, so a failed migration can be
undone by restoring.

## Acceptance Behavior

1. The first launch with no accounts creates an admin and shows a recovery code once.
2. Staff sign in by name and PIN. Wrong PINs add a growing delay and never lock an account.
3. A signed-in cashier cannot add or edit products, correct stock, void, restore or manage accounts
   unless an admin enters their PIN.
4. An approved action records both the signed-in user and the approving admin.
5. After 15 minutes without input, the screen locks until the signed-in person's PIN is entered.
6. A void needs an admin and a reason, cancels the whole sale, keeps its number, shows it as VOID
   and returns its stock. It is refused once the sale's business day is closed.
7. Closing the day shows the totals listed above, takes the counted cash, and records expected,
   counted and difference. A closed day cannot be reopened.
8. Every close writes a backup to the chosen folder, and startup writes one when the newest is over
   a day old. A failure stays visible until a backup succeeds. Only the newest 30 Steward backups
   are kept.
9. An admin can restore a backup, and the current database is backed up first.
10. The recovery code resets an admin's PIN when every admin is locked out, and is then replaced.
11. Sales record the cashier, stock movements record who made them, and products record who last
    edited them.
12. `business_days`, `day_closes` and `sale_voids` cannot be updated or deleted.

## Data Model

```text
users                                  mutable
  id                      TEXT PRIMARY KEY   client-generated UUID
  display_name            TEXT NOT NULL
  role                    TEXT NOT NULL      CHECK IN ('admin', 'cashier')
  pin_hash                TEXT NOT NULL      PBKDF2 output
  pin_salt                TEXT NOT NULL
  is_active               INTEGER NOT NULL   CHECK IN (0, 1)
  created_at, updated_at  TEXT NOT NULL      ISO 8601, UTC

store_settings                         mutable key and value rows
  key                     TEXT PRIMARY KEY   backup_folder, change_fund_centavos,
                                             recovery_code_hash
  value                   TEXT NOT NULL

business_days                          append-only
  id                      TEXT PRIMARY KEY
  opened_at               TEXT NOT NULL
  opened_by               TEXT NOT NULL      references users

day_closes                             append-only
  id                      TEXT PRIMARY KEY
  business_day_id         TEXT NOT NULL      references business_days; unique
  closed_at               TEXT NOT NULL
  closed_by               TEXT NOT NULL      references users
  sale_count              INTEGER NOT NULL
  void_count              INTEGER NOT NULL
  voided_centavos, vatable_base_centavos, vat_centavos, exempt_base_centavos,
  discount_centavos, net_sales_centavos, change_fund_centavos,
  expected_cash_centavos, counted_cash_centavos, difference_centavos
                          INTEGER NOT NULL   copies kept at close time

sale_voids                             append-only
  id                      TEXT PRIMARY KEY
  sale_id                 TEXT NOT NULL      references sales; unique
  reason                  TEXT NOT NULL      references sale_void_reasons
  note                    TEXT
  requested_by            TEXT NOT NULL      references users
  approved_by             TEXT NOT NULL      references users
  created_at              TEXT NOT NULL

sale_void_reasons
  code                    TEXT PRIMARY KEY   seeded with wrong_item, wrong_quantity,
                                             customer_changed_mind, other

Added columns, all nullable so earlier rows need no update
  sales.cashier_id                  references users
  sales.business_day_id             references business_days
  stock_movements.created_by        references users
  stock_movements.approved_by       references users; set when a cashier needed approval
  products.updated_by               references users
```

`void` is added to `stock_movement_reasons`. Every change here is a new table, a new lookup row or a
nullable column, so no append-only table is rebuilt. The groundwork in the earlier specs held.

## Validation

Risk lane: Critical. This covers security, the money in the drawer, and the only copy of the
store's records.

- Vitest: PIN hashing and verification, the delay schedule, expected-cash arithmetic, and which
  backup files retention deletes, including never touching files outside Steward's naming.
- In the running app: a void end to end, including refusal after the close; a close with a nonzero
  difference; a restore onto a fresh install; a forced migration that triggers its safety backup;
  and a cashier refused until an admin approves.
- `./scripts/check-sonata.sh` and the Skylos gate.

## Open Risks

- A shared or observed PIN defeats the record of who did what.
- The database file and the unencrypted backups hold customers' personal data.
- A business day depends on someone closing it. The startup backup covers a forgotten close, but
  voids stay open until the close happens.
