import type { CharacterState, ContinuityState } from "../core/contracts";

function mergeCharacter(previous: CharacterState, requested: CharacterState): CharacterState {
  return {
    ...previous,
    ...requested,
    wardrobeIds: requested.wardrobeIds ?? previous.wardrobeIds,
    propIds: requested.propIds ?? previous.propIds,
    appearanceNotes: requested.appearanceNotes ?? previous.appearanceNotes,
    handState: { ...(previous.handState ?? {}), ...(requested.handState ?? {}) },
  };
}

export function mergeContinuityState(previous: ContinuityState, requested: ContinuityState): ContinuityState {
  const requestedById = new Map(requested.characters.map((c) => [c.characterId, c]));
  const inherited = previous.characters.map((character) => {
    const next = requestedById.get(character.characterId);
    if (!next) return character;
    requestedById.delete(character.characterId);
    return mergeCharacter(character, next);
  });

  return {
    characters: [...inherited, ...requestedById.values()],
    environment: {
      ...previous.environment,
      ...requested.environment,
      spatialAnchors: { ...previous.environment.spatialAnchors, ...requested.environment.spatialAnchors },
      objectStates: { ...previous.environment.objectStates, ...requested.environment.objectStates },
    },
    camera: requested.camera ? { ...(previous.camera ?? {}), ...requested.camera } : previous.camera,
    notes: [...(previous.notes ?? []), ...(requested.notes ?? [])],
  };
}
