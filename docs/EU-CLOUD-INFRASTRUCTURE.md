# Model Motion — EU Cloud Infrastructure Baseline

Status: documented from the successful live Sogni EU credential check and repository configuration on 2026-10-14. **This is a recorded baseline, not an automated audit of live Google Cloud resources.** Confirm IAM bindings and resource locations in Cloud Console before destructive actions.

## Region and resource inventory

| Resource | Current known location / status | Next action |
| --- | --- | --- |
| Firestore default database | `eur3` (Belgium/Netherlands multi-region), confirmed in Cloud Console | Keep; no migration |
| Firebase Storage asset bucket | `model-motion.firebasestorage.app`, `eu` multi-region, confirmed | Keep; protect character references |
| Sogni HTTPS credential check | `sogniCredentialCheckEu`, `europe-west1` (Belgium); live authenticated read-only check passed | Keep; verify runtime identity and monitoring |
| Legacy Sogni credential check | `sogniCredentialCheck` in Iowa | **Deleted by project owner** after verifying EU use |
| Artifact Registry | `gcf-artifacts` in `europe-west1`; Iowa repository deleted | EU cleanup policies still in Dry Run |
| Legacy Cloud Functions staging buckets | Two `gcf-v2-*` buckets in `us-central1` | **Deleted by project owner** after legacy function retirement |
| Secret Manager | `SOGNI_API_KEY_EU`, user-managed replication in `europe-west1` | Live EU credential test passed; original automatically replicated `SOGNI_API_KEY` was deleted by owner |
| Firebase Auth | Google sign-in, owner-only verified endpoint | Keep auth checks and token revocation validation |
| GitHub Pages | Frontend hosted at `doppelgaenger-droid.github.io/Model-motion` | Note: global platform; EU-only residency cannot be asserted for the entire frontend |

**Data residency caveat:** Region of compute, storage, replication, logs, network transit and third-party provider processing are distinct. The live check reaches an external Sogni endpoint whose processing location has not been audited. An EU Cloud Function does not prove end-to-end EU residency.

## Identities and permissions

- Project: `model-motion`, number `843468130335`.
- GitHub deployment identity: `model-motion-github-deploy@model-motion.iam.gserviceaccount.com`; uses GitHub Actions Workload Identity Federation (no persistent Google credential in GitHub).
- Runtime identity: `model-motion-runtime@model-motion.iam.gserviceaccount.com`, explicitly set on the European function.
- Runtime: `roles/secretmanager.secretAccessor` scoped to `SOGNI_API_KEY_EU`; `roles/firebaseauth.viewer` on the project required for `verifyIdToken(token, true)` revocation checks.
- Project-level deployment identity roles (verified via console screenshots): Cloud Functions Admin, Cloud Storage for Firebase Viewer (beta), Firebase Rules Admin, Firebase Viewer, Service Usage Viewer. Temporary Artifact Registry Administrator and project-level Service Account User were removed by the owner. Firebase Viewer was restored after an accidental role removal.
- Direct `roles/iam.serviceAccountUser` bindings for the deployer on `model-motion-runtime`, Compute Engine default service account and App Engine default service account were verified from individual service-account access views; the runtime `iam.serviceAccounts.actAs` Policy Troubleshooter check returned **allowed** after project-level role removal.
- Successful `actAs` troubleshooting is **not** an end-to-end deployment test. Before further IAM reduction, run a non-destructive deployment preflight or a controlled new deployment and confirm CLI permissions.
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

1. **Secret residency:** Completed for Sogni: `SOGNI_API_KEY_EU` in `europe-west1` verified through the live read-only Sogni credential check; original secret deleted by project owner. Recheck that new integrations also use regionally restricted secrets.
2. **Artifact cleanup:** Inspect EU Dry Run outcomes and protect current deployed images. Only then activate retention in EU; keep IAM minimal. Review whether the Firebase CLI deploy command needs `--force` or separate non-blocking policy management; never weaken error handling silently.
3. **US retirement:** Previously identified legacy Sogni function, Iowa Artifact Registry repository and two technical Iowa staging buckets were deleted by project owner. Perform a final discovery audit before claiming that *all* project resources are EU-only.
4. **IAM reduction:** Temporary project-wide Artifact Registry Admin and Service Account User were removed; targeted `actAs` check on EU runtime passed. Documented project roles remain; still verify full deployment end-to-end after the reduction and assess whether `actAs` on default Compute/App Engine service accounts is truly needed.
5. **Provider integration:** Design and test Generation Router dry-run + budget control + EU Firebase Storage persistence independently from the successful credential check.

## Reuse for DOTZERO / DNS

Treat this as a **pattern**, not shared production credentials or shared Firebase projects: regional inventory, separated deploy/runtime identities, WIF, least-privilege Secret Manager, selective codebase deployments, cost and retention checks, audit checklist and explicit migration sign-off. Apply each API only to the project needing it.
