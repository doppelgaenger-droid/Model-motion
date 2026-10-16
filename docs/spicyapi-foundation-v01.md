# SpicyAPI Foundation v0.1

Safe, isolated Firebase EU foundation; **no SpicyAPI generation is possible** in this version.

## Environment
- Function: `modelMotionSpicyEu`, `europe-west1`.
- Backend secret: `SPICYAPI_API_KEY`, created in Google Secret Manager (do not commit keys).
- Owner-only Firebase ID token authentication, fixed GitHub Pages CORS origin.
- `POST /foundation/status`: local configuration status and curated model capabilities.
- `POST /foundation/estimate`: offline indicative price preview. No provider requests.

## Setup
1. In Google Cloud Secret Manager project `model-motion`, create secret `SPICYAPI_API_KEY` and set the API key as its secret value.
2. Make sure the runtime service account can access that secret (Secret Manager Secret Accessor, scoped to this secret).
3. After merge, manually run GitHub Actions **SpicyAPI Foundation EU Deploy** with input `model-motion`.
4. No paid SpicyAPI request is performed by this function, by CI or by the deploy workflow.

## Next steps (not implemented)
- Validate exact endpoint schemas for each selected model with provider documentation.
- Authentication-only read-only provider check (if provider offers one).
- Server-side reference permissions, budget estimate verified with provider, per-job user confirmation and idempotent jobs.
- Persist taskId, poll boundedly, copy short-lived results to Storage, audit charges and failures.
- Keep Sogni untouched until benchmark validation; never fall back to tokens or dispatch without confirmation.

> Published price estimates may change or differ from actual billed totals. Do not equate a successful foundation deploy with verified provider credentials or model availability.
