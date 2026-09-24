# Windows Deployment and Cutover

Status: draft, grilled internally and awaiting confirmation.

How milestone 2 ([#5](https://github.com/christianrazul/steward-pharmacy-pos/issues/5)) gets
Steward onto the store's Windows PC and retires the logbook: building the installer, installing
and updating, testing on Windows, and the go-live runbook. What Steward itself does at go-live is in
the [go-live controls spec](2026-09-24-go-live-controls.md).

## Decisions

### GitHub Actions builds the Windows installer

A workflow on a Windows runner builds the installer whenever a version tag is pushed, and on
demand. It is free for public repositories, reproducible, and needs no Windows machine to build.
`.gitignore` gains `!.github/`, because the developer's global gitignore hides `.github/`.

The same workflow can run the Sonata quality gates on every push, which setup skipped because no
Actions workflow existed yet.

Rejected: building by hand on a Windows machine, since the only one available is the store's PC.

Known cost: build logs are public, like the repository.

### The installer is an NSIS `.exe` that carries WebView2

Tauri's `offlineInstaller` WebView2 mode means installing never needs the internet, even on a PC
where WebView2 is missing.

Rejected: the default mode, which downloads WebView2 when it is missing and fails on a store PC
without internet.

Known cost: the installer grows by roughly 127 MB.

### The installer is unsigned

Business call. Windows shows "Windows protected your PC" the first time the installer runs; "More
info", then "Run anyway", proceeds. That is acceptable for one store. A code signing certificate
costs money every year; revisit before branches in milestone 7.

### Updates are installed by hand

A new version means running its installer on the store PC. The database lives in the user's app
data folder, outside the install folder, so it survives, and Steward backs up before migrating. The
runbook warns never to tick the uninstaller's option to delete application data.

Rejected: Tauri's auto-updater, which needs internet at the store and hosted update files. Revisit
with sync in milestone 5.

### Test builds never touch the store's database

Development and test builds use their own app identifier, so their database lives in a different
folder from the store's. The store's database only ever holds real data, since a test sale voided
on it would stay in its history forever.

### Every ticket is checked on Windows before it is done

From now on, a ticket's acceptance also runs on Windows, using the installer from CI, because the
development Mac renders with Safari's engine and the store PC with Chromium's. Routine checks run
in a Windows 11 virtual machine on the Mac; the final rehearsal runs on the store PC.

Business call: a Windows virtual machine needs virtualization software and a Windows license. On
an Apple Silicon Mac it runs Windows for ARM, which runs the x64 build through emulation. That is
close to the store PC but not identical.

### The build targets 64-bit Windows 10 and 11

One x64 installer. An ARM build is added only if the store PC turns out to be ARM.

### SQLite's durable defaults stay

The source of sqlx-sqlite 0.8.6 shows it turns foreign keys on for every connection and leaves the
journal mode and sync setting at SQLite's defaults: a rollback journal with full sync. A completed
sale is on disk before the cashier sees it succeed, so a power cut cannot lose it.

Rejected: switching to WAL, which a single till does not need.

### Go-live follows a written runbook

`docs/runbooks/go-live.md` is written during milestone 2 and covers:

1. Install on the store PC. Create at least two admins, store the recovery code, choose the backup
   folder inside the sync app's folder, set the change fund, and turn on two-step verification for
   the cloud account.
2. Enter the catalog on the store PC. The store keeps selling from the logbook meanwhile, so counts
   taken along the way go stale; products can be entered with a starting count of 0.
3. On the evening before the parallel week, a full stocktake, entered as Recount corrections by a
   signed-in admin.
4. The parallel week: every sale goes into both Steward and the logbook, each day is closed, and
   Steward's close totals are compared with the logbook. Every difference gets explained.
5. The restore test: install Steward on another machine, restore the newest backup, and confirm the
   data.
6. Retire the logbook after a week in which every difference was explained and none was caused by
   Steward.

## Acceptance Behavior

1. Pushing a version tag produces a Windows installer from GitHub Actions.
2. The installer installs on a Windows PC with the network disconnected, including WebView2 when
   it is missing.
3. Installing a newer version over an older one keeps every record, and a backup is written before
   migrations run.
4. A test build and the store build installed on one machine keep separate databases.
5. Every milestone 1 and 2 acceptance criterion passes on Windows.
6. Through the plugin on Windows, `PRAGMA foreign_keys` reads 1, `journal_mode` reads delete and
   `synchronous` reads 2, which is full.
7. The runbook exists, and the store followed it: stocktake, parallel week and restore test.

## Validation

Risk lane: Milestone. This is broad and ends with the store relying on Steward.

- A tagged build in CI produces the installer.
- An offline install on a clean Windows virtual machine.
- An upgrade install over realistic data keeps it intact.
- A dry run of the runbook before the real one.

## Open Risks

- The first-run warning from an unsigned installer could alarm staff who were not told to expect
  it.
- The store PC's clock stamps every record. Without internet it can drift, which affects the times
  on records, not the totals.
- The virtual machine is close to the store PC but not identical, so the rehearsal on the store PC
  still matters.
