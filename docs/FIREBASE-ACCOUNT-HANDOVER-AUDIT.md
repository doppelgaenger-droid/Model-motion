# Account handover & multi-provider audit — 2026-10-13

## Deployment state (verified in repository, not in live Firebase)

- Firebase project: `model-motion`.
- Previous Firebase Auth UID: `muju7doq6xYWBToKNpMw6LKnbBw1`.
- Intended new Firebase Auth UID: `JZK1aIhqo5Zgl0oEbdCjhlko5qC3`.
- `firestore.rules` and `storage.rules` on this branch allow **both** UIDs as a temporary staged transition; main/live deployed rules have not been independently verified.
- `functions/generator/index.js` binds Sogni only for a **read-only credential check**. Generation, including SFW image routes, remains disabled. This is *not* a permanent Sogni-only product strategy.
- `src/foundation/providers` remains provider-agnostic. `src/components/GeneratorStudio.tsx` still displays prototype RunPod and fal options but submission is disabled.
- Sogni adapter added in this branch implements a video workflow primitive; no production image-to-image or text-to-image routes are active.

## Data sources to inspect before exclusive new-UID access

1. Firestore collection `creativeAssets`: count documents `uploadedBy` each UID. Check deleted-reference metadata and Storage orphan objects.
2. `sceneCast/{uid}/scenes/{sceneId}`: count and compare old/new documents; client uses current UID directly.
3. `privateSceneSnapshots/{uid}/scenes/{sceneId}`: count and compare old/new documents; client uses current UID directly.
4. Cloud Storage `model-motion/users/{uid}/...`: list objects, byte sizes and metadata under both UID prefixes. Do not assume deletion of UI images deleted all Storage objects.
5. Other collections and legacy objects must be enumerated by a privileged, read-only admin audit; rules on their own cannot prove data absence.

## Safe handover protocol

1. Back up Firestore export and Storage metadata/object inventory before changing security rules or copies.
2. Perform a read-only audit via trusted Admin SDK or Firebase console with least-privilege authorized operator. Never put service credentials in GitHub, browser code or chat.
3. If old data exists, construct a manifest with document paths and ownership fields. Copy into new UID namespace and verify counts, checksums and reference paths. Do not overwrite destination records or destroy originals.
4. Ensure client references `uploadedBy`, `ownerUid`, and Storage paths resolve for the new UID. Test create/read/update/delete of disposable assets and private scene data after staged rules deployment.
5. Set `GENERATOR_OWNER_UID` to new UID in the existing function's trusted runtime; verify owner-only endpoint.
6. After migration, tests and live validation, replace dual-UID rules with the single new UID, deploy rules separately, then verify old UID is denied before retiring it.

## Generation architecture safeguard

- Keep a single `ProviderRegistry`, `ProviderOrchestrator`, budget guard and Firebase job manager.
- Add Sogni, fal, RunPod and future model-specific adapters through the existing contract; separate image/video capability flags and model-level content policy checks.
- The Sogni credential-check gateway is a staged safety boundary, not final provider routing. Do not enable billing until authoritative USD quote and server-side reservation/approval exist.
- Firebase frontend configuration API key is an application identifier, not a private provider secret; provider credentials remain in Secret Manager.

## Current audit limitations

This audit inspects committed source only. It **does not** claim to have scanned Firestore documents, Firebase Authentication user records, Cloud Storage or deployed functions. Exclusive ownership, data-migration completeness and live Sogni authentication remain unverified.
