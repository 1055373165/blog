# Phase 2 — Philosophy Extraction: Design Principles & Architectural Wisdom

## Role

You are a technical philosopher. Your job is to ascend from concrete implementation details
to abstract-but-executable design principles — the kind that make someone say
"this is the soul of this project."

## Prerequisites

- `.distill/phase-0-architecture-map.md` exists
- `.distill/phase-1-module-summaries.md` exists
- `.distill/phase-1-modules/*.md` — all module analyses exist

Read all of these before starting. You need the full picture to extract cross-cutting patterns.

## Key Distinction

A design philosophy is NOT a fact about the code ("uses TypeScript", "has 12 modules").
It is a **belief that guided a series of consistent decisions** across the codebase.

Test: If you can't point to at least 2 different modules where the same principle
manifests in different forms, it's an observation, not a philosophy.

## Output Structure

Write to `.distill/phase-2-design-philosophy.md`:

---

### 1. Core Design Principles (5-8)

For each principle:

#### Principle N: `<Memorable Short Name>`

**Statement**: One sentence, imperative mood, actionable.
Good: "Treat errors as data — wrap, enrich, and propagate; never swallow or log-and-continue."
Bad: "Error handling is important."

**Code evidence** (minimum 2 modules):

- Module A (`path/file:lines`): How this principle manifests here
- Module B (`path/file:lines`): How the same principle manifests differently here

**Violation symptoms**: What specific problems appear in code that violates this principle?
Be concrete: "Functions grow beyond 200 lines because..." not "Code becomes messy."

**Boundary conditions**: When does this principle NOT apply? Every principle has limits.
Naming them shows you truly understand the principle, not just observed a pattern.

**Tension with other principles**: Does this principle ever conflict with another principle
in this list? How does the codebase resolve the tension?

---

### 2. Architecture Trade-off Map

For each of these classic tension pairs, describe where this codebase lands and why:

#### Simplicity ↔ Flexibility

- Where on the spectrum? Evidence?
- Which modules lean toward simplicity? Which toward flexibility? Why the difference?

#### Performance ↔ Readability

- Are there modules where performance was prioritized over clarity? Vice versa?
- What's the default stance, and when does the codebase deviate?

#### Consistency ↔ Local Optimality

- Does the codebase enforce uniform patterns even when a special case would be more efficient?
- Or does it allow module-level deviations? Under what criteria?

#### Explicit ↔ Conventional

- How much is configured explicitly vs. relies on naming conventions or defaults?
- Where is this choice most visible?

#### Early Abstraction ↔ Deferred Abstraction

- Does the codebase abstract preemptively or wait for duplication?
- Evidence of YAGNI? Evidence of premature abstraction?

#### Centralized Control ↔ Distributed Autonomy

- Is there a central orchestrator or do modules self-coordinate?
- How are cross-cutting concerns (logging, auth, errors) handled?

---

### 3. Architect Simulation

You have now internalized this codebase's design philosophy. Prove it by reasoning
through these scenarios AS THE ORIGINAL ARCHITECT WOULD — not as you personally would:

**Scenario A — New Feature Module**:
A new capability needs to be added that doesn't fit any existing module.
How would this codebase's architect structure it? What patterns would they reach for?
What would they explicitly avoid?

**Scenario B — Plugin Extraction**:
A tightly coupled component needs to become pluggable.
What's the likely extraction strategy? Where would the interface boundary be drawn?

**Scenario C — Cross-Cutting Concern**:
A new requirement touches 5+ modules (e.g., audit logging, rate limiting).
How does this architecture handle horizontal concerns? Middleware? Decorators? Event bus?

**Scenario D — New Dependency**:
An external service or library needs to be integrated.
Where would the adapter live? How would it be isolated from core logic?

**Scenario E — Code Review**:
A junior developer submits a PR that works correctly but violates the design philosophy.
What specific feedback would you give? Which principles would you cite?

For each scenario, your answer must:
1. Reference specific principles from Section 1
2. Reference specific existing patterns from Phase 1
3. Explicitly state what would be WRONG to do (the anti-pattern)

---

### 4. Industry Positioning

Compare this codebase's design philosophy with 2-3 well-known projects or paradigms
that are most relevant. Choose comparisons that illuminate — not random famous projects.

For each comparison:

- **Shared DNA**: What design beliefs do they share? Be specific.
- **Divergence points**: Where do they disagree, and what does each choice optimize for?
- **Unique contributions**: What does THIS codebase do that you haven't seen elsewhere,
  or does unusually well?

Avoid: "Both are well-designed." That tells the reader nothing.

---

### 5. Hypothesis Final Status

Update ALL hypotheses from Phase 0 with final verdicts:

```
[H1] <Original hypothesis>
     Final status: VERIFIED / REFUTED / REFINED
     Summary of evidence: <one paragraph>
     Refined statement (if applicable): <updated hypothesis>
```

---

## Self-Check

1. Does every principle have evidence from ≥2 different modules?
2. Are "violation symptoms" concrete enough to use as code review criteria?
3. Do the architect simulation answers feel consistent with the actual codebase's style?
4. Are industry comparisons specific (not "both use good practices")?
5. Are all Phase 0 hypotheses resolved?
