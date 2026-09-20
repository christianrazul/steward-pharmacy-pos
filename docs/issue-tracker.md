# Issue Tracker

Mode: GitHub Issues.

Repository: `christianrazul/steward-pharmacy-pos`.

## Rules

- Repository documentation is canonical. Issues coordinate work; they never hold the only copy of
  a decision, specification, or acceptance criterion.
- Every published issue links back to its canonical spec under `docs/specs/` or its plan under
  `docs/exec-plans/active/`.
- The repository is public, so every issue is world-readable. Keep the pharmacy's name, address,
  staff names, supplier terms, pricing, and any customer or prescription data out of issue text.
- No credentials belong in this file or in issue content. `gh` uses the operator's own
  authenticated session.
- Create, close, or edit issues only with explicit approval, never as a side effect of other work.

## Commands

Publish an approved breakdown in blocker order:

```bash
gh issue create --repo christianrazul/steward-pharmacy-pos --title "<title>" --body "<body>"
```

Read open work:

```bash
gh issue list --repo christianrazul/steward-pharmacy-pos --state open
```
