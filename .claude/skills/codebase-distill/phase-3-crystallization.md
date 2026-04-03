# Phase 3 — Knowledge Crystallization: AI-Injectable Knowledge Base

## Role

You are a knowledge engineer specializing in maximum-density information compression.
Your task is to distill all prior analysis into a single document that, when injected
into an AI assistant's context, causes it to exhibit the codebase's design taste
in all future interactions.

## Prerequisites

- `.distill/phase-0-architecture-map.md`
- `.distill/phase-1-module-summaries.md`
- `.distill/phase-2-design-philosophy.md`

Read all three before starting.

## Hard Constraints

- **≤4000 tokens total.** This document will be injected into system prompts or
  conversation openings. Every token costs context window space.
- **Self-contained.** A reader who has never seen the source code must understand
  every statement. No dangling references to "see module X" without explanation.
- **Executable, not descriptive.** Every principle must reach "When X, do Y, not Z" granularity.
  "Follow good practices" is banned. "When adding a new external dependency, wrap it in an
  adapter in `pkg/adapters/` that exposes only the interface your core logic needs" is good.
- **No hedging language.** Ban: "generally", "it's recommended", "you might want to consider".
  This document is a specification, not a suggestion list.

## Document Template

Write to `.distill/phase-3-knowledge-base.md`:

---

```markdown
# <Codebase Name> — Design Knowledge Base v1.0

## Architecture in 60 Seconds

<One paragraph: system type, primary data flow, deployment model, key technology choices.
Maximum 100 words. A new team member should be able to describe the system after reading this.>

## Core Design Principles

### 1. <Principle Name>
<One-sentence statement in imperative mood.>
- **Do**: <specific action with context>
- **Don't**: <specific anti-pattern with why it's wrong here>
- **Example**: <concrete scenario from the codebase>

### 2. <Principle Name>
...

<Repeat for 5-8 principles. Each principle block ≤150 tokens.>

## Pattern Quick Reference

| When you need to... | Use this pattern | Not this | Why |
|---------------------|-----------------|----------|-----|
| <scenario> | <recommended approach> | <anti-pattern> | <one-line rationale> |

<8-12 rows covering the most common design decisions.>

## Architecture Decision Checklist

When making any structural change, verify:

1. [ ] <Check derived from principle 1>
2. [ ] <Check derived from principle 2>
...
<One checklist item per core principle, phrased as a yes/no gate.>

## Code Style Contract

<Concrete, mechanically-enforceable rules. Not "write clean code" but
"All public functions in core modules return (result, error), never panic.
Error messages follow format: '<module>.<function>: <what failed>: <underlying cause>'.">

## Module Map (Quick Reference)

| Module | Role | Depends On | Key Pattern |
|--------|------|-----------|-------------|
| <name> | <one phrase> | <list> | <primary pattern> |

<One row per Tier 1 and Tier 2 module.>
```

---

## Compression Techniques

To hit the 4000-token budget:

1. **Merge overlapping principles.** If two Phase 2 principles are facets of the same
   belief, combine them into one with two facets.
2. **Prefer tables over prose** for structured information.
3. **Use imperative sentences.** "Wrap external deps in adapters" beats
   "External dependencies should be wrapped in adapter layers to ensure..."
4. **Cut examples that don't add information.** If the Do/Don't already makes the
   principle clear, skip the Example.
5. **Omit Tier 3 modules** from the module map unless they're referenced by a principle.

## Validation Protocol

After writing the document, perform these tests:

### Test 1: Blind Architecture Quiz

Pretend you have ONLY the knowledge base (no source code access). Answer:
1. "How should I structure a new feature module?"
2. "I need to add Redis caching — where does the adapter go?"
3. "What's wrong with this code?" (mentally construct a plausible violation)

If your answers feel vague or generic, the document needs more specificity.

### Test 2: Token Count

Count or estimate tokens. If over 4000, cut the least-critical table rows
and merge the most-similar principles.

### Test 3: Self-Containment

Read every sentence. If any sentence requires knowledge not present in this
document to understand, either add the context or remove the sentence.

## Self-Check

1. Is the document ≤4000 tokens?
2. Does every principle have Do/Don't at minimum?
3. Are all principles specific to THIS codebase (not generic software advice)?
4. Could you use the Architecture Decision Checklist in a real code review?
5. Is the Code Style Contract mechanically enforceable (not subjective)?
