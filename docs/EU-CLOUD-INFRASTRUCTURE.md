# Model Motion — EU Cloud Infrastructure Baseline

Status: documented from the successful live Sogni EU credential check and repository configuration on 2026-10-14. **This is a recorded baseline, not an automated audit of live Google Cloud resources.** Confirm IAM bindings and resource locations in Cloud Console before destructive actions.

## Region and resource inventory

| Resource | Current known location / status | Next action |
| --- | --- | --- |
| Firestore default database | `eur3` (Belgium/Netherlands multi-region), confirmed in Cloud Console | Keep; no migration |
| Firebase Storage asset bucket | `model-motion.firebasestorage.app`, `eu` multi-region, confirmed | Keep; protect character references |
| Sogni HTTPS credential check | `sogniCredentialCheckEu`, `europe-west1` (Belgium); live authenticated read-only check passed | Keep; verify runtime identity and monitoring |
| Legacy Sogni credential check | `sogniCredentialCheck`, `us-central1` (Iowa), previously created | Remove only after dependency/invocation audit |
| Artifact Registry | `gcf-artifacts` in `europe-west1` and `us-central1` | Europe policy in Dry Run; US cleanup deferred |
| Cloud Functions staging buckets | `gcf-v2-sources-*` and `gcf-v2-uploads-*` exist in `us-central1` | Do not manually delete without service dependency audit |
| Secret Manager | `SOGNI_API_KEY` uses automatic replication | Plan EU-restricted replacement with safe cutover; location not EU-guaranteed |
| Firebase Auth | Google sign-in, owner-only verified endpoint | Keep auth checks and token revocation validation |
| GitHub Pages | Frontend hosted at `doppelgaenger-droid.github.io/Model-motion` | Note: global platform; EU-only residency cannot be asserted for the entire frontend |

**Data residency caveat:** Region of compute, storage, replication, logs, network transit and third-party provider processing are distinct. The live check reaches an external Sogni endpoint whose processing location has not been audited. An EU Cloud Function does not prove end-to-end EU residency.

## Identities and permissions

- Project: `model-motion`, number `843468130335`.
- GitHub deployment identity: `model-motion-github-deploy@model-motion.iam.gserviceaccount.com`; uses GitHub Actions Workload Identity Federation (no persistent Google credential in GitHub).
- Runtime identity: `model-motion-runtime@model-motion.iam.gserviceaccount.com`, explicitly set on the European function.
- Runtime: `roles/secretmanager.secretAccessor` scoped to `SOGNI_API_KEY`; `roles/firebaseauth.viewer` on the project required for `verifyIdToken(token, true)` revocation checks.
- Deployment account currently has elevated Cloud Functions Admin and temporary Artifact Registry Administrator from deployment troubleshooting. It has also been granted project-level Service Account User: **review scope carefully**. Exact bindings, inherited roles, conditions and effective permissions must be audited before reducing them.
- Account for default Compute Engine service and legacy App Engine service account received extra `actAs` troubleshooting grants; assess whether needed for ongoing deployments.
- Do **not** automatically revoke rights without testing a controlled deployment and rollback path.

## Google Cloud services enabled or checked by Firebase deployment

`cloudfunctions.googleapis.com`, `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, `run.googleapis.com`, `eventarc.googleapis.com`, `pubsub.googleapis.com`, `storage.googleapis.com`, `firebaseextensions.googleapis.com`, `secretmanager.googleapis.com`. Firebase Auth, Firestore, Firebase Storage and Google Cloud IAM are also in use. Enable APIs per project **only if required**; provisioning and use may incur costs.

## Deployment and safety contracts

- Workflow: `.github/workflows/sogni-credential-deploy.yml`; manual `workflow_dispatch`, branch `main`, protected environment `firebase-production-functions`.
- Firebase codebase: `sogni-check`, `functions/sogni-check`; targeted deployment of `sogniCredentialCheckEu`. Legacy `generator` codebase must not be changed by this workflow.
- Authenticated read-only Sogni check passed through Firebase Auth + EU function + Sogni provider. **This does not validate Sogni generation APIs, cost limits, content policies or media persistence.**
- Generation remains disabled server-side pending audited budget reservation, reference privacy checks and explicit authorization. Initial job budget `$0.50` is a user-configurable default, not permission to spend.
- EU Artifact Registry policies `delete-old-images-7d` and `keep-latest-3` were saved in **Dry Run**. No automatic deletions are currently expected; check rules and simulation before enabling. This applies to deployment containers, **not** Firebase media assets.
- Prior Firebase CLI artifact cleanup steps may exit nonzero even when a function is successfully deployed. Verify function status separately from overall GitHub workflow.
- Never paste tokens or provider secrets into GitHub issues, PRs, logs or frontend code.

## Controlled next phases (do not execute without explicit verification)

1. **Secret residency:** Create a *new*, EU-restricted Secret Manager secret, safely populate it via the Cloud Console, grant runtime secret accessor on the new secret, update function to refer to the new name, deploy and verify, then revoke/destroy the old secret only after rollback considerations. Secret replica location cannot be assumed from function region.
2. **Artifact cleanup:** Inspect EU Dry Run outcomes and protect current deployed images. Only then activate retention in EU; keep IAM minimal. Review whether the Firebase CLI deploy command needs `--force` or separate non-blocking policy management; never weaken error handling silently.
3. **US retirement:** Inventory legacy function callers, Cloud Run service, images and staging buckets; migrate traffic/links and monitor EU; remove US resources one at a time with backups and owner approval.
4. **IAM reduction:** Export current effective IAM and audit log evidence, reduce broad project grants to resource-specific roles where feasible, validate WIF deployment and runtime verification after each reduction.
5. **Provider integration:** Design and test Generation Router dry-run + budget control + EU Firebase Storage persistence independently from the successful credential check.

## Reuse for DOTZERO / DNS

Treat this as a **pattern**, not shared production credentials or shared Firebase projects: regional inventory, separated deploy/runtime identities, WIF, least-privilege Secret Manager, selective codebase deployments, cost and retention checks, audit checklist and explicit migration sign-off. Apply each API only to the project needing it.
