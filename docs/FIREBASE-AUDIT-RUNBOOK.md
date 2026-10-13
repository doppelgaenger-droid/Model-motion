# Read-only Firebase handover inventory

This script reports **counts only**, and does not delete, edit, copy, or migrate Firebase records or Storage objects.

From the repository root, after authenticating to Google Cloud project `model-motion` with your authorized local account:

```bash
cd functions/generator
npm install --no-audit --no-fund
gcloud auth application-default login
gcloud config set project model-motion
node audit-handover.mjs
```

The script requires Firestore read and Storage object listing permissions. Its output contains only counts and total bytes. It audits known UID paths, not every unknown legacy collection, and does not determine whether an asset is safe to delete. No secret keys or service account JSON need to be exported.

Review the results before deploying any rules changes. Do not revoke the previous UID on the basis of an empty UI alone. Existing runtime `GENERATOR_OWNER_UID` must also be updated separately after data validation.
