# Model Motion Core — Phase 0

Model Motion Core is an **independent** Firebase Functions codebase. The initial interface exposes only an authenticated owner-only `POST /providers` catalogue that reports providers as **disabled**. It does not read secrets, submit jobs, charge credits, upload references, or migrate existing Firestore documents.

## Current safeguards

- EU runtime location: `europe-west1`, explicit dedicated identity `model-motion-core-runtime@model-motion.iam.gserviceaccount.com`.
- Firebase ID token verification with revocation check and owner UID allowlist; restricted browser origin.
- No configured secrets in this phase: the owner-created `ARTCRAFT_API_KEY` is **not mounted** yet, even though the dedicated runtime has access to that secret in Secret Manager.
- Existing `generator` and `sogni-check` codebases remain unchanged.
- No deploy workflow and no production deploy in Phase 0.

## Planned, not implemented

1. Validate Google Cloud IAM prerequisites for dedicated runtime (including Firebase Authentication Viewer for revoked-token verification) and deployer `iam.serviceAccounts.actAs` on the **new** runtime.
2. Deploy only `functions:core:modelMotionCoreEu` after explicit live preflight; protect against Firebase CLI artifact-policy errors.
3. Implement read-only ArtCraft credential verification **only if a documented non-billable endpoint is identified**; use regional secret binding and no media/reference uploads.
4. Design persistent Firestore state machine, idempotency, owner-scoped jobs, provider model catalog, EU output persistence, cost reservations/refunds and explicit spending approvals. None are live.
5. Audit reference transfer, provider retention, regional processing, NSFW rules and billing before enabling any submission.

Never infer API spend eligibility from existence of an ArtCraft Free account/API key.
