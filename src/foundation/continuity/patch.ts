import type { ContinuityState, ID } from "../core/contracts";
import type { ContinuityOverride } from "./types";

export type StatePatch =
  | { op: "character.position"; characterId: ID; value: string; reason: string }
  | { op: "character.orientation"; characterId: ID; value: string; reason: string }
  | { op: "character.wardrobe"; characterId: ID; value: ID[]; reason: string }
  | { op: "character.props"; characterId: ID; value: ID[]; reason: string }
  | { op: "character.hands"; characterId: ID; value: Record<string, string | null>; reason: string }
  | { op: "environment.object"; objectId: string; value: string | number | boolean | null; reason: string }
  | { op: "environment.time"; value: string; reason: string }
  | { op: "environment.lighting"; value: string; reason: string }
  | { op: "environment.weather"; value: string; reason: string };

export interface PatchResult {
  state: ContinuityState;
  overrides: ContinuityOverride[];
}

export function applyStatePatches(base: ContinuityState, patches: StatePatch[]): PatchResult {
  const state: ContinuityState = structuredClone(base);
  const overrides: ContinuityOverride[] = [];

  for (const patch of patches) {
    if (patch.op.startsWith("character.")) {
      const characterId = "characterId" in patch ? patch.characterId : undefined;
      const character = state.characters.find((c) => c.characterId === characterId);
      if (!character || !characterId) throw new Error(`Unknown character: ${characterId ?? "undefined"}`);

      switch (patch.op) {
        case "character.position": character.position = patch.value; break;
        case "character.orientation": character.orientation = patch.value; break;
        case "character.wardrobe": character.wardrobeIds = patch.value; break;
        case "character.props": character.propIds = patch.value; break;
        case "character.hands": character.handState = patch.value; break;
      }
      overrides.push({ dimension: patch.op, characterId, reason: patch.reason, intentional: true });
      continue;
    }

    switch (patch.op) {
      case "environment.object":
        state.environment.objectStates[patch.objectId] = patch.value;
        overrides.push({ dimension: "environment.objects", reason: patch.reason, intentional: true });
        break;
      case "environment.time":
        state.environment.timeOfDay = patch.value;
        overrides.push({ dimension: "environment.time", reason: patch.reason, intentional: true });
        break;
      case "environment.lighting":
        state.environment.lighting = patch.value;
        overrides.push({ dimension: "environment.lighting", reason: patch.reason, intentional: true });
        break;
      case "environment.weather":
        state.environment.weather = patch.value;
        overrides.push({ dimension: "environment.weather", reason: patch.reason, intentional: true });
        break;
    }
  }

  return { state, overrides };
}
