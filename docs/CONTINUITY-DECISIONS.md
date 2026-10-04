# Continuity design decisions

## Additional safeguards added in F0.3

### State patches
Shots should express changes, not duplicate the entire world state. Typed patches make transitions explicit and automatically create intentional override records.

### Spatial topology
Natural-language relations such as “behind”, “toward the door”, or “back down the corridor” require stable anchors. Location topology is therefore a first-class Foundation concept rather than prompt prose.

### Continuity locks
Some dimensions may be locked at project, scene, or shot scope. A character identity lock, for example, prevents accidental mutation even when a downstream module attempts an override.

### Intended vs observed state
A generation request produces an intended end state. A Take produces media whose actual/observed state may differ. The two are never assumed equal.

The canonical state for the next shot should be promoted from reviewed observed state, not blindly from requested state.

### Unknown is distinct from match
If an element cannot be verified in a Take, it is marked unknown. Unknown must never silently become match.

### Provenance
State transitions retain why, where, and by what source a change entered continuity. This allows later audit and debugging of a sequence.

### Generation gate
Before provider submission, Model Motion will require:
1. valid continuity resolution;
2. no violated continuity locks;
3. valid spatial references;
4. provider capability compatibility.

This avoids paying for generations that are structurally invalid before inference begins.

### Approval gate
Provider success is not creative approval. A successful Take remains non-canonical until reviewed and explicitly approved.
