# Clean creative workspace cutover — 2026-10-13

Decision: start Model Motion creative content fresh with Firebase Auth UID `JZK1aIhqo5Zgl0oEbdCjhlko5qC3`; do not migrate or import legacy references.

## What is staged in this PR
- Firestore and Storage rules allow only the dedicated new UID. Old UID `muju7doq6xYWBToKNpMw6LKnbBw1` is no longer allowed in the **proposed rules**.
- Current client saves future character assets under `model-motion/users/<newUid>/...`, filters Firestore creativeAssets by `uploadedBy == newUid` and creates scene cast and snapshots beneath the signed-in UID. The existing starter scene and character definitions in source code still appear; these are template metadata, not imported reference images.
- Existing cloud documents and objects have **not** been deleted. A clean logical workspace is not equivalent to a physically empty database.
- No Firebase deployment, secret read, Firestore mutation or paid Sogni generation has been performed.

## Cutover checklist
1. Back up / inspect existing Firestore and Storage before any optional cleanup; run `functions/generator/audit-handover.mjs` with authorized read-only credentials if desired.
2. Confirm the dedicated Google account authenticates as `JZK1aIhqo5Zgl0oEbdCjhlko5qC3`.
3. Deploy proposed security rules separately after reviewing the current live rules: `firebase deploy --only firestore:rules,storage --project model-motion`. Be mindful this immediately revokes legacy UID access.
4. Verify with new UID: upload, list, and delete a disposable image; save/load scene cast and snapshot. Verify the old UID is denied.
5. Configure `GENERATOR_OWNER_UID=JZK1aIhqo5Zgl0oEbdCjhlko5qC3` in trusted backend runtime. Deploy the read-only Sogni credential gateway separately, after CI and project verification. Keep paid generation disabled.
6. Do not delete historical cloud objects until an audited inventory/backup, retention review and explicit deletion decision.

## Scope clarification
This resets **creative content onboarding**, not Foundation or multi-provider architecture. SFW image providers remain future adapter candidates; the RunPod/fal UI prototype is disabled, and Sogni is currently read-only. No parallel router is introduced.

## Authorization caution
Rules currently retain a broad per-project owner read/write match (exclusive UID only), so the new owner could access historical records through other tooling. The current UI filters most creative content by signed-in UID. Complete collection-level least-privilege hardening before claiming strict data isolation across all Firestore documents.
