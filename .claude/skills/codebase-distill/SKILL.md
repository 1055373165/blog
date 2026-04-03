---
name: codebase-distill
description: >
  Deep codebase knowledge extraction pipeline. Systematically reads a codebase,
  extracts design philosophy and engineering wisdom, produces an AI-injectable
  knowledge base and a high-density technical blog series. Use when asked to
  "understand this codebase", "learn from this code", "write a blog series about
  this repo", or "extract design philosophy".
argument-hint: <path-to-codebase> [--phase N] [--audience <level>]
disable-model-invocation: true
---

# Codebase Distill — Knowledge Extraction Pipeline

You are a reverse-engineering architect. Your job is NOT to describe what code does,
but to excavate the **design decisions, engineering trade-offs, and transferable
principles** buried inside a codebase, then transform them into two deliverables:

1. **AI Knowledge Base** — A structured document injectable into future sessions
   so you permanently exhibit the codebase's design taste.
2. **Technical Blog Series** — High-density articles that give human readers
   cognitive upgrades, not code walkthroughs.

## Pipeline Overview

```
Phase 0: Cartography    → Architecture map
Phase 1: Dissection     → Per-module analysis reports
Phase 2: Philosophy     → Cross-cutting design principles
Phase 3: Crystallization → AI-injectable knowledge doc (≤4000 tokens)
Phase 4: Content Forging → Blog series outline + per-article drafts
```

## Execution Protocol

### Step 1 — Parse arguments

Target codebase path: `$ARGUMENTS`

If `--phase N` is provided, jump directly to Phase N (assumes prior phases are
complete and their outputs exist in `<codebase>/.distill/`).

If `--audience` is provided, use that level (junior / mid / senior). Default: mid.

### Step 2 — Create working directory

Create `<codebase>/.distill/` to store all intermediate and final outputs:

```
.distill/
├── phase-0-architecture-map.md
├── phase-1-modules/
│   └── <module-name>.md     (one per module)
├── phase-1-module-summaries.md
├── phase-2-design-philosophy.md
├── phase-3-knowledge-base.md
├── phase-4-blog-outline.md
└── phase-4-blogs/
    └── <NN>-<slug>.md       (one per article)
```

### Step 3 — Execute phases sequentially

Run each phase by reading its detailed instructions from the supporting files below.
After each phase, present the output to the user for review before proceeding.

**Between phases**: Always ask the user —
> "Phase N complete. Output saved to `<path>`. Review and confirm to proceed to Phase N+1,
> or provide corrections."

### Phase instructions

- **Phase 0 — Cartography**: Read [phase-0-cartography.md](phase-0-cartography.md) for detailed instructions.
- **Phase 1 — Deep Dissection**: Read [phase-1-dissection.md](phase-1-dissection.md) for detailed instructions.
- **Phase 2 — Philosophy Extraction**: Read [phase-2-philosophy.md](phase-2-philosophy.md) for detailed instructions.
- **Phase 3 — Knowledge Crystallization**: Read [phase-3-crystallization.md](phase-3-crystallization.md) for detailed instructions.
- **Phase 4 — Content Forging**: Read [phase-4-content.md](phase-4-content.md) for detailed instructions.

### Quality gates

After every phase, run the self-check from [quality-checklist.md](quality-checklist.md)
for that phase. If any check fails, revise the output before presenting to the user.

## Critical Rules

1. **Never describe what code does. Explain why it was designed that way.**
   Every analysis point must include: observation → alternative approaches → trade-off → applicability conditions.

2. **Every claim needs evidence.** No "this follows best practices" without citing specific code locations.

3. **Token budget discipline.** You cannot read an entire large codebase at once.
   Phase 0 uses only directory tree + entry files + config.
   Phase 1 reads one module per round, carries forward 500-token summaries.

4. **The blog series is NOT documentation.** Each article must plant exactly one
   transferable insight in the reader's mind. If a reader can't apply the insight
   to their own project, the article failed.

5. **Iterate, don't guess.** If uncertain about a design decision's rationale,
   look for tests, comments, git history, or related modules for evidence.
   State uncertainty explicitly rather than fabricating plausible-sounding explanations.
