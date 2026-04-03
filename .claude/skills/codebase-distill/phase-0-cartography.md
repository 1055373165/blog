# Phase 0 — Cartography: Architecture Map

## Role

You are a reverse-engineering architect. Your task is to build a global cognitive map
of the codebase **without reading implementation details**. You work only from:

- Directory tree
- Entry point files (main.*, index.*, app.*, cmd/*)
- Config files (package.json, go.mod, Cargo.toml, pyproject.toml, etc.)
- README and documentation files
- Interface/type definition files (*.d.ts, types.go, interfaces/, etc.)

## Execution Steps

### 1. Gather structural inputs

```
Read the directory tree (use find/ls or equivalent).
Read all config/manifest files.
Read the README.
Read entry point files (only the top-level orchestration, not deep implementations).
Read any architecture docs if they exist.
```

Do NOT read implementation files yet. Resist the urge to dive into source code.

### 2. Produce the Architecture Map

Write the following sections to `.distill/phase-0-architecture-map.md`:

---

#### 2.1 System Boundary Map

Describe in prose + ASCII diagram:
- What inputs does this system accept? (CLI args, HTTP requests, file input, etc.)
- What outputs does it produce? (files, API responses, side effects, etc.)
- What external services/libraries does it depend on?
- What is the deployment model? (CLI tool, web service, library, etc.)

#### 2.2 Module Dependency Graph

List every top-level module/package/directory that constitutes a meaningful unit.
For each module:
- **Name**: directory or package name
- **One-line role**: what is its responsibility?
- **Depends on**: which other modules does it import/reference?
- **Depended by**: which modules import/reference it?

Express dependencies as: `A → B` (A depends on B).
Every edge must cite evidence (import statement, config reference, or interface contract).

#### 2.3 Data Flow Overview

Trace the primary data flow from user input to final output.
Describe each transformation stage. Use an ASCII pipeline diagram:

```
[User Input] → [Parser] → [IR] → [Processor] → [Output]
```

Identify: Where is state held? Where do side effects happen? Where are the I/O boundaries?

#### 2.4 Architecture Style Judgment

Classify the architecture style. Possibilities include but are not limited to:
- Layered (presentation → business → data)
- Pipeline / streaming
- Event-driven / reactive
- Plugin / microkernel
- Hexagonal / ports-and-adapters
- Monolith / modular monolith
- Client-server

Provide **specific evidence** for your classification.
If the architecture is a hybrid, name the dominant style and note where it deviates.

#### 2.5 Deep-Read Priority Queue

Rank modules into three tiers for Phase 1 deep reading:

**Tier 1 — Skeleton** (read first): Modules that define the control flow and data flow spine.
These are the modules where, if you understand them, you understand how the system works at a high level.

**Tier 2 — Core** (read second): Modules containing the primary business/domain logic.
These are where the "interesting" engineering decisions live.

**Tier 3 — Support** (read last, selectively): Utilities, I/O adapters, config loaders, CLI parsers.
Read only if needed to understand a Tier 1/2 module.

For each module in the queue:
- One sentence explaining why it's at this priority level
- Estimated complexity (low / medium / high) based on file count and apparent scope

#### 2.6 Initial Design Hypotheses

Based purely on structural observation, propose 3-5 hypotheses about the codebase's
design philosophy. These MUST be **falsifiable** — Phase 1 will confirm or refute each one.

Format:
```
[H1] <Hypothesis statement>
     Evidence: <what you observed that suggests this>
     Falsification: <what you would expect to see if this is WRONG>
     Status: UNVERIFIED
```

Examples of good hypotheses:
- "The codebase favors explicit configuration over convention-based defaults"
- "Error handling follows a fail-fast strategy with no silent swallowing"
- "The module boundary follows the dependency inversion principle — core modules never import from infrastructure"

Examples of BAD hypotheses (too vague to falsify):
- "The codebase follows best practices"
- "The code is well-organized"

---

## Output

Save to: `.distill/phase-0-architecture-map.md`

## Self-Check Before Presenting

1. Does every dependency edge have a cited source?
2. Are there ≤10 modules in the priority queue?
3. Is every hypothesis falsifiable?
4. Did you avoid reading any implementation files?
5. Could another developer use this map to navigate the codebase without prior knowledge?
