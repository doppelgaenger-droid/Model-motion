import type { ContinuityState, ID } from "../core/contracts";
import type { ContinuityLock } from "./locks";
import type { LocationTopology } from "./topology";
import type { ContinuityIssue, ContinuityResolution } from "./types";
import { hasAnchor } from "./topology";

export interface ContinuityGateContext {
  locks?: ContinuityLock[];
  topology?: LocationTopology;
}

function lockIssues(previous: ContinuityState, next: ContinuityState, locks: ContinuityLock[]): ContinuityIssue[] {
  const issues: ContinuityIssue[] = [];
  for (const lock of locks) {
    if (lock.dimension === "environment.location" && previous.environment.locationId !== next.environment.locationId) {
      issues.push({ code: "LOCKED_DIMENSION", severity: "error", dimension: lock.dimension, message: lock.reason });
    }
    if (lock.dimension === "environment.objects" && JSON.stringify(previous.environment.objectStates) !== JSON.stringify(next.environment.objectStates)) {
      issues.push({ code: "LOCKED_DIMENSION", severity: "error", dimension: lock.dimension, message: lock.reason });
    }
    if (lock.dimension === "character.wardrobe" && lock.characterId) {
      const before = previous.characters.find(c => c.characterId === lock.characterId);
      const after = next.characters.find(c => c.characterId === lock.characterId);
      if (before && after && JSON.stringify(before.wardrobeIds) !== JSON.stringify(after.wardrobeIds)) {
        issues.push({ code: "LOCKED_DIMENSION", severity: "error", dimension: lock.dimension, characterId: lock.characterId, message: lock.reason });
      }
    }
  }
  return issues;
}

function topologyIssues(state: ContinuityState, topology?: LocationTopology): ContinuityIssue[] {
  if (!topology || topology.locationId !== state.environment.locationId) return [];
  const issues: ContinuityIssue[] = [];
  for (const character of state.characters) {
    const anchorId: ID | undefined = character.position;
    if (anchorId && !hasAnchor(topology, anchorId)) {
      issues.push({ code: "UNKNOWN_SPATIAL_ANCHOR", severity: "error", dimension: "character.position", characterId: character.characterId, message: `Unknown spatial anchor: ${anchorId}` });
    }
  }
  return issues;
}

export function applyContinuityGate(previous: ContinuityState, resolution: ContinuityResolution, context: ContinuityGateContext = {}): ContinuityResolution {
  const issues = [
    ...resolution.validation.issues,
    ...lockIssues(previous, resolution.state, context.locks ?? []),
    ...topologyIssues(resolution.state, context.topology),
  ];
  return { state: resolution.state, validation: { valid: !issues.some(issue => issue.severity === "error"), issues } };
}
