# Provider outputs → Media Archive

This branch adds **normalization only**, not a production import or generation route.

## Verified in the current repository

- Sogni Look Runner currently saves image results to `creativeAssets` plus Firebase Storage. This working path is unchanged.
- The SpicyAPI Cloud Function only offers read-only diagnostics, catalogs, plans and estimates. No generation result endpoint or confirmed output schema exists in this code.
- `functions/core/media/archiveProviderStream.js` can archive a trusted server-provided stream to Storage and Firestore `archivedMedia`, but is not wired to a provider.
- `normalizeSogniArtifacts` expects completed Sogni workflow artifacts with server-confirmed MIME and byte count. Current Look Runner only checks `artifact.url`: it does **not** establish that metadata fields exist in real provider responses. The new adapter therefore intentionally fails closed if they are absent.

## Gate before enabling live imports

1. Capture **redacted** server-side response schemas from already-completed Sogni and SpicyAPI jobs (no new paid generations). Never log provider URLs, tokens or prompts.
2. Confirm allowed host names and redirect behavior with provider documentation; ensure DNS/IP SSRF checks before any server-side download. Current normalizer's host check is not by itself sufficient to fetch URLs safely.
3. Confirm MIME, exact byte count, checksums if available, content limits and the workflow-job ownership binding on trusted server records.
4. Create provider-owned network download adapter with strict origin/redirect/IP restrictions and streaming timeouts; feed its trusted stream into `archiveProviderStream`. Do not accept arbitrary browser URLs.
5. Test retries, duplicate job/asset IDs, missing Firestore records, corruption, insufficient privileges, very large videos and Storage CORS in staging.
6. Separately implement authorized, efficient video streaming (the current library prototype downloads full Blob).

Keep paid dispatch disabled until budgets and authorization are proven. No deployment is part of this branch.
