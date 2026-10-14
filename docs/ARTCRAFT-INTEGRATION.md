# ArtCraft integration — non-billable contract stage

## Observed state
- User reported a **Free** ArtCraft account and successfully created an API key.
- `ARTCRAFT_API_KEY` is owner-created with Secret Manager user-managed replication in `europe-west1`; the dedicated Core runtime has Secret Accessor scoped to this secret. Do not copy the secret into GitHub, client code or logs.
- Core is live in Belgium under a dedicated service account, but **ArtCraft is not enabled**, does not read the secret and makes no outbound API requests.
- Free-tier API quota, credit balance, costs, content and data retention terms are **unverified**.

## Documented vendor interface

Official guide: https://github.com/storytold/artcraft/blob/main/_docs/artcraft_omni_api.md

- Host `https://api.storyteller.ai`; API key in Bearer Authorization.
- Video submission `POST /v1/omni_api/generate/video` requires an idempotency UUID and **can spend credits**.
- Image submission `POST /v1/omni_api/generate/image` may spend credits.
- Status `GET /v1/omni_api/job_status/job/{token}` or `GET /v1/omni_api/job_status/batch` is read-only, but only applies to known jobs; do **not** fabricate a token to infer a successful credential check.
- Model discovery and cost endpoints `/v1/omni_gen/models/*` and `/v1/omni_gen/cost/*` are described as public by the vendor backend repository. Their exact paths, response shapes, API-tier access and trustworthiness need validation prior to integration.

## Security contract

There is deliberately **no** outbound ArtCraft request, credential validator, generation queue, reference upload, or price quote enabled yet. Before connecting secrets, choose a documented non-billable API endpoint with an unambiguous authentication success response. Never POST to a generation endpoint as a credential test. Do not send private references until retention, training usage and transfer restrictions are reviewed. Generation defaults remain disabled and job budget defaults to USD 0.50 only once a quote and approval system exists.

## Next implementation stages
1. Confirm read-only authenticated endpoint or show `credentialStatus: unverified` without attempting to validate it.
2. Define model capability catalogue with timestamps and provider-side pricing quote verification.
3. Implement Firestore queue and atomic budget reservations using server-controlled state transitions and idempotency.
4. Add explicit owner approval and private reference consent before any paid provider dispatch.
