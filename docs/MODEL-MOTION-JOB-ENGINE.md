# Model Motion Core — Job and budget contracts

Status: **code-only, non-deployed**. This phase contains pure, offline-tested contracts; **no Firestore transactions, endpoints, provider dispatch, billing or job scheduler exist yet**.

- Owner-scoped `draft` design; idempotency key required.
- State machine with explicit allowed transitions and immutable terminal states.
- Currency: integer USD cents, default USD 0.50 per job, configurable up to an initial technical validation ceiling of USD 1000 (not permission to spend).
- Quotes above the budget are denied unless the quote amount is explicitly approved.
- No client-supplied approved amount may be trusted. Future approvals must be recorded via authenticated owner-only server-side transactions, linked to the specific quote version, expiry and provider account balance.
- Provider-side pricing is not verified; **no budget control is production-ready**. Quotes must be server fetched and checked before dispatch. Transactional reservation, rate limiting, reconciliation, retries, and cancellations will be added separately.
- Reference uploads/outputs to providers remain disabled. Never store bearer tokens, secrets or long-lived public reference URLs in job records.
- Firestore document ID strategy and recovery logic must be implemented and reviewed before persisting jobs. Storing `idempotencyKey` in a draft does not itself guarantee idempotency.
