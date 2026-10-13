# Generation Router — R1/R2 design and first implementation

Status: isolated feature branch; **not production enabled**.

## Defaults and approval
- Economy mode; default maximum authorized job cost is **USD 0.50**.
- The owner can set a different **per-job** budget before dispatch, or increase it when a job is blocked.
- Budget changes are proposals until the authenticated backend revalidates offer ceilings, privacy and capability.
- When no compatible offer is within budget, the job enters `blocked_budget`; no dispatch and no charge.
- Paid retries always require fresh validation and owner authorization; never automatically retry an uncertain charge.
- Price ceilings must be verified. An estimate without a binding ceiling cannot pass the guard.

## Privacy
- Classify each input reference: standard / sensitive / local_only. Strictest class wins.
- Sensitive inputs are permitted only with specifically approved providers. Local-only inputs never leave local infrastructure.
- No fallback to a less trusted provider, even when cheaper.
- Resolve short-lived asset access server-side; never persist reusable download-token URLs in job records.

## R1 delivered in this branch
- Pure provider-independent economy policy, capability and privacy routing, and configurable per-job budget.
- Deterministic queue job-state transition contract and unit tests.
- No existing Foundation behavior or consumer UI modified.

## R2 backend implementation contract (pending)
1. An authenticated owner-only backend accepts `createJob`, `updateBudget`, `authorize`, `cancel`, `status`.
2. Validate Firebase ID token and ownership **on every endpoint**, including status.
3. Use Firestore transaction/CAS on job revision to enforce transitions, reserve budget atomically and prevent duplicate dispatch.
4. Persist job id and idempotency key before contacting the provider. Dispatch worker obtains a lease; use provider idempotency if supported.
5. Submission results can be uncertain after timeout: reconcile provider state before any retry.
6. Store separate internal `id` and remote `providerJobId`; never use remote IDs as document IDs.
7. Poll via scheduled worker or provider callback verified server-side, with capped backoff and expiry.
8. Persist provider cost as actual/estimated/unknown; never turn missing actual cost into zero.
9. Ingest output into private Storage before marking complete. Complete job creates a Take candidate, never auto-approves continuity.
10. Cancel only when supported; preserve potentially billable in-flight jobs for reconciliation.

## Provider rollout
Existing prototype under `functions/generator` is image-oriented and not production-validated. Do not deploy it as a video generation queue without worker, security and cost audits. Video adapters, durable Firestore workers, and UI come in later PRs.

## Acceptance checks
- No provider credentials in frontend.
- Over-budget request stays blocked until authenticated override.
- Provider without verified price ceiling stays blocked.
- Privacy classifications cannot be downgraded by routing.
- Invalid transitions reject; completed jobs cannot re-dispatch.
- No background job creation occurs merely by opening the UI.

## R2 incremental implementation (October 13, 2026)
- `functions/generator/queue.js` exports an owner-only Cloud Functions v2 HTTP API, also exported by the existing function entrypoint.
- `POST /create`: idempotent Firestore transaction, creates only a DRAFT job. Input IDs and reference privacy metadata are treated as untrusted until future server-side asset validation. The creation endpoint **does not send any media to a provider**.
- `POST /budget`: updates per-job budget in integer US cents using optimistic revisions, always resets state to DRAFT for revalidation.
- `POST /validate`: currently moves to `blocked_price_unknown` as a deliberate fail-closed placeholder. There is no trusted offer registry or provider dispatch yet.
- `POST /status`: authenticated owner-only status retrieval.
- `POST /cancel`: transactional cancellation of jobs that have not been sent to a provider.
- Each endpoint verifies Firebase token, owner UID, origin and revision where applicable. Never trust browser-supplied price quotes.
- The API is **not deployed or production verified**. Configure an explicit Firebase Functions source and authenticated environment before deployment; local and end-to-end tests remain required.
- Unimplemented: provider-backed eligibility validation, authorized dispatch, lease-worker with provider reconciliation, server-side validation of referenced asset classifications, durable output ingestion, measured billing ledger and scheduler. These are required before paid generation.
