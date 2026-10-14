# Core Firestore draft persistence — phase 1

This module adds an owner-scoped Firestore transaction for **drafts only**. It does not send jobs, reserve funds, quote prices, attach references, call ArtCraft or Sogni, or enable generation.

Collection: `modelMotionCoreJobs`. Document ID is SHA-256 of a versioned owner UID and caller idempotency key, avoiding storing the raw key in the document ID. A transaction creates the document only once; retries with the same payload reuse the document, while conflicting retries raise `IDEMPOTENCY_CONFLICT`. Different users cannot read each other's drafts through the module. The API returns only non-sensitive fields.

The Core HTTP surface remains **unchanged** in this PR, so there is no way for browsers to create jobs yet. Add authenticated owner-only endpoints, rate limits, quota safeguards, audit logging, and an authorization review before deploy.

Firestore runtime authorization: the dedicated `model-motion-core-runtime` service account may need `roles/datastore.user` scoped to project `model-motion` to access the existing `eur3` database. Do not grant it until the endpoint is implemented and deployment is planned. No new Firestore database is created.

Important: the in-memory fake used for unit tests does not simulate concurrency; Firestore transaction behavior must be verified against an emulator or real isolated test environment before production enablement. The state machine and price engine remain design-only.
