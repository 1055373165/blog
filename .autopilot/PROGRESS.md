# Project Progress

## Autopilot State
- current_state: COMPLETED
- current_phase: 6
- current_task: delivery
- current_mdu: none
- execution_mode: INTERACTIVE
- auto_continue: false
- session_count: 1
- total_mdu: 11
- completed_mdu: 11
- completion_pct: 100
- last_updated: 2026-03-23T07:40:39+08:00

## Project Info
- Name: Algorithm Asset Management
- Goal: Build first-phase algorithm asset management in blog admin using Route A, mixed data model, and lightweight learning correction
- Created: 2026-03-23T03:45:11+08:00

## Locked Requirement
Core requirement:
Build a first-phase "算法学习" capability inside `/Users/smy/project/blog` admin that manages algorithm assets as first-class domain data, where one algorithm asset corresponds to one local folder and can contain multiple markdown files and multiple mp4 files.

Selected implementation direction:
- Route A only: offline generation, online management.
- Mixed data model: algorithm assets remain independent from `Article`.
- Learning-flow correction is included in phase 1, but it stays local to algorithm assets and does not integrate with the existing `StudyPlan` / `StudyItem` system in phase 1.

Phase 1 functional scope:
- Add an `算法学习` admin area.
- Support manual creation and manual file-based management in admin.
- Persist one folder-level asset with file-level children for markdown and video.
- Reuse the existing blog media upload pipeline for mp4 storage.
- Store markdown content in the application data model for search, rendering, and future editing.
- Support primary markdown and primary video selection when multiple files exist.
- Add lightweight learning fields on the asset itself: `summary_note`, `weak_points`, `review_status`, `next_review_at`.

Phase 1 explicit non-goals:
- No online generation workflow.
- No background worker or queue.
- No CLI sync in phase 1.
- No direct generalization of current study-plan data model.
- No forced projection into the article system.

Future-intended direction already reserved:
- When CLI sync is introduced in a later phase, its preferred location is `/Users/smy/project/algorithm`.
- Because that path is outside the current writable workspace, implementing that future sync script will require permission escalation or a revised placement decision at that time.

Expected users:
- Primary user is the admin/site owner managing locally generated algorithm assets and reviewing them from the deployed blog.

Important constraints and assumptions:
- Existing folder naming is inconsistent, so future metadata extraction cannot rely only on directory names.
- File-level modeling is mandatory because multiple markdown/video files already exist in the source set.
- Phase 1 should optimize for reliable asset management and learning recall support, not for generation automation.

## Architecture Summary
### Context Summary

- Backend stack: Go + Gin + GORM + MySQL, with route registration centralized in `backend/cmd/main.go`.
- Frontend stack: React + TypeScript + React Router, with admin routes centralized in `frontend/src/App.tsx` and sidebar navigation in `frontend/src/pages/admin/AdminLayout.tsx`.
- Existing reusable capabilities:
  - authenticated admin CRUD patterns (`prompts`, `skills`, `articles`)
  - typed frontend API client (`frontend/src/api/client.ts`)
  - video upload and delivery pipeline via `/api/upload/media`
  - existing study system that is article-bound and therefore not suitable for direct reuse in phase 1
- Requirement boundary: admin-only manual asset management in phase 1, no CLI sync, no worker, no study-system generalization.

### 1. Problem Decomposition

Core technical contradictions:
- The feature must treat algorithm content as a first-class domain object, but phase 1 must remain much lighter than a full content-generation platform.
- One asset maps to one source folder, but phase 1 does not ingest folders directly; the system still needs folder-compatible metadata without implementing sync.
- Learning correction is required, but the current study system is structurally tied to `ArticleID`.

Independent sub-problems:
- Domain modeling for folder-level asset + file-level children
- Admin CRUD and file-management experience
- Markdown ingestion path that avoids storing markdown as opaque binary files
- Video reuse through the existing media upload system
- Lightweight recall metadata that does not trigger a study-system refactor

Dependency graph:
- Data model → backend handlers/routes → frontend API/types → admin pages
- Existing media upload → algorithm video file records
- Learning metadata → asset detail UI only; no dependency on current study tables

### 2. Adversarial Check

Mainstream tempting solution:
- Reuse `Article` as the primary model and attach markdown/video metadata around it.

Why it fails under current constraints:
- Multiple markdown files and multiple videos do not fit article semantics cleanly.
- Article fields are optimized for publishing content, not representing an algorithm folder with file children and learning-specific review markers.
- Reusing `StudyItem` or `Article` now would create hidden coupling and make later folder-sync evolution harder, not easier.

Non-mainstream alternative:
- Build a full import-history/snapshot system now, anticipating later CLI sync.

Why it is not the current choice:
- Phase 1 explicitly excludes CLI sync.
- A snapshot/import subsystem is structurally sound but adds migration, UI, and state complexity that does not unlock the selected MVP.

Chosen architecture:
- Introduce a dedicated `AlgorithmAsset` model plus `AlgorithmAssetFile` child records in phase 1.
- Reserve a clean future extension path to `AlgorithmAssetSnapshot` or `AlgorithmImport` later, without implementing it now.

### 3. Constraint Identification

Explicit constraints:
- Route A only
- Mixed data model, not `Article`
- Manual admin management only in phase 1
- Learning correction remains local to algorithm assets

Implicit assumptions:
- Admin user is trusted to curate metadata manually where folder naming is inconsistent.
- Markdown volume is small enough that storing content in MySQL `longtext` is appropriate.
- Video storage needs can be satisfied by the current media upload pipeline.

What breaks if assumptions fail:
- If asset count or markdown size grows sharply, list/search performance may need dedicated indexing.
- If future sync becomes a hard requirement soon, the phase-1 API needs a follow-up import layer rather than direct reuse as-is.
- If end users, not just admin, need study-plan integration, the current study model will need abstraction beyond `ArticleID`.

### 4. Synthesis

System layering:
- Domain layer:
  - `AlgorithmAsset` = folder-level logical object
  - `AlgorithmAssetFile` = file-level child object
- Transport layer:
  - dedicated `/api/algorithm-assets` REST endpoints
- UI layer:
  - admin list page + asset detail/editor page
- Reused infrastructure:
  - existing auth middleware
  - existing upload/media endpoint for mp4
  - existing axios client and admin layout patterns

Chosen data model:

1. `AlgorithmAsset`
- Purpose: represent one algorithm folder as one managed asset
- Suggested fields:
  - `id`
  - `title`
  - `slug`
  - `leetcode_id` (nullable)
  - `source_url`
  - `source_dir_name`
  - `description`
  - `difficulty`
  - `tags` (JSON array)
  - `status` (`draft | ready | archived`)
  - `summary_note`
  - `weak_points`
  - `review_status` (`new | read | failed_recall | passed_recall | needs_review`)
  - `next_review_at` (nullable)
  - `primary_markdown_file_id` (nullable)
  - `primary_video_file_id` (nullable)
  - `author_id`
  - timestamps

2. `AlgorithmAssetFile`
- Purpose: represent one markdown or one video under an asset
- Suggested fields:
  - `id`
  - `asset_id`
  - `file_kind` (`markdown | video`)
  - `role` (`primary_analysis | supplement | animation | alternate_animation`)
  - `display_name`
  - `original_name`
  - `sort_order`
  - `is_primary`
  - `markdown_content` (for markdown only)
  - `storage_url` (for video only)
  - `mime_type`
  - `size_bytes`
  - timestamps

Core interfaces:
- `GET /api/algorithm-assets`
- `POST /api/algorithm-assets`
- `GET /api/algorithm-assets/:id`
- `PUT /api/algorithm-assets/:id`
- `POST /api/algorithm-assets/:id/files/markdown`
- `POST /api/algorithm-assets/:id/files/video`
- `PUT /api/algorithm-assets/:id/files/:fileId`
- `DELETE /api/algorithm-assets/:id/files/:fileId`
- `PATCH /api/algorithm-assets/:id/primary-files`
- `PATCH /api/algorithm-assets/:id/learning`

Admin interaction model:
- List page:
  - search by title / slug / source folder
  - filter by status / review_status / has_video
  - quick actions for archive and review-state update
- Detail/editor page:
  - edit metadata
  - upload/select markdown files
  - upload/select video files
  - choose primary markdown/video
  - edit learning fields
  - preview primary markdown and play primary video

Markdown ingestion strategy:
- Frontend reads `.md` file text client-side and submits content as JSON.
- Benefit: markdown becomes structured content in DB, not an opaque uploaded file.

Video ingestion strategy:
- Frontend uploads mp4 through existing `/api/upload/media`.
- Backend stores resulting URL in `AlgorithmAssetFile.storage_url`.

Phase-1 non-functional contract:
- Keep schema and API easy to extend toward future sync/history
- Avoid coupling to `Article`, `StudyItem`, and generation code paths
- Prefer explicit file records over JSON blobs for future maintainability
- Preserve admin usability over premature workflow automation

## Phase Overview
| Phase | Status | MDUs | Done | Pct |
|-------|--------|------|------|-----|
| 1 | complete | 0 | 0 | 100 |
| 2 | complete | 0 | 0 | 100 |
| 3 | complete | 0 | 0 | 100 |
| 4 | complete | 11 | 11 | 100 |
| 5 | complete | 11 | 11 | 100 |
| 6 | complete | 0 | 0 | 100 |

## Task List
- Phase 5: Implementation
  - Milestone 5.1: Backend domain and API foundation
    - Task 5.1.a: Define persistent algorithm asset schema and database registration.
      - Completion criteria: new asset/file models exist; database auto-migrate includes them; MySQL migration file exists for schema review.
      - Dependencies: none
      - Priority: critical path
      - [x] MDU-5.1.1: Add `AlgorithmAsset` and `AlgorithmAssetFile` models plus migration registration | files: `backend/internal/models/algorithm_assets.go`, `backend/internal/database/database.go`, `backend/migrations/007_create_algorithm_assets_mysql.sql` | depends: none
    - Task 5.1.b: Add asset CRUD and retrieval handlers.
      - Completion criteria: backend supports list, detail, create, and metadata update endpoints with validated request/response shapes.
      - Dependencies: Task 5.1.a
      - Priority: critical path
      - [x] MDU-5.1.2: Implement algorithm asset list/detail/create/update handler flows | files: `backend/internal/handlers/algorithm_assets.go`, `backend/internal/models/algorithm_assets.go` | depends: MDU-5.1.1
    - Task 5.1.c: Add file-management and learning endpoints and expose them through routing.
      - Completion criteria: backend supports markdown file creation/update, video file record creation/update, primary file selection, learning metadata patching, and route registration.
      - Dependencies: Task 5.1.b
      - Priority: critical path
      - [x] MDU-5.1.3: Register algorithm asset routes and implement file-management + learning endpoints | files: `backend/internal/handlers/algorithm_assets.go`, `backend/cmd/main.go` | depends: MDU-5.1.2
    - Task 5.1.d: Add backend verification coverage for critical algorithm asset logic.
      - Completion criteria: `go test` covers at least one success path and one validation/error path for the new backend feature surface.
      - Dependencies: Task 5.1.c
      - Priority: critical path
      - [x] MDU-5.1.4: Add backend tests for algorithm asset handlers or validation helpers | files: `backend/internal/handlers/algorithm_assets_test.go`, `backend/internal/handlers/algorithm_assets.go` | depends: MDU-5.1.3

  - Milestone 5.2: Frontend contracts and admin entry points
    - Task 5.2.a: Define frontend types and API bindings for algorithm assets.
      - Completion criteria: frontend has typed asset/file/request models and API helpers matching the new backend contract.
      - Dependencies: Task 5.1.c
      - Priority: critical path
      - [x] MDU-5.2.1: Add algorithm asset TypeScript types and API module | files: `frontend/src/types/index.ts`, `frontend/src/api/algorithms.ts` | depends: MDU-5.1.3
    - Task 5.2.b: Expose the new admin section through navigation and routing.
      - Completion criteria: admin sidebar contains `算法学习`; router resolves list and detail pages under `/admin/algorithms`.
      - Dependencies: Task 5.2.a
      - Priority: critical path
      - [x] MDU-5.2.2: Add admin navigation and route entries for algorithm assets | files: `frontend/src/App.tsx`, `frontend/src/pages/admin/AdminLayout.tsx` | depends: MDU-5.2.1

  - Milestone 5.3: Admin workflow pages
    - Task 5.3.a: Build the algorithm asset list page.
      - Completion criteria: list page loads assets, supports search/filter/status display, and navigates into asset details.
      - Dependencies: Task 5.2.b
      - Priority: critical path
      - [x] MDU-5.3.1: Implement admin algorithm asset list page | files: `frontend/src/pages/admin/AdminAlgorithms.tsx`, `frontend/src/api/algorithms.ts`, `frontend/src/types/index.ts` | depends: MDU-5.2.2
    - Task 5.3.b: Build metadata and learning editor shell for one asset.
      - Completion criteria: detail page edits core asset metadata and lightweight learning fields and loads current primary file references.
      - Dependencies: Task 5.2.b
      - Priority: critical path
      - [x] MDU-5.3.2: Implement algorithm asset detail page shell and learning panel | files: `frontend/src/pages/admin/AlgorithmAssetDetail.tsx`, `frontend/src/components/admin/AlgorithmLearningPanel.tsx`, `frontend/src/api/algorithms.ts`, `frontend/src/types/index.ts` | depends: MDU-5.2.2, MDU-5.1.3
    - Task 5.3.c: Add markdown file management and preview.
      - Completion criteria: admin can add/edit markdown files, choose a primary markdown, and preview the active content.
      - Dependencies: Task 5.3.b
      - Priority: critical path
      - [x] MDU-5.3.3: Implement markdown file manager and preview integration | files: `frontend/src/components/admin/AlgorithmFilesPanel.tsx`, `frontend/src/pages/admin/AlgorithmAssetDetail.tsx`, `frontend/src/api/algorithms.ts` | depends: MDU-5.3.2
    - Task 5.3.d: Add video upload, primary selection, and playback.
      - Completion criteria: admin can upload mp4 via the existing media pipeline, create/update video file records, select a primary video, and play it from the detail page.
      - Dependencies: Task 5.3.b
      - Priority: critical path
      - [x] MDU-5.3.4: Implement video upload and primary video management flow | files: `frontend/src/components/admin/AlgorithmFilesPanel.tsx`, `frontend/src/pages/admin/AlgorithmAssetDetail.tsx`, `frontend/src/api/algorithms.ts` | depends: MDU-5.3.2

  - Milestone 5.4: Integration stabilization
    - Task 5.4.a: Resolve cross-layer mismatches and stabilize the end-to-end admin workflow.
      - Completion criteria: list → detail → markdown management → video management → learning update path completes without contract mismatches.
      - Dependencies: Tasks 5.1.d, 5.3.a, 5.3.c, 5.3.d
      - Priority: critical path
      - [x] MDU-5.4.1: Fix integration mismatches and finalize algorithm admin workflow | files: `backend/internal/handlers/algorithm_assets.go`, `frontend/src/pages/admin/AdminAlgorithms.tsx`, `frontend/src/pages/admin/AlgorithmAssetDetail.tsx`, `frontend/src/components/admin/AlgorithmFilesPanel.tsx`, `frontend/src/App.tsx` | depends: MDU-5.1.4, MDU-5.3.1, MDU-5.3.3, MDU-5.3.4

- Phase 6: Review and Delivery
  - Milestone 6.1: Final review
    - Task 6.1.a: Review changes against locked requirement and ADR contracts.
      - Completion criteria: implementation matches phase-1 scope; no route/article/study-system drift; verification evidence is collected.
      - Dependencies: Phase 5 complete
      - Priority: critical path
## Backlog
- Future: add CLI sync from `/Users/smy/project/algorithm`
- Future: add import/snapshot history once sync is introduced
- Future: consider public-facing algorithm asset pages
- Future: evaluate generalized study-target abstraction if algorithm assets need reminders/analytics
## Backtrack History
| Time | Problem Hash | From State | To State | Reason |
|------|-------------|------------|----------|--------|

## Change Log
| Time | Type | Description | Scope |
|------|------|-------------|-------|
| 2026-03-23T03:45:11+08:00 | create | Initialized autopilot progress for algorithm asset management feature | .autopilot/PROGRESS.md |
| 2026-03-23T03:48:55+08:00 | update | Advanced requirement phase to clarifying with AI understanding | .autopilot/PROGRESS.md |
| 2026-03-23T03:55:12+08:00 | update | Locked requirement using user clarification answers | .autopilot/PROGRESS.md |
| 2026-03-23T04:04:18+08:00 | update | Added architecture summary and moved autopilot to architecture review checkpoint | .autopilot/PROGRESS.md |
| 2026-03-23T04:10:42+08:00 | update | Recorded user confirmation of architecture proposal | .autopilot/PROGRESS.md |
| 2026-03-23T04:16:24+08:00 | update | Added ADR set and advanced to spike validation | .autopilot/PROGRESS.md |
| 2026-03-23T04:18:25+08:00 | update | Skipped technical spikes and moved to decomposition | .autopilot/PROGRESS.md |
| 2026-03-23T04:26:10+08:00 | update | Added ADR-TEST and decomposed implementation into executable MDUs | .autopilot/PROGRESS.md |
| 2026-03-23T04:29:58+08:00 | update | Recorded user confirmation of the execution plan | .autopilot/PROGRESS.md |
| 2026-03-23T04:30:39+08:00 | update | Entered execution phase at MDU-5.1.1 | .autopilot/PROGRESS.md |
| 2026-03-23T04:34:47+08:00 | update | Completed MDU-5.1.1 with passing backend test verification | .autopilot/PROGRESS.md |
| 2026-03-23T07:14:10+08:00 | update | Completed MDU-5.1.2 with validated asset CRUD handlers and passing backend test verification | .autopilot/PROGRESS.md |
| 2026-03-23T07:19:01+08:00 | update | Completed MDU-5.1.3 with registered routes, file-management handlers, learning patch endpoint, and passing backend test verification | .autopilot/PROGRESS.md |
| 2026-03-23T07:20:48+08:00 | update | Completed MDU-5.1.4 with focused handler/helper tests and passing full backend test suite | .autopilot/PROGRESS.md |
| 2026-03-23T07:23:43+08:00 | update | Completed MDU-5.2.1 with algorithm asset frontend contracts, targeted type verification, and documented unrelated existing frontend build blockers | .autopilot/PROGRESS.md |
| 2026-03-23T07:25:30+08:00 | update | Completed MDU-5.2.2 with admin navigation entry, algorithm route placeholders, and targeted route bundling verification | .autopilot/PROGRESS.md |
| 2026-03-23T07:29:20+08:00 | update | Completed MDU-5.3.1 with the real algorithm asset list page and targeted bundling verification | .autopilot/PROGRESS.md |
| 2026-03-23T07:33:07+08:00 | update | Completed MDU-5.3.2 with the asset detail shell, learning panel, and targeted bundling verification | .autopilot/PROGRESS.md |
| 2026-03-23T07:36:13+08:00 | update | Completed MDU-5.3.3 with Markdown file management, preview integration, and targeted bundling verification | .autopilot/PROGRESS.md |
| 2026-03-23T07:39:08+08:00 | update | Completed MDU-5.3.4 with video upload, video record management, and targeted bundling verification | .autopilot/PROGRESS.md |
| 2026-03-23T07:40:39+08:00 | update | Completed MDU-5.4.1 by mounting the real algorithm pages into admin routes and finishing feature delivery | .autopilot/PROGRESS.md |
