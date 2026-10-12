# Model Motion · Character / Production separation

## Target model
- **Character**: stable ID, canonical identity, three ordered reference slots, optional wardrobe/appearance variants. A character is independent of productions.
- **Production**: stable ID, title, assigned character IDs, locations, scenes, shots and generations.
- **Scene**: belongs to one production; links to one or more characters and locations, with per-scene overrides.
- **Shot**: belongs to one scene; uses canonical character versions and per-shot continuity state.
- **Asset**: globally owned by character for identity references, or owned by a production/scene/shot for contextual media.

## F1 navigation compatibility
Both existing characters are accessible from the global Character Library regardless of the active legacy project selector. The legacy Lily workspace remains selectable for backward compatibility; Room 714 remains the production with its existing shots.

**Important:** This phase does NOT migrate, duplicate or delete Firebase data. Existing reference uploads still use their legacy project-scoped paths and owner metadata. The 'Global' label describes navigation, not yet storage ownership.

## F2 migration prerequisites
1. Add Firestore `characters/{characterId}` and `productions/{productionId}` records and a versioned link schema; preserve stable character IDs.
2. Add a read adapter that checks global character ownership and falls back to legacy project-scoped records without silently overwriting.
3. Define authorization and Storage rules for character-global paths before enabling writes.
4. Provide dry-run inventory with counts, checksums and collision reporting for existing Mara/Lily assets; preserve originals.
5. Migrate with an explicit per-record ledger and rollback plan; verify all three slots and download URLs for both characters.
6. Only after verification, switch uploads to global character ownership and retire the legacy selector.

## F3 productions
Introduce a production index and creation flow; allow multiple character IDs per production. Keep Room 714's shot data and storyboard intact until moved behind a production-specific adapter.

## Guardrails
- Never infer character ownership from the selected production.
- Never delete existing Firebase objects as part of schema migration.
- Character reference versions are immutable once used by a published take.
- Canonical identity is inherited; wardrobe and setting are scene/shot overrides.
