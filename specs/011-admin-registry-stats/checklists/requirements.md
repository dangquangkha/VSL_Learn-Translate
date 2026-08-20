# Specification Quality Checklist: Admin Model Registry, Data Quality & Dataset Statistics

**Purpose**: Validate that Spec 011 is complete, testable, internally consistent, and ready for planning.
**Created**: 2026-08-20
**Feature**: ../spec.md

## Content Quality

- [x] Focuses on user/business outcomes and system obligations.
- [x] Uses project-mandated API, data, security, and tensor contracts only where needed to remove implementation ambiguity.
- [x] Is understandable by product, backend, frontend, AI, QA, and security stakeholders.
- [x] Contains all eight required sections: Context, Actors, Functional Requirements, Non-functional Requirements, Data Model, Acceptance Criteria, Out of Scope, Open Questions/Assumptions.

## Requirement Completeness

- [x] Contains no unresolved NEEDS CLARIFICATION marker.
- [x] Every functional requirement has a stable FR identifier and normative SHALL or SHALL NOT language.
- [x] Covers all five EARS patterns: Ubiquitous, Event-driven, State-driven, Optional Feature, and Unwanted.
- [x] Unwanted requirements are at least 30% of functional requirements: 10 of 28, or 35.7%.
- [x] Requirements are measurable and do not use undefined terms such as fast, smooth, secure, or optimized.
- [x] Each FR maps one-to-one to AC-001 through AC-028.
- [x] Each NFR maps one-to-one to AC-NFR-001 through AC-NFR-008.
- [x] Success metrics and performance test conditions are quantified.
- [x] Actors, scope boundaries, dependencies, assumptions, and out-of-scope behavior are explicit.
- [x] Error paths define HTTP outcome, stable error code, rollback behavior, and forbidden data exposure where applicable.

## Architecture & Security Consistency

- [x] Preserves client-side inference only and explicitly forbids backend prediction.
- [x] Uses the Spec 010 three-input ONNX contract: landmarks, mask, timestamps; output logits has 51 classes.
- [x] Defines shared/labels.json as the only labels source and removes raw-file hash ambiguity with one canonical SHA-256 algorithm.
- [x] Keeps T-02 as a hard release gate with exactly 20 samples and max logit difference below 0.001.
- [x] Encodes subject-independent split evidence and activation gates for accuracy, browser latency, and model size.
- [x] Keeps model, video, and landmark R2 objects private and exposes only expiring presigned URLs.
- [x] Separates publish_dataset consent for public stats from use_in_project consent for training export.
- [x] Requires ADMIN authorization for every /api/admin/** route.
- [x] Requires dictionary_source and verified phrase order for teachable/evaluable vocabulary.

## Data & Statistics Consistency

- [x] Defines every public metric, denominator, zero-denominator behavior, and data scope.
- [x] Uses 51 labels and idle id 0 consistently with shared/labels.json.
- [x] Returns all labels, including zero-count labels, in deterministic shared-label order.
- [x] Prevents public row-level identifiers and disallows fake zero responses when stats dependencies fail.
- [x] Covers SRS FR-A03 per-subject test accuracy and known limitations using consent-filtered, non-linkable public aliases.
- [x] Separates Recorder device-quality checks from backend integrity/statistical checks and defines minimum reference population, outlier math, retry, and terminal behavior.

## Feature Readiness

- [x] Acceptance scenarios cover happy paths, authorization, validation, storage failure, consent failure, concurrency, privacy, and observability.
- [x] No requirement conflicts with SRS, Spec 010, AGENTS.md, or the project Constitution.
- [x] No open question blocks planning.
- [x] Spec is ready for plan.md and tasks.md to be regenerated or reconciled before implementation review.

## Validation Result

**PASS — 2026-08-20**

The specification passed the checklist after one rewrite iteration. Existing plan.md, tasks.md, and backend implementation were intentionally not changed in this step and must be checked against this revised contract next.
