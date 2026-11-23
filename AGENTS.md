# AGENTS.md — EdTeknoGuard System Router & AI Instructions

## 1. System Overview
EdTeknoGuard is an automated periodic monitoring and early warning system for Optical Network Terminal (ONT) modems (ZTE GM220-S & XPON) used by Internet Service Providers (ISP). It detects optical power degradation before customers experience Loss of Signal (LOS).

For full technical and operational guides, see:
- [Architecture & Design](docs/architecture.md)
- [Operational Guide & SOP](docs/operations_guide.md)
- [Quality Document](docs/quality-document.md)
- [Android Studio Prompt](docs/PROMPT_ANDROID_STUDIO.md)

## 2. Verification Commands
- Full verification pipeline: `make check` (The repo is in a consistent state when `make check` exits 0).
- Unit tests: `make test` or `pytest tests/`
- Clean state verification: `make clean-check`
- Feature verification: `make verify-feature F=<id>`
- Development server: `make dev`

## 3. Hard Constraints
- MUST NOT use emoji in any web UI components (`# source: SOP ISP 2026`).
- MUST NOT use empty HTML dot indicators (`# why: enforce semantic SVG icons`).
- MUST NOT write direct database queries in routes or controllers (`# why: Universal Laravel boundary separation`).
- MUST cascade delete customer child records on deletion (`# source: database.md`).
- Optical thresholds: Normal > -26.0 dBm, Warning -26.0 s/d -27.0 dBm, Critical <= -27.0 dBm (`# source: optical_sop`).
- Update docs in the same commit as the code change — no stale documentation.
- Commit atomicity rule: Each commit must represent one complete logical change (atomic commit); explain why the change was made, not just what changed.

## 4. State Files & Cross-Session Continuity
System state is tracked in Git across sessions:
- `PROGRESS.md`: Current state, latest commit hash, in-progress tasks, and next steps.
- `DECISIONS.md`: Architectural Decision Records (ADR).
- `feature_list.json`: Granular feature list and verification layers.

## 5. Session Lifecycle (Clock-In & Clock-Out)
- **Clock-In Routine:** Before touching code / session start: read `PROGRESS.md`, then run `make check` to confirm green baseline.
- **Clock-Out Routine:** Before closing / session end: update `PROGRESS.md` current state and next steps, run `make clean-check`, and commit.
- **Context Anxiety Warning:** If running low on context, do NOT rush to finish — stop, update `PROGRESS.md`, and commit a clean checkpoint.

## 6. Feature State Machine & Verification Model
- **WIP=1 Rule:** Only one active feature at a time.
- **Feature Granularity:** Each feature must be completable in one session. If it spans sessions, split it.
- **State Machine:** `not_started` → `active` → `passing`. Never set state to passing directly — run `make verify-feature F=<id>`.
- **Definition of Done:** A task is complete when runtime evidence passes — not when code is written or the agent is confident.
- **Three-Layer Model:** Layer 1 (syntax/static), Layer 2 (runtime behavior), Layer 3 (system confirmation / e2e). Layer ordering rule: Do not proceed to Layer N+1 if Layer N fails. Runtime signals: App startup and side effects must be verified.
- **Architecture Boundaries:** Layer model separates routes, services, and repositories (`make check-arch` enforces the constraints). Layer 3 (e2e) is required when changes cross component or domain boundaries.
- **Promotion Principle:** Every new error category caught in code review becomes a rule in `.harness/arch-rules.json`.

## 7. Observability & Clean-State Protocol
- **Observability:** Create a sprint contract (`templates/sprint-contract.md`), record session traces with `scripts/session-trace.sh`, and score each completed sprint against `templates/evaluator-rubric.md` — every dimension must reach B or above.
- **Clean-State Protocol:** Run `make clean-check` before committing — confirms build, no debug artifacts, PROGRESS.md updated.
- **Quality Document:** Update `docs/quality-document.md` for the module touched (A/B/C/D per dimension).
- **Dual-Mode Cleanup:** Immediate cleanup at every session end + periodic (weekly/monthly) full-system sweep for structural drift.


## 8. Tools & MCP Integrations
- Tool permissions and capability scoping are declared in `mcp.json` and `.claude/settings.json`.
- Permitted capabilities: file inspection and verification runner (`make check`, `make clean-check`).
