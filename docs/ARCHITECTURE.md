# Foundation Architecture — F0.2

## Dependency direction

```
Foundation
  ↓
Character
  ↓
Project
  ↓
Scene
  ↓
Shot
  ↓
Take
```

Lower layers may specialize contracts from higher layers. They may not redefine Foundation behavior.

## Foundation-owned concerns
- domain contracts
- continuity semantics
- prompt compilation contracts
- provider capability/adapter contracts
- provider registry
- design tokens and the single global CSS entry point
- UI primitives (when Design Foundation begins)
- motion presets
- persistence/storage contracts
- validation and shared errors

## Consumer-owned concerns
Characters own character-specific canonical data.
Projects own project-specific creative state.
Scenes own scene-specific state.
Shots own generation intent and explicit overrides.
Takes own immutable generation attempts and provenance.

## Character module rule
Each character is a module, not an exception to the system.

Recommended module shape:

```
characters/<character-id>/
  Character.ts       canonical CharacterDefinition
  Character.tsx      optional React editor/view
  references.ts      typed asset references
  index.ts           public exports
```

Character.tsx MUST NOT contain canonical character data that is required by generation or continuity. React is a view/editor layer.

## Styling rule
There is one global CSS entry point: `foundation/design/foundation.css`.

Consumers MUST NOT:
- add global CSS;
- introduce private design tokens;
- redefine common animations;
- patch Foundation primitives locally.

If a consumer needs a reusable visual behavior, Foundation is extended first.

## Motion rule
Common transition timing/easing is Foundation-owned. Consumers select a semantic preset; they do not invent animation systems.

## Provider rule
Provider-specific request/response shapes live behind adapters. Domain, character, project and scene modules never import Veo/Wan SDK types.

## No-patch rule
A local workaround for a missing shared capability is considered architectural debt and must not become the permanent implementation.

## F0.2 boundary
This phase defines architecture only. It deliberately does not define the final visual language, React UI, Mara, Room 714, provider SDK integrations, or persistence implementation.
