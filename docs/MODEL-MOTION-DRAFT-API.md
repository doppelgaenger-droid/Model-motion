# Model Motion Core — private draft API

This PR adds authenticated HTTP routes in the existing EU Core Function. It does **not** deploy them.

| Method | Route | Behavior |
|---|---|---|
| POST | `/providers` | Existing owner-only disabled provider catalogue |
| POST | `/jobs/draft` | Create owner-scoped Firestore draft or idempotent retry |
| POST | `/jobs/get` | Retrieve one owner-scoped draft by 64-character hex ID |

All routes require a Firebase ID token with revocation check and a matching private owner UID. The draft endpoint accepts only `provider`, `characterId`, `idempotencyKey`, and optional `requestedBudgetUsd`. It rejects unknown fields, invalid budgets and bodies over 4 KiB. No prompt, reference, URL, secret or model selection is accepted. No providers are called, no jobs are dispatched and no budget reservation is made. Responses expose only safe metadata.

## Pre-deploy gate

1. Verify tests (Foundation CI and Core CI). The fake database tests do not replace concurrency testing in the Firestore Emulator.
2. Grant **only** the dedicated `model-motion-core-runtime@model-motion.iam.gserviceaccount.com` the minimum needed Firestore access on the existing `eur3` database, likely `roles/datastore.user` at project scope if narrower database-level IAM is unavailable.
3. Confirm the Auth Viewer and GitHub deployer's direct Service Account User binding remain present.
4. Roll out only via `model-motion-core-deploy.yml` and manually validate authenticated and unauthenticated calls.
5. Monitor write rate, errors and costs. No spending authorization is implied by creating a draft.

**Do not deploy until the Firestore runtime authorization is deliberately reviewed.** Existing Sogni and generator functions remain untouched.
