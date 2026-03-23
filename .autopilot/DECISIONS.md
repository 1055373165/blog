# Project Decisions

## ADR Index
- ADR-001: Algorithm Asset Domain Model
- ADR-002: Markdown Persistence Strategy
- ADR-003: Video Storage Strategy
- ADR-004: Learning Metadata Scope
- ADR-LANG: Go + TypeScript Quality Contract
- ADR-UI: Design System Contract
- ADR-SEC: Security Baseline Contract

## ADR-001: Algorithm Asset Domain Model
- Status: proposed
- Date: 2026-03-23
- Context: The project needs to represent one algorithm folder as one managed asset while supporting multiple markdown and video children, future extensibility, and admin-first management.
- Candidates:
  - Reuse `Article` as the primary model
  - Create a single `AlgorithmAsset` with files stored as JSON blobs
  - Create `AlgorithmAsset` + `AlgorithmAssetFile` relational models
- Decision: Create a dedicated `AlgorithmAsset` parent model plus `AlgorithmAssetFile` child records.
- Tradeoffs:
  - Adds new tables, handlers, types, and admin pages
  - Avoids semantic pollution of `Article`
  - Keeps future sync/import history extensible without redesigning phase-1 data
- Reversal conditions:
  - If the feature is later reduced to simple article publishing with one markdown and one video only
  - If future synchronization requirements prove a snapshot-first model is mandatory for all operations
- Impact scope:
  - `backend/internal/models`
  - `backend/internal/database`
  - `backend/internal/handlers`
  - `backend/cmd/main.go`
  - `frontend/src/types`
  - `frontend/src/api`
  - `frontend/src/pages/admin`
- Spike needed: no

## ADR-002: Markdown Persistence Strategy
- Status: proposed
- Date: 2026-03-23
- Context: Markdown files need to be searchable, previewable, editable later, and manageable as asset children without introducing unnecessary file-storage complexity.
- Candidates:
  - Upload markdown files as raw files and store only URLs
  - Persist markdown text in MySQL `longtext`
  - Hybrid storage with both file upload and DB content
- Decision: Read markdown client-side and persist content in the application database as structured text on `AlgorithmAssetFile`.
- Tradeoffs:
  - Larger DB rows than pure file storage
  - Simpler preview, search, and editing path
  - No secondary markdown storage lifecycle to maintain
- Reversal conditions:
  - If markdown corpus becomes too large for acceptable query performance
  - If future sync requires immutable binary preservation of original markdown files
- Impact scope:
  - `frontend/src/pages/admin`
  - `frontend/src/components/admin`
  - `backend/internal/handlers`
  - `backend/internal/models`
- Spike needed: no

## ADR-003: Video Storage Strategy
- Status: proposed
- Date: 2026-03-23
- Context: Algorithm assets need to manage mp4 files, but phase 1 should reuse existing infrastructure rather than invent a new media pipeline.
- Candidates:
  - Add a dedicated algorithm-video upload subsystem
  - Reuse existing `/api/upload/media`
  - Integrate object storage directly in phase 1
- Decision: Reuse the existing `/api/upload/media` upload and delivery pipeline, and store the resulting URL on `AlgorithmAssetFile.storage_url`.
- Tradeoffs:
  - Media path semantics remain generic, not algorithm-specific
  - Fastest path to reliable video hosting in phase 1
  - Future storage migration may require URL backfill or adapter logic
- Reversal conditions:
  - If algorithm videos later need dedicated retention, privacy, or transcoding policies
  - If current media pipeline becomes operationally insufficient for asset volume
- Impact scope:
  - `backend/internal/handlers/media.go` (reuse only)
  - `backend/internal/handlers/algorithm_assets.go`
  - `frontend/src/api/client.ts`
  - `frontend/src/components/admin`
- Spike needed: no

## ADR-004: Learning Metadata Scope
- Status: proposed
- Date: 2026-03-23
- Context: Phase 1 must improve learning recall quality without triggering a structural rewrite of the existing study-plan system.
- Candidates:
  - Reuse `StudyPlan` / `StudyItem` immediately
  - Add lightweight learning fields directly on `AlgorithmAsset`
  - Defer all learning support to later phases
- Decision: Add lightweight learning fields directly on `AlgorithmAsset` in phase 1: `summary_note`, `weak_points`, `review_status`, `next_review_at`.
- Tradeoffs:
  - Creates a temporary parallel learning surface outside the existing study system
  - Avoids premature abstraction away from `ArticleID`
  - Gives immediate recall support with minimal implementation risk
- Reversal conditions:
  - If algorithm assets need scheduled reminders, analytics, or unified cross-content study plans
  - If phase 2 confirms the need for a generic study target abstraction
- Impact scope:
  - `backend/internal/models`
  - `backend/internal/handlers`
  - `frontend/src/types`
  - `frontend/src/pages/admin`
  - `frontend/src/components/admin`
- Spike needed: no

## ADR-LANG: Go + TypeScript Quality Contract

### Go Quality Contract
- Status: proposed
- Date: 2026-03-23
- Context: Backend work will add new models, handlers, and routing in Go, and needs to remain idiomatic with the existing Gin/GORM codebase.
- Candidates:
  - Follow ad hoc local style
  - Apply a stricter Go contract for new backend code
- Decision: Use the following Go checklist for all backend MDUs.
- Tradeoffs:
  - Slightly slower authoring due to stricter interfaces and error handling
  - Better long-term maintainability and reviewability
- Reversal conditions:
  - None unless project language stack changes substantially
- Impact scope:
  - `backend/**/*`
- Spike needed: no
- Checklist:
  - [ ] Errors: wrap with `fmt.Errorf("context: %w", err)` where errors cross boundaries; never discard fallible results
  - [ ] Receivers: single-letter receivers matching the type initial
  - [ ] Interfaces: define at consumer site only; do not introduce speculative interfaces
  - [ ] Context: only add `context.Context` to public functions when I/O or cancellation semantics exist
  - [ ] Naming: MixedCaps, no underscores, acronyms in standard Go form (`ID`, `URL`, `HTTP`)
  - [ ] Zero values: model structs should remain GORM-friendly and not require constructors
  - [ ] Goroutines: no fire-and-forget goroutines added for this feature
  - [ ] Packages: place feature code by domain (`models`, `handlers`), not in generic helper packages

### TypeScript Quality Contract
- Status: proposed
- Date: 2026-03-23
- Context: Frontend work will add admin pages, API modules, and types in TypeScript/React and must fit the existing app structure cleanly.
- Candidates:
  - Reuse loose typing patterns
  - Apply a stricter TypeScript contract for new frontend code
- Decision: Use the following TypeScript checklist for all frontend MDUs.
- Tradeoffs:
  - More explicit typing and slightly more boilerplate
  - Lower regression risk across API/UI boundaries
- Reversal conditions:
  - None unless frontend stack changes substantially
- Impact scope:
  - `frontend/src/**/*`
- Spike needed: no
- Checklist:
  - [ ] Strict typing: no `any` in new code unless isolated to third-party gaps with an explanatory comment
  - [ ] Unions: use literal unions for status fields and file kinds instead of stringly-typed assumptions
  - [ ] Null safety: use optional chaining and nullish coalescing for partial payloads
  - [ ] Exports: use named exports for API helpers and reusable components
  - [ ] Async: use `async/await` with explicit error handling at action boundaries
  - [ ] Immutability: `const` by default; avoid mutable shared objects in component state
  - [ ] Components: co-locate prop types/interfaces and avoid broad prop spreading
  - [ ] API payloads: normalize backend responses before UI rendering when optional fields exist

## ADR-UI: Design System Contract
- Status: proposed
- Date: 2026-03-23
- Context: The feature extends an existing admin workspace and must match current design language without introducing decorative UI drift.
- Candidates:
  - New bespoke visual language for algorithm management
  - Reuse current admin system with explicit design tokens
- Decision: Extend the existing admin workspace language with explicit, constrained tokens.
- Tradeoffs:
  - Less visual novelty
  - Faster implementation and lower inconsistency risk
- Reversal conditions:
  - If algorithm management later becomes a public-facing learning product with distinct branding
- Impact scope:
  - `frontend/src/pages/admin`
  - `frontend/src/components/admin`
- Spike needed: no

1. User & Task:
   - Primary user: admin/site owner
   - Primary task: create, curate, review, and revisit algorithm assets
   - Page type: workspace
   - Information density: high

2. Color Palette:
   - Primary: `#0d9488` — used for primary actions, active navigation, selected states
   - Neutral: `#f8fafc` / `#e2e8f0` / `#475569` / `#0f172a` — used for surfaces, borders, text
   - Accent: `#0284c7` — used for links, upload-related highlights, preview emphasis
   - Semantic: error `#dc2626`, warning `#d97706`, success `#16a34a`
   - Dark mode: yes — method: existing ThemeProvider + Tailwind `dark:` classes

3. Type Scale (max 5 levels):
   - Display: `30px / 700` — used for page titles only
   - Heading: `24px / 700` — used for section headers
   - Subheading: `18px / 600` — used for panel titles and form groups
   - Body: `14px / 400` — used for primary content and table rows
   - Caption: `12px / 500` — used for metadata, timestamps, and helper text

4. Spacing Scale:
   - Base unit: `4px`
   - Tokens: `4 / 8 / 12 / 16 / 24 / 32 / 48`
   - Component internal padding: `16`
   - Section gap: `24`
   - Page margin: `24`

5. Border Radius:
   - Small (buttons, inputs): `8px`
   - Medium (cards, panels): `12px`
   - Large (modals, overlays): `16px`

6. Component Inventory:
   - admin toolbar
   - filter bar
   - asset table/list
   - metadata form
   - markdown file panel
   - video file panel
   - markdown preview panel
   - learning notes panel
   - status badge
   - upload progress indicator
   - toast/error notice

7. Layout:
   - Navigation: side — sticky within existing admin shell
   - Content area: full-width workspace with max content width `1440px`
   - Grid system: flexbox + CSS grid — breakpoints follow existing Tailwind `md / lg / xl`

8. Motion:
   - Transitions: `150ms ease-out` — only for hover, panel expansion, and selection changes
   - Loading states: inline spinner for actions, skeleton or placeholder blocks for initial list/detail load
   - No animation on: markdown preview body, table row reflow, video player area

## ADR-SEC: Security Baseline Contract
- Status: proposed
- Date: 2026-03-23
- Context: The feature accepts external input through authenticated admin routes, file uploads, and metadata editing, so security boundaries must be explicit.
- Candidates:
  - Reuse implicit existing security posture only
  - Define feature-specific security baseline for algorithm asset management
- Decision: Use the following security baseline for all algorithm-asset MDUs.
- Tradeoffs:
  - Adds validation and permission checks that increase implementation detail
  - Reduces risk of unsafe uploads, malformed markdown ingestion, and admin route exposure
- Reversal conditions:
  - None unless the auth or hosting model changes significantly
- Impact scope:
  - `backend/cmd/main.go`
  - `backend/internal/handlers`
  - `frontend/src/api`
  - `frontend/src/pages/admin`
- Spike needed: no

1. Trust Boundaries:
   - External inputs: authenticated admin HTTP JSON payloads, route params, query params, markdown file text read by the frontend, video upload responses, browser localStorage auth header, and media URLs returned by the backend
   - Trusted zones: validated handler inputs, persisted database records, authenticated admin context, existing media endpoint after server-side checks
   - Validation strategy: validate required fields, enum values, ownership/admin privileges, file-kind boundaries, and string length at handler boundaries before persistence

2. Authentication:
   - Method: JWT bearer token using the existing auth flow
   - Token storage: secure header populated from existing localStorage-backed auth client
   - Session expiry: existing project JWT policy

3. Authorization:
   - Model: RBAC (admin-only for phase-1 algorithm asset endpoints)
   - Enforcement point: admin/auth middleware at route group level plus resource existence checks in handlers

4. Secrets Management:
   - Storage: environment variables only
   - Rotation: follow existing deployment secret rotation practice
   - `.env.example`: maintained: yes

5. Data Protection:
   - PII fields: minimal author linkage only (`author_id`)
   - Encryption at rest: no application-layer encryption; rely on infrastructure/database controls
   - Encryption in transit: TLS enforced in production: yes

6. Dependency Policy:
   - Max new deps per MDU: `2`
   - Audit command: `npm audit` for frontend dependency additions, `go list -m all` + standard review for Go additions
   - Lock file: committed: yes

## Spike Candidates
None. All selected technical decisions are already supported by the current codebase and prior implementation patterns.

## ADR-TEST: Testing Strategy

1. Test Pyramid:
   - Unit test ratio: 60%
   - Integration test ratio: 30%
   - E2E test ratio: 10% (manual in phase 1)

2. Framework:
   - Unit: `go test` for backend units/handlers; TypeScript compile/build verification for frontend MDUs
   - Integration: authenticated local API + admin workflow smoke verification against the running app
   - E2E: none automated in phase 1; manual checklist only

3. Coverage Policy:
   - Minimum per MDU: at least one executable verification artifact
   - Critical paths: algorithm asset CRUD, markdown file creation/update, primary file selection, video upload linkage, learning metadata updates
   - Excluded: existing unrelated admin pages, generated uploads, deployment config files

4. Test Data:
   - Strategy: inline fixtures for backend tests; local sample markdown and mp4 files for manual verification
   - External services: reuse local dev backend and existing upload/media endpoint; no new external services in tests
   - Cleanup: automatic test cleanup where feasible; manual cleanup for uploaded test media if created

5. CI Integration:
   - Run on: manual/local for phase 1 before marking MDUs complete
   - Blocking: failed `go test`, failed frontend build, or failed manual critical-path check blocks completion
   - Flaky test policy: fix immediately; no quarantine in phase 1

6. MDU Verification Default:
   - Minimum: backend MDU adds at least one `go test` case when it introduces new handler/model logic; frontend MDU must include `npm run build` or equivalent plus manual verification notes
   - When no test framework exists: document executable manual steps and use compile/build verification as the minimum safety net
