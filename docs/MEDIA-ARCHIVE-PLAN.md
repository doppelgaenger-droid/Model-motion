# Model Motion — persistent media archive (design + pure contract)

## Verified current state
- Existing Sogni Look Runner already downloads generated **images**, persists bytes in Firebase Storage and writes `creativeAssets` metadata. Do not duplicate or replace this working image path without dedicated migration tests.
- The legacy RunPod/fal gateway currently has direct dispatch disabled and a legacy status route returning a provider URL; that does not prove any video archive exists.
- A new shared pure validation helper lives in `functions/core/media/archiveContract.js`. It performs NO downloads/uploads or database writes.

## Archive lifecycle (future backend implementation)
1. Accept a completed job only after verifying Firebase ID token, owner UID and server-created job record. Never trust user-supplied provider URL or ownership metadata.
2. Server-side provider adapter resolves the final artifact and checks documented provider host allowlist, redirect policy and provider auth. Block private/link-local/loopback network destinations; do not follow arbitrary redirects.
3. Stream with total-byte limits (image 25 MiB; video initial ceiling 512 MiB), timeouts, and MIME/magic-byte validation; never buffer an unbounded video in RAM.
4. Upload to private Storage under the validated owner-scoped path; do not publish a token-bearing permanent download URL.
5. Verify object metadata and persist a Firestore asset record transactionally/idempotently via server-owned job ID, with `archiveStatus: verified`; retries must not create duplicates.
6. Expose playback using short-lived, authorized access after ownership checks. Keep metadata separate from media bytes.
7. Record dimensions/duration, checksum, provider, model, prompt references, original job ID, actual cost, and timestamps when available.
8. Implement recovery for storage-without-Firestore and Firestore-without-storage failures, and explicit retention and deletion policies. Never auto-delete original media.
9. Review Storage rules: existing client write rule only permits images under 25 MiB; server Admin writes bypass Storage rules and MUST enforce authorization, limits and owner scoping. Do not loosen public access.
10. Test with fake provider bytes in staging before permitting real paid dispatch.

## Non-goals of this PR
- No production endpoint, provider API call, video player, thumbnail migration, Storage policy modification, Firestore migration, deploy or billing configuration.
- The archive contract alone does not persist video. It is a prerequisite for a separately reviewed, secure streaming ingestion service.

## Smoke checks
`cd functions/core && npm test`
