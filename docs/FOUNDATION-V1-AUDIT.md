# Foundation v1.0 audit

## Scope
Foundation v1.0 is the provider-agnostic application core. It owns contracts, continuity, prompt compilation, provider boundaries, persistence contracts, shared motion/design primitives, and cross-module invariants. It does not own provider SDK implementations, database vendor code, object-storage vendor code, or product-specific characters/projects.

## Gate checklist
- [x] F0.1 Core contract
- [x] F0.2 Architecture boundaries
- [x] F0.3 Continuity engine
- [x] F0.4 Prompt engine
- [x] F0.5 Provider abstraction
- [x] F0.6 Data/storage contracts
- [ ] F0.7 Full test gate green
- [ ] Legacy/dead-code audit
- [ ] Public export audit
- [ ] Foundation v1.0 tag/release

## Required invariants
1. Approved observed state, never intended state alone, becomes canonical continuity.
2. Takes are immutable historical records.
3. Media bytes stay outside metadata storage.
4. Provider credentials never enter client contracts or persisted provenance.
5. Provider/model/compiler identity is reproducible.
6. Paid submission retry requires idempotency.
7. Unsupported provider capabilities fail before submission.
8. Canonical revisions are monotonic and concurrency conflicts are explicit.
9. Consumer modules do not create local infrastructure/CSS/provider branching.
10. Foundation remains free of Mara/Room 714 product fixtures except tests.

## Pre-release debt to inspect
- Legacy src/core/prompt.ts versus Foundation prompt engine.
- ProviderRegistry public export consistency.
- Provider job cancellation/terminal-state consistency.
- Provider job model identity requirement for reproducibility.
- Continuity locks/topology enforcement at the generation gate.
