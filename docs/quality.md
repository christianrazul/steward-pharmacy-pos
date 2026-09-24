# Quality

Keep this as the project verification menu. Add commands only after they pass locally.

## Prerequisites

Rust was installed through Homebrew's `rustup`, which is keg-only and does **not** put `cargo` on
`PATH`. There is no `~/.cargo/bin`. Any Tauri build fails with a missing-Rust error until the
shims are on `PATH`:

```bash
echo 'export PATH=/opt/homebrew/opt/rustup/bin:$PATH' >> ~/.zshrc
```

Verified toolchain: rustc 1.98.1, cargo 1.98.1, Node 24.13, pnpm 10.34.2.

## Harness Checks

| Check | Command | Run When |
|---|---|---|
| Harness structure and source size | `./scripts/check-sonata.sh` | After harness, docs, or skill changes |
| Changed-code gates | `node scripts/check-quality-gates.mjs` | Before handoff |

## Project Checks

| Check | Command | Status |
|---|---|---|
| Bootstrap/install | `pnpm install` | verified |
| Run application | `pnpm tauri dev` | verified |
| Typecheck and bundle | `pnpm build` | verified |
| Lint | Not configured | planned |
| Unit tests | Not configured | planned |
| Exercise primary behavior | Complete one cash sale end to end with the network disconnected | planned |
| Observe failures | Terminal output of `pnpm tauri dev`, plus the webview devtools console | verified |
| Reset/cleanup | Delete `~/Library/Application Support/com.christianrazul.steward/steward.db` (macOS development machine) | planned |

The application shell is verified only as a shell: the window opens and the local SQLite database
is created and queried. No point-of-sale behavior exists yet.

## Quality Gates

Configured in `.sonata/quality-gates.json`.

- **Skylos 4.29.0: enabled.** Scans changed code for security, secrets, and quality findings.
  Thresholds live in `.sonata/skylos.toml`. The `max_lines = 50` rule has not yet fired on real
  component code.
- **SCC: disabled.** Deferred until there is enough TypeScript and Rust to derive honest ceilings
  from. Revisit with `node scripts/check-quality-gates.mjs --recommend-scc`.

The gate compares the working tree against `HEAD` and needs at least one commit to exist.

### Local modification to `scripts/quality-gates.mjs`

`scripts/quality-gates.mjs` is a Sonata-managed file whose hash is recorded in
`.sonata/manifest.json`. It has been modified locally, so `$sonata-upgrade` will report it as
changed. **Re-apply both changes if an upgrade overwrites them**, or the gate becomes unusable:

1. `runSkylos` narrows changed paths to extensions Skylos actually analyses. Without this it
   parsed `Cargo.lock` and `tsconfig.json` as JavaScript and produced 590 false findings, which
   would block every commit touching a lockfile or JSON config.
2. `collectFindings` drops `secrets` findings in lockfiles. Skylos sweeps the whole project for
   secrets regardless of the paths it is handed, and reads dependency integrity hashes as
   high-entropy credentials.

Consequence worth knowing: secrets scanning no longer covers JSON, YAML, or lockfiles. `.env` and
`.env.*` are gitignored, and no real credential belongs in a lockfile, but config files are no
longer a backstop. Both issues are upstream Sonata bugs and worth reporting.

## Risk Lanes

- Fast: docs, copy, styling, scaffolding, one-line config. One cheap check; no test required.
- Behavior: branches, parsing, state transitions, regression fixes. One public-seam test plus relevant build/typecheck.
- Critical: persistence, concurrency, security, permissions, money, external contracts. Focused integration evidence and review.
- Milestone: broad or cross-cutting work. All relevant verified checks.

Money arithmetic in this project is a Critical lane, not a Behavior one. VAT exemption and the
senior citizen or PWD discount decide what a customer is legally charged.

## Quality Bar

- Acceptance behavior exists before broad implementation.
- Validation is reproducible by another agent.
- Planned commands stay marked planned until verified.
- Source files above 350 lines fail the smell check. Required exceptions live in `.sonata/large-files.txt`, never product code.
- New decisions update durable repo context.
- Repeated failures become docs, checks, fixtures, logs, or clearer boundaries.
