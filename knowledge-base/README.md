# Knowledge Base — Verbatim Snapshot from career-ops

This directory is a **read-only snapshot** of the canonical career-ops repo
(`~/ws/playground/career-ops`) taken at scaffold time. It is intentionally
untouched by the extension's build pipeline and never synced back upstream.

## Provenance

- **Source repo:** `~/ws/playground/career-ops`
- **Source commit:** `9b17fa8ac7bee8c27de241321f4609733eb34d74`
- **Scaffold date:** 2026-04-10

## What's here

| Path | Purpose |
|------|---------|
| `modes/` | Original English + DE + FR + PT prompts for every pipeline mode |
| `templates/cv-template.html` | Reference HTML for the CV structure (ported to pdf-lib inside `src/offscreen/`) |
| `templates/states.yml` | Canonical application statuses — ported to `src/shared/constants.ts` |
| `templates/portals.example.yml` | Default 45+ companies and queries — seeds the `portals` Dexie table on first run |
| `config/profile.example.yml` | Profile schema reference for the onboarding wizard |
| `fonts/` | DM Sans + Space Grotesk (woff2) also copied to `public/fonts/` for runtime use |
| `DATA_CONTRACT.md` | User-layer vs system-layer split — the foundational rule: user customization NEVER touches bundled system files |
| `SKILL.md` | The original Claude Code skill dispatch logic (reference only — the extension replaces this with content-script + background router) |

## Why snapshot instead of symlink

- **Reproducible builds:** the extension compiles from a frozen set of prompts. Upstream rewrites to `_shared.md` don't silently change scoring behavior.
- **Offline development:** no dependency on the source repo being present at build time.
- **Clear boundary:** editing anything here is a mistake — either port the change upstream, or update `src/assets/modes/` (the runtime-bundled copy).

## Editing rules

**Don't edit files in this directory.** Ever.

- If you need to change a prompt that will ship in the extension, edit `src/assets/modes/{file}.md`.
- If you need to refresh from upstream, rerun `node scripts/scaffold-from-source.mjs` (it refuses to clobber modified files).
- If you need to record a new decision, add it to the project root `CLAUDE.md`, not here.
