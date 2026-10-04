import type { CharacterState, ContinuityState } from "../core/contracts";
import type { ContinuityIssue, ContinuityOverride, ContinuityValidation } from "./types";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const allowed = (overrides: ContinuityOverride[], dimension: ContinuityOverride["dimension"], characterId?: string) =>
  overrides.some((o) => o.dimension === dimension && o.characterId === characterId);

function characterIssues(previous: CharacterState, next: CharacterState, overrides: ContinuityOverride[]): ContinuityIssue[] {
  const checks: Array<[ContinuityOverride["dimension"], unknown, unknown]> = [
    ["character.identity", previous.identityVersion, next.identityVersion],
    ["character.appearance", previous.appearanceNotes, next.appearanceNotes],
    ["character.wardrobe", previous.wardrobeIds, next.wardrobeIds],
    ["character.props", previous.propIds, next.propIds],
    ["character.position", previous.position, next.position],
    ["character.orientation", previous.orientation, next.orientation],
    ["character.hands", previous.handState, next.handState],
  ];
  return checks.filter(([d,a,b]) => !same(a,b) && !allowed(overrides,d,previous.characterId)).map(([dimension]) => ({
    code:"UNDECLARED_CHARACTER_CHANGE", severity:"error" as const, dimension, characterId:previous.characterId,
    message:`Undeclared ${dimension} change for ${previous.characterId}.`
  }));
}

export function validateContinuityTransition(previous: ContinuityState, next: ContinuityState, overrides: ContinuityOverride[]): ContinuityValidation {
  const issues: ContinuityIssue[] = [];
  const nextById = new Map(next.characters.map(c => [c.characterId,c]));
  for (const character of previous.characters) {
    const candidate = nextById.get(character.characterId);
    if (!candidate) {
      issues.push({code:"CHARACTER_DISAPPEARED",severity:"error",dimension:"character.position",characterId:character.characterId,message:`Character ${character.characterId} disappeared without an explicit transition.`});
    } else issues.push(...characterIssues(character,candidate,overrides));
  }
  const checks: Array<[ContinuityOverride["dimension"], unknown, unknown]> = [
    ["environment.location",previous.environment.locationId,next.environment.locationId],
    ["environment.anchors",previous.environment.spatialAnchors,next.environment.spatialAnchors],
    ["environment.objects",previous.environment.objectStates,next.environment.objectStates],
    ["environment.time",previous.environment.timeOfDay,next.environment.timeOfDay],
    ["environment.lighting",previous.environment.lighting,next.environment.lighting],
    ["environment.weather",previous.environment.weather,next.environment.weather],
    ["camera",previous.camera,next.camera],
  ];
  for (const [dimension,a,b] of checks) if (!same(a,b) && !allowed(overrides,dimension)) {
    issues.push({code:"UNDECLARED_STATE_CHANGE",severity:dimension==="camera"?"warning":"error",dimension,message:`Undeclared ${dimension} change.`});
  }
  return {valid:!issues.some(i=>i.severity==="error"),issues};
}
