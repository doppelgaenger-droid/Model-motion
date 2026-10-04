# Model Motion Foundation v0.1

## 1. Product definition
Model Motion is a provider-agnostic AI video production environment. Its primary problem is not one-shot generation; it is maintaining narrative and visual continuity across a sequence.

Mara and Room 714 are validation fixtures, not core architecture.

## 2. Core principles
1. Provider agnostic — no domain object depends on Veo, Wan, or another vendor.
2. Continuity first — approved state, not model memory, drives the next shot.
3. Human approval gate — only an approved take may advance canonical continuity.
4. Reproducibility — every generation records prompt, provider, model, parameters, references, seed when available, timestamps, cost, and output.
5. Immutable history — rejected takes remain auditable; approval changes canonical state without destroying history.
6. Secrets server-side — provider credentials never reach the browser.
7. Assets by reference — media is stored in object storage; domain records store stable asset IDs/metadata.
8. Explicit state — characters, wardrobe, props, spatial state, camera, environment and dialogue are structured data before they become prompts.

## 3. Canonical hierarchy
Workspace
└── Project
    ├── Characters
    ├── Assets
    ├── Locations
    └── Episodes / Sequences
        └── Scenes
            └── Shots
                └── Takes

A Shot describes intent. A Take is one provider generation attempting that intent.

## 4. Continuity contract
Each shot has:
- inputState: canonical state inherited from the previous approved shot plus explicit overrides.
- intent: action, performance, dialogue, camera and desired end condition.
- endStateTarget: the state that should be true at the cut.
- approvedTakeId: nullable until human approval.
- resolvedEndState: canonical state written only after approval.

Continuity dimensions:
- character identity and appearance
- wardrobe
- props and hand occupancy
- position/orientation
- location and spatial anchors
- doors/objects/environment state
- camera side, axis and framing
- time/lighting/weather
- dialogue/audio state

No provider is trusted to infer these across shots.

## 5. Generation pipeline
Shot intent
→ Continuity resolver
→ Prompt specification
→ Provider adapter
→ Provider job
→ Take + artifacts + cost
→ Human review
→ Approve
→ Canonical resolved end state
→ Next shot

## 6. Provider boundary
A provider adapter implements capability discovery, request validation, generation submission, job polling, normalized outputs, normalized errors, and cost accounting.

The core asks for capabilities (text-to-video, image-to-video, reference images, first/last frame, video extension, audio, seed, etc.) rather than branching on provider names.

## 7. Prompt engine
Prompts are compiled artifacts, not source-of-truth data.

Structured inputs:
- continuity state
- shot intent
- provider capabilities
- project style bible
- safety/provider constraints

Outputs:
- positive prompt
- negative/constraint prompt where supported
- provider parameters
- references
- compilation metadata/version

Manual prompt edits are allowed per Take and must be stored.

## 8. Cost ledger
Every generation records estimated cost before submission and actual/derived cost after completion where possible. Aggregate by take, shot, scene, episode/project, provider/model, and usable second.

## 9. Storage boundaries
Database: metadata and state.
Object storage: images, video, audio, thumbnails.
Server runtime: provider credentials and generation orchestration.
Client: editor/review UI only.

## 10. v0.1 acceptance criteria
Foundation v0.1 is complete when:
- domain contracts compile independently of any provider;
- continuity resolution is deterministic and testable;
- provider interface supports at least Veo and Wan-shaped capability sets without provider-specific fields leaking into domain models;
- prompt compilation consumes structured state;
- a Take can be created, reviewed and approved;
- approval advances canonical state;
- cost records attach to every generation;
- no API secret is client-exposed.

## 11. Explicit non-goals for Foundation
No timeline editor, billing system, multi-user permissions, marketplace, social publishing, or character-specific business logic. These may be added after the generation/continuity loop is validated.
