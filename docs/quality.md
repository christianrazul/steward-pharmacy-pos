# Quality

Keep this as the project verification menu. Add commands only after they pass locally.

## Harness Checks

| Check | Command | Run When |
|---|---|---|
| Harness structure and source size | `./scripts/check-sonata.sh` | After harness, docs, or skill changes |
| Changed-code gates | `node scripts/check-quality-gates.mjs` | Before handoff |

## Project Checks

No application exists yet. Every command below is planned and stays planned until it passes
locally.

| Check | Command | Status |
|---|---|---|
| Bootstrap/install | `pnpm install` | planned |
| Run application | `pnpm tauri dev` | planned |
| Fast code checks | `pnpm lint` and `pnpm exec tsc -b` | planned |
| Unit tests | `pnpm test` | planned |
| Exercise primary behavior | Complete one cash sale end to end with the network disconnected | planned |
| Observe failures | Tauri devtools console and application log | planned |
| Reset/cleanup | Delete the local SQLite database file, then re-seed the catalog | planned |

## Quality Gates

Configured in `.sonata/quality-gates.json`.

- **Skylos 4.29.0: enabled.** Scans changed code for security, secrets, and quality findings.
  Thresholds live in `.sonata/skylos.toml` and are the project-owned defaults. `max_lines = 50`
  with `max_quality = 0` and `strict = true` is expected to fire on JSX-heavy components; adjust
  the threshold when it first does, rather than pre-emptively.
- **SCC: disabled.** Deferred until milestone 1 produces real TypeScript and Rust files. A new
  file in a language with no configured ceiling fails the gate, and ceilings derived before the
  code exists would be invented. Revisit with `node scripts/check-quality-gates.mjs --recommend-scc`,
  which reports each language's observed 75th percentile.

The gate compares the working tree against `HEAD`, so it requires at least one commit in the
repository. On a branch with no commits it fails with `fatal: bad revision 'HEAD'`.

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
