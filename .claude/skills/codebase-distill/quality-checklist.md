# Quality Checklist — Per-Phase Verification Gates

Run the relevant section after completing each phase. If any check fails,
revise the output before presenting to the user.

## Phase 0: Cartography

- [ ] **Evidence-backed dependencies**: Every edge in the module dependency graph
  cites a specific source (import statement, config reference, or interface contract).
- [ ] **Bounded scope**: The priority queue contains ≤10 modules.
- [ ] **Falsifiable hypotheses**: Each hypothesis includes a "Falsification" field
  describing what you would expect to see if the hypothesis is WRONG.
- [ ] **No implementation leakage**: You did NOT read any implementation files.
  Only directory trees, entry points, configs, READMEs, and type definitions.
- [ ] **Navigator test**: Could a new developer use this map to find the right file
  for any given concern within 2 minutes?

## Phase 1: Deep Dissection

Per-module checks (run after EACH module):

- [ ] **Concrete alternatives**: Every "Design Decision Archaeology" entry names
  at least 2 specific, implementable alternative approaches — not "could be done differently."
- [ ] **Problem-bound patterns**: Every identified pattern explains what specific problem
  it solves IN THIS MODULE, not what it solves in general.
- [ ] **Cited quality signals**: Every strength and improvement opportunity references
  a specific file:line location.
- [ ] **Hypothesis engagement**: At least one Phase 0 hypothesis is explicitly addressed
  (supported, contradicted, or refined) with evidence.
- [ ] **Summary density**: The ≤500 token module summary captures the module's role,
  top 2-3 design decisions, key patterns, and system relationships.

Aggregate checks (run after ALL modules are complete):

- [ ] **Full hypothesis coverage**: Every Phase 0 hypothesis has been addressed by
  at least one module analysis.
- [ ] **No summary drift**: Module summaries are factually consistent with the full analyses.
- [ ] **Cross-module patterns visible**: Reading all summaries together, you can identify
  at least 2 patterns that repeat across 3+ modules.

## Phase 2: Philosophy Extraction

- [ ] **Cross-module evidence**: Every design principle cites evidence from ≥2 different modules.
- [ ] **Concrete violation symptoms**: Each principle's "violation symptoms" are specific enough
  to use as code review criteria. "Code gets messy" fails. "Functions exceed 200 lines because
  error handling is duplicated inline instead of centralized" passes.
- [ ] **Bounded principles**: Every principle has an explicit "does NOT apply when..." boundary.
- [ ] **Simulation consistency**: The architect simulation answers feel consistent with the
  actual codebase's patterns. If you showed them to the original author, they'd nod.
- [ ] **Specific comparisons**: Industry positioning names concrete divergence points,
  not "both are well-designed."
- [ ] **All hypotheses resolved**: Every Phase 0 hypothesis has a final VERIFIED / REFUTED / REFINED status.

## Phase 3: Knowledge Crystallization

- [ ] **Token budget**: Document is ≤4000 tokens.
- [ ] **Self-contained**: No sentence requires external context to understand.
  Every reference is explained inline.
- [ ] **Executable specificity**: Every principle reaches "When X, do Y, not Z" granularity.
  Search for and eliminate: "generally", "best practices", "it's recommended", "consider".
- [ ] **Blind quiz**: Using ONLY this document, you can answer:
  - "How should a new feature module be structured?"
  - "Where does a new external dependency adapter go?"
  - "What's wrong with [plausible code violation]?"
  If any answer feels vague, the document needs more specificity.
- [ ] **No generic advice**: Every statement is specific to THIS codebase.
  Delete anything that could appear in a generic "clean code" guide unchanged.

## Phase 4a: Blog Series Architecture

- [ ] **One insight per article**: Each article's "Core insight" is one sentence,
  and no two articles share the same core insight.
- [ ] **Cognitive ladder**: The dependency graph shows a clear progression.
  Later articles build on earlier ones.
- [ ] **Complete coverage**: The series includes all required article types
  (Panorama, Deep Dive ×3-4, Philosophy ×1-2, Migration ×1).
- [ ] **Compelling titles**: No article has a "Chapter N: Topic" style title.
  Each title should spark curiosity.
- [ ] **Reader unlock**: Each article's "Reader unlock" describes a concrete
  NEW CAPABILITY, not just "understands X."

## Phase 4b: Per-Article Writing

- [ ] **Hook test**: The opening 200 words do NOT start with "In this article"
  or any variant. They start with a scenario, question, or counter-intuitive fact.
- [ ] **200-word density test**: Pick any 200-word passage from the body.
  It must contain at least one non-trivial, non-obvious observation.
- [ ] **Anti-pattern present**: The article includes at least one
  "if you don't do this, here's what goes wrong" section.
- [ ] **Code-prose pairing**: Every code snippet has adjacent prose explaining
  the non-obvious aspect.
- [ ] **Monday Morning section**: The article ends with 1-3 concrete actions
  the reader can take in their own project within 15 minutes.
- [ ] **No AI slop**: Search for and remove: "Let's dive in", "It's worth noting",
  "In conclusion", "As we can see", "This is a powerful pattern", "elegantly".
- [ ] **Forward momentum**: The article ends with a natural transition to the next one.
