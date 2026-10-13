# Cloud-only Firebase deployment

These workflows are **manual only**, restricted to `main`, and use GitHub Environments for independent approval. A successful PR check does not deploy.

## One-time Google Cloud setup

1. In Google Cloud project `model-motion`, configure Workload Identity Federation for GitHub repository `doppelgaenger-droid/Model-motion`. Restrict the attribute condition to the exact repository and intended `main` branch/environment.
2. Create a dedicated deployment service account with only the Firebase deployment roles needed for each operation. Prefer separate deployer accounts for Rules and Functions after IAM review. Configure permission to impersonate the service account for the GitHub WIF principal.
3. In GitHub repository **Settings > Environments**, create `firebase-production-rules` and `firebase-production-functions`, restrict deployment branches to `main`, set required reviewers, and configure environment variables `GCP_WIF_PROVIDER` and `GCP_DEPLOY_SERVICE_ACCOUNT`. These identifiers are not API keys.
4. Confirm `SOGNI_API_KEY` secret exists in project `model-motion` and the Functions deploy service account has appropriate permissions to deploy a function referencing it. Runtime access must be granted to the function's own service identity.
5. Ensure runtime variables `GENERATOR_OWNER_UID` and `GENERATOR_ALLOWED_ORIGIN` are supplied through a reviewed Cloud Functions/Firebase runtime configuration process. The gateway fails closed otherwise. Do not deploy until these values and runtime identity are validated.

## Execution

After review and merge into `main`, open **Actions** and select the appropriate deploy workflow, click **Run workflow** with `confirm_project=model-motion`, then approve the protected environment.

- `Firebase Rules Deploy`: updates only Firestore and Storage rules; does not delete data.
- `Firebase Functions Deploy`: updates only the read-only `generatorGateway`; does not enable paid generation.
- Never run these from a feature branch; never reuse the GitHub Pages deploy for backend changes.

## Important

The rule change removes previous owner access and should follow an inventory/backup and a test plan for the new UID. Deploy rights depend on Google Cloud IAM; a green CI alone cannot establish authorization. Provider USD costs and budget reservation must be audited before activating any paid Sogni job.
