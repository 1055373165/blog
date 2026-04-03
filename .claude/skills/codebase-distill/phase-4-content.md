# Phase 4 — Content Forging: Technical Blog Series

This phase has two sub-phases: **4a** (series architecture) and **4b** (per-article writing).

## Prerequisites

- `.distill/phase-3-knowledge-base.md` exists
- `.distill/phase-2-design-philosophy.md` exists
- `.distill/phase-1-modules/*.md` exist (for deep-dive source material)

## Sub-Phase 4a: Series Architecture

### Role

You are a technical content architect. You design **cognitive journeys**, not article lists.
Each article is a station where the reader gains one irreversible insight. The series
as a whole transforms a competent developer into someone with architectural intuition.

### Audience Calibration

Based on the `--audience` flag:

- **junior**: More context scaffolding, more analogies, explain patterns before analyzing them.
  2500-3500 words per article.
- **mid** (default): Assume familiarity with common patterns, focus on the non-obvious.
  2000-3000 words per article.
- **senior**: Skip basics entirely, go straight to trade-off analysis and transferable principles.
  1500-2500 words per article.

### Series Design Rules

1. **6-10 articles total.** Fewer is better if each one hits harder.
2. **One core insight per article.** If you can't state it in one sentence, split the article.
3. **Cognitive ladder**: Each article builds on the mental model from previous ones.
   Article 5 should be incomprehensible without articles 1-4, but feel inevitable after them.
4. **No orphan articles.** Every article must reference at least one other article in the series
   (forward or backward reference).

### Required Article Types

The series MUST include these archetypes (but titles should be compelling, not categorical):

| Type | Count | Purpose |
|------|-------|---------|
| **Panorama** | 1 | Build the reader's global mental model in 10 minutes |
| **Deep Dive** | 3-4 | Archaeology of the most interesting design decisions |
| **Philosophy** | 1-2 | Ascend from code to transferable principles |
| **Migration** | 1 | Show how to apply these insights to the reader's own project |

### Output Format

Write to `.distill/phase-4-blog-outline.md`:

```markdown
# <Series Title>

## Series Thesis
<One paragraph: what transformation does the reader undergo from start to finish?>

## Cognitive Dependency Graph
<ASCII diagram showing which articles must be read before which>

## Article Plan

### Article 1: <Title>
- **Type**: Panorama / Deep Dive / Philosophy / Migration
- **Core insight**: <one sentence — THE thing the reader takes away>
- **Reader unlock**: <what can the reader DO after this that they couldn't before?>
- **Depends on**: None / Article N
- **Key source material**: <which .distill files to draw from>
- **Hook sketch**: <2-3 sentence opening that grabs attention>

### Article 2: <Title>
...
```

### Present to user for review before proceeding to 4b.

---

## Sub-Phase 4b: Per-Article Writing

### Role

You are a writer who makes technical concepts feel exciting. Not a textbook author.
Not a documentation writer. Your articles make readers open their editor immediately after reading.

### Per-Article Process

For each article (in series order):

1. Read the article plan from `.distill/phase-4-blog-outline.md`
2. Read the relevant source material (knowledge base + specific module analyses)
3. Write the article following the structure below
4. Run the quality checklist
5. Save to `.distill/phase-4-blogs/NN-<slug>.md`

### Article Structure

```markdown
# <Title>

<Hook: 150-200 words. Start with ONE of these patterns:>
  - A pain point the reader has felt ("You've been here before...")
  - A counter-intuitive fact ("Most developers assume X. They're wrong.")
  - A concrete before/after ("Here's a 200-line function. Here's the same logic in 40 lines.")
  - A provocative question ("What if your error handling strategy is the biggest source of bugs?")

NEVER start with: "In this article, we will discuss..."

---

<Body: organized into 3-5 sections, each with a clear subheading>

Each section should follow this micro-structure:
1. **Setup**: Why should you care about this specific thing? (1-2 paragraphs)
2. **Reveal**: The insight, pattern, or decision (with code evidence)
3. **Counter-argument**: "But what about...?" / "Why not just...?" Address it honestly.
4. **Takeaway**: One sentence crystallizing what this section taught you.

Code snippets:
- Show ONLY the lines that illustrate the point. No full file dumps.
- Always pair code with prose explaining the NON-OBVIOUS part.
- If showing a pattern, also show the anti-pattern for contrast.

Paragraphs: ≤5 sentences. Use whitespace generously.
Subheadings: Every 300-500 words.

---

## What You Can Do Monday Morning

<1-3 concrete, actionable steps the reader can take in their own project.
Not "think about your architecture" but "open your main entry point and check
whether your dependency injection follows X pattern. If not, try refactoring
module Y to use Z approach.">

---

<Transition to next article: 1-2 sentences that create anticipation.
"We've seen how X works at the module level. But what happens when X meets Y
at the system level? That's where things get interesting.">
```

### Writing Quality Rules

1. **The "delete test"**: For every paragraph, ask "if I delete this, does the article lose
   something irreplaceable?" If no, delete it.
2. **The "so what?" test**: After every technical explanation, the next sentence should answer
   "why does this matter to ME?"
3. **The "specificity test"**: Replace every vague word. "Good" → "reduces error propagation
   to a single module." "Clean" → "reads top-to-bottom without needing to jump to other files."
4. **No AI slop**: Ban these phrases: "Let's dive in", "It's worth noting", "In conclusion",
   "As we can see", "This is a powerful pattern", "elegantly handles". Write like a human
   who is genuinely excited about a specific technical insight.

### Per-Article Self-Check

Before saving each article, verify:

1. [ ] Can I state the core insight in one sentence? Does the article deliver it?
2. [ ] Is there at least one "if you don't do this, here's what goes wrong" section?
3. [ ] Does every code snippet have prose explaining the non-obvious part?
4. [ ] Is there a concrete "What You Can Do Monday Morning" section?
5. [ ] Pick any 200-word passage — does it contain a non-trivial observation?
6. [ ] Would I share this article with a colleague? Would they learn something?
7. [ ] Does it transition naturally to the next article in the series?

### Iteration Protocol

After every 2 articles, present to the user:

> "Completed articles [N] and [N+1]. Core insights delivered:
> - Article N: <insight>
> - Article N+1: <insight>
> Shall I continue, or would you like revisions?"
