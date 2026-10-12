# F2.3 — Character asset inventory

This phase adds a read-only audit helper for the six canonical reference slots across Mara and Lily. It reports total records, legacy and global records, missing metadata and repeated storage paths.

## Runtime verification still required

The repository does not contain the private Firebase database. The helper and tests do not prove that any specific image exists in production. A signed-in owner must retrieve the actual `creativeAssets` records to run the inventory. Before migrating files, also verify object existence in Firebase Storage and confirm deployed security rules.

## Migration safety gates

1. Export a private backup of Firestore asset metadata.
2. Enumerate every Mara/Lily record and verify its Storage object and checksum.
3. Resolve duplicate records per canonical slot without deleting originals.
4. Copy objects to global character paths, verify copied bytes and download access, then write versioned metadata.
5. Keep original files and legacy metadata until the application reads every reference successfully.
6. Do not perform automated deletion as part of migration.

No production data migration is performed by this pull request.
