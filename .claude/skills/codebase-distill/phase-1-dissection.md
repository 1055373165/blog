# Phase 1 — Deep Dissection: Per-Module Analysis

## Role

You are a code archaeologist. You don't describe what code does — you excavate
**why it was designed that way**, what alternatives existed, and what trade-offs
were made. Every observation must include evidence.

## Prerequisites

- Phase 0 architecture map exists at `.distill/phase-0-architecture-map.md`
- Read it before starting. Keep the hypotheses list visible for verification.

## Execution Strategy

### Token budget management

You cannot read the entire codebase at once. Follow this protocol:

1. Process modules **one at a time**, in the priority order from Phase 0.
2. For each module, read all its files (if they fit in context), or read in order:
   interfaces/types → main logic → helpers → tests.
3. After analyzing each module, produce a **≤500 token summary** appended to
   `.distill/phase-1-module-summaries.md`. This summary travels forward as context
   for subsequent modules.
4. When analyzing module N, inject:
   - The Phase 0 architecture map
   - All prior module summaries (from the summaries file)
   - The full code of module N

### Per-module analysis template

For each module, create `.distill/phase-1-modules/<module-name>.md` with:

---

## Module: `<name>`

**Path**: `<relative path>`
**Core responsibility** (one sentence): ...

### 1. Contract Analysis

**Inputs**: What does this module accept? Types, formats, constraints.
**Outputs**: What does it promise to return? Types, guarantees, error modes.
**Invariants**: What conditions must always hold for this module to function correctly?

### 2. Boundary Decisions

Why is the boundary drawn here and not elsewhere?
What would happen if this module's responsibilities were split differently?

Consider:
- What would break if you merged this with an adjacent module?
- What would break if you split this module into two?
- Is this boundary driven by domain logic, deployment constraints, or team organization?

### 3. Design Decision Archaeology (minimum 3 per module)

For each non-obvious design choice:

| Aspect | Detail |
|--------|--------|
| **Observation** | What the code actually does (cite file:line) |
| **Alternative A** | A different, reasonable approach (be specific and concrete) |
| **Alternative B** | Another different approach |
| **Author's likely rationale** | Why the current approach was chosen |
| **Advantages** | What dimensions benefit from this choice |
| **Costs** | What was sacrificed or made harder |
| **When to reconsider** | Under what changed conditions would an alternative be better |

**Anti-pattern to avoid**: "Alternative: could have done it differently" is not an alternative.
Name a specific pattern, library, or approach. Be concrete enough that someone could implement it.

### 4. Pattern Catalog

For each design pattern, architectural pattern, or coding convention found:

- **Pattern**: Name it (GoF name, or descriptive name if domain-specific)
- **Location**: Where in the module (file:line range)
- **Problem it solves**: What specific problem does it address HERE (not in general)
- **How it's adapted**: If it's a variation on a standard pattern, what's different and why?

### 5. Code Quality Signals

**Strengths** — Specific practices worth emulating:
- Cite exact locations. "Good error handling" is worthless. "Wraps all external API errors
  with context at parser.go:145-160, preserving the original error chain" is useful.

**Improvement opportunities** — Potential tech debt or suboptimal choices:
- Be respectful but honest. Focus on structural issues, not style preferences.

**Test strategy insights**:
- What does the test coverage pattern tell you about what the authors consider critical?
- Are there untested areas that seem risky?

### 6. Hypothesis Verification

For each Phase 0 hypothesis, state whether this module provides:
- **Supporting evidence**: [H_N_] is supported because... (cite code)
- **Contradicting evidence**: [H_N_] is contradicted because... (cite code)
- **Refinement needed**: [H_N_] should be revised to... because...
- **No relevant evidence**: This module doesn't touch [H_N_]

### 7. Module Summary (≤500 tokens)

Compress the above into a dense summary covering:
- What this module does and why it exists
- Its 2-3 most important design decisions
- Key patterns used
- Relationship to the rest of the system

This summary will be injected as context when analyzing future modules.
Append it to `.distill/phase-1-module-summaries.md`.

---

## Iteration Protocol

After every 2-3 modules, pause and ask the user:

> "Completed analysis of [modules]. Key findings so far: [1-2 sentence highlights].
> Shall I continue to the next module, revisit anything, or adjust the analysis depth?"

## Completion Criteria

Phase 1 is complete when:
- All Tier 1 and Tier 2 modules from Phase 0 have been analyzed
- Tier 3 modules have been analyzed if referenced by Tier 1/2 analyses
- All hypothesis statuses have been updated (verified / refuted / refined)
- `.distill/phase-1-module-summaries.md` contains all module summaries

## Self-Check

1. Does every "Design Decision Archaeology" entry have concrete alternatives (not vague)?
2. Does every pattern cite the specific problem it solves in THIS codebase?
3. Are all Phase 0 hypotheses addressed with evidence?
4. Are code quality observations backed by file:line citations?
5. Could a developer who hasn't read the code understand each module's role from the summary?
