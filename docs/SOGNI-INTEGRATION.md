# Sogni cloud adapter — staging integration

Branch: `feature/sogni-cloud-adapter`. Status: **adapter committed; production dispatch DISABLED**.

## Reuses existing Model Motion architecture
- Provider contracts: `src/core/provider.ts`, `src/foundation/providers/*`.
- USD budget guard: `src/foundation/budget/guard.ts`.
- Owner-only Firebase gateway: `functions/generator/index.js` (legacy direct generate is intentionally 503).
- No second queue, duplicate router, direct browser API calls, or changed public UI.

## What is implemented
- Server-only REST adapter at `functions/generator/sogni.js`.
- Documented `POST /v1/creative-agent/workflows` single-video format, safe content filter on, allowlisted known models.
- `confirm_cost: false` preview with **no paid dispatch**, server key, and stable idempotency header.
- `GET /v1/creative-agent/workflows/:id` status normalization.
- Submission primitive accepting only a verified server-issued USD quote and explicit approval; **not connected to any HTTP route**.
- Node tests at `functions/generator/sogni.test.js`.

## Blocking production requirements
1. Add `SOGNI_API_KEY` as Firebase Secret, never `VITE_*`. No key has been provisioned by this change.
2. Add an authenticated server-side price conversion using authoritative and current provider billing/quoted USD, not guessed Spark/capacity-to-USD rates. Sogni's estimate is denominated in **capacity units**; `$0.50` cannot be compared directly. Verify USD billing semantics for each model. Server must create and store tamper-proof quote, approved budget, expiry and idempotency key.
3. Wire adapter through the existing Generation Router/server gateway **only after** trusted estimate, reservation and consent/policy checks. Do not change the legacy 503 until cutover tests pass.
4. Reference uploads must use Sogni's authenticated signed media URLs, with explicit owner consent, data handling review, expiring output URLs and private Firebase Storage archival. This initial adapter intentionally sends **no intimate reference media**.
5. Add Firestore atomic reservation/settlement and durable workflow mapping; block duplicate charge/submit on retries; handle 402/409/429 and SSE/poll; handle vendor model restrictions.
6. Test on staging with non-sensitive prompt; audit costs and privacy; then enable behind a flag.

## Local tests
```sh
node --test functions/generator/sogni.test.js
```

Official docs:
- https://docs.sogni.ai/api-reference/workflows/
- https://docs.sogni.ai/api-reference/direct-generation/
- https://docs.sogni.ai/api-reference/getting-started/
